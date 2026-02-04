/**
 * @squadscript/server
 *
 * Unit tests for PluginManager.
 */

import { describe, expect, it, beforeEach, mock } from 'bun:test';
import { PluginManager, type PluginServerInterface } from '../src/plugins/manager';
import { BasePlugin } from '../src/plugins/base-plugin';
import type { PluginMeta, OptionsSpec, PluginContext } from '@squadscript/types';
import type { SquadEventMap } from '@squadscript/types';

// Create mock logger
function createMockLogger() {
  const mockLog = {
    trace: mock(() => {}),
    debug: mock(() => {}),
    verbose: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    log: mock(() => {}),
    isEnabled: mock(() => true),
    child: mock(function(this: typeof mockLog, _name: string) { return mockLog; }),
  };
  return mockLog;
}

// Create mock server
function createMockServer(): PluginServerInterface {
  const handlers = new Map<string, Set<Function>>();

  return {
    events: {
      on: mock(<K extends keyof SquadEventMap & string>(event: K, handler: (data: SquadEventMap[K]) => void) => {
        if (!handlers.has(event)) {
          handlers.set(event, new Set());
        }
        handlers.get(event)!.add(handler);
      }),
      once: mock(<K extends keyof SquadEventMap & string>(event: K, handler: (data: SquadEventMap[K]) => void) => {
        const wrappedHandler = (data: SquadEventMap[K]) => {
          handler(data);
          handlers.get(event)?.delete(wrappedHandler);
        };
        if (!handlers.has(event)) {
          handlers.set(event, new Set());
        }
        handlers.get(event)!.add(wrappedHandler);
      }),
      off: mock(<K extends keyof SquadEventMap & string>(event: K, handler: (data: SquadEventMap[K]) => void) => {
        handlers.get(event)?.delete(handler);
      }),
      waitFor: mock(() => Promise.resolve({} as any)),
    },
    rcon: {
      execute: mock(() => Promise.resolve({ ok: true, value: '' })),
      broadcast: mock(() => Promise.resolve({ ok: true, value: undefined })),
      warn: mock(() => Promise.resolve({ ok: true, value: undefined })),
    },
    state: {
      getPlayers: mock(() => []),
      getSquads: mock(() => []),
      getTeams: mock(() => []),
      getServerInfo: mock(() => ({ name: 'Test', currentMap: 'Test', playerCount: 0 })),
      getPlayer: mock(() => undefined),
    },
  };
}

// Test plugin implementations
class SimplePlugin extends BasePlugin<OptionsSpec> {
  static override readonly meta: PluginMeta = {
    name: 'SimplePlugin',
    description: 'A simple test plugin',
    version: '1.0.0',
    defaultEnabled: true,
  };

  static override readonly optionsSpec = {};

  mountCalled = false;
  unmountCalled = false;

  override async mount(): Promise<void> {
    this.mountCalled = true;
  }

  override async unmount(): Promise<void> {
    this.unmountCalled = true;
  }
}

class PluginWithDependency extends BasePlugin<OptionsSpec> {
  static override readonly meta: PluginMeta = {
    name: 'PluginWithDependency',
    description: 'A plugin with dependencies',
    version: '1.0.0',
    defaultEnabled: true,
    dependencies: ['SimplePlugin'],
  };

  static override readonly optionsSpec = {};

  override async mount(): Promise<void> {
    // Plugin with dependency mounted
  }
}

class PluginWithOptions extends BasePlugin<{
  message: { type: 'string'; required: true };
  count: { type: 'number'; default: 10 };
}> {
  static override readonly meta: PluginMeta = {
    name: 'PluginWithOptions',
    description: 'A plugin with options',
    version: '1.0.0',
    defaultEnabled: true,
  };

  static override readonly optionsSpec = {
    message: { type: 'string' as const, required: true as const },
    count: { type: 'number' as const, default: 10 },
  };

  override async mount(): Promise<void> {
    // Plugin with options mounted
  }
}

class CircularA extends BasePlugin<OptionsSpec> {
  static override readonly meta: PluginMeta = {
    name: 'CircularA',
    description: 'Circular dependency test A',
    version: '1.0.0',
    defaultEnabled: true,
    dependencies: ['CircularB'],
  };

  static override readonly optionsSpec = {};

  override async mount(): Promise<void> {
    // Circular A mounted
  }
}

class CircularB extends BasePlugin<OptionsSpec> {
  static override readonly meta: PluginMeta = {
    name: 'CircularB',
    description: 'Circular dependency test B',
    version: '1.0.0',
    defaultEnabled: true,
    dependencies: ['CircularA'],
  };

  static override readonly optionsSpec = {};

  override async mount(): Promise<void> {
    // Circular B mounted
  }
}

class FailingPlugin extends BasePlugin<OptionsSpec> {
  static override readonly meta: PluginMeta = {
    name: 'FailingPlugin',
    description: 'A plugin that fails to mount',
    version: '1.0.0',
    defaultEnabled: true,
  };

  static override readonly optionsSpec = {};

  override async mount(): Promise<void> {
    throw new Error('Plugin failed to mount');
  }
}

describe('PluginManager', () => {
  let manager: PluginManager;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockServer: PluginServerInterface;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockServer = createMockServer();
  });

  describe('loadAll and mountAll', () => {
    it('should load and mount plugin from config', async () => {
      manager = new PluginManager({
        logger: mockLogger as any,
        server: mockServer,
        plugins: [
          { plugin: SimplePlugin as any, enabled: true },
        ],
      });

      const loaded = await manager.loadAll();
      expect(loaded).toBe(1);

      const result = await manager.mountAll();
      expect(result.mounted).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should skip disabled plugins', async () => {
      manager = new PluginManager({
        logger: mockLogger as any,
        server: mockServer,
        plugins: [
          { plugin: SimplePlugin as any, enabled: false },
        ],
      });

      const loaded = await manager.loadAll();
      expect(loaded).toBe(0);
    });

    it('should validate options during mount', async () => {
      manager = new PluginManager({
        logger: mockLogger as any,
        server: mockServer,
        plugins: [
          { plugin: PluginWithOptions as any, enabled: true, options: {} },
        ],
      });

      await manager.loadAll();
      const result = await manager.mountAll();

      // Should fail due to missing required 'message'
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should mount with valid options', async () => {
      manager = new PluginManager({
        logger: mockLogger as any,
        server: mockServer,
        plugins: [
          { plugin: PluginWithOptions as any, enabled: true, options: { message: 'Hello' } },
        ],
      });

      await manager.loadAll();
      const result = await manager.mountAll();

      expect(result.mounted).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should mount plugins in dependency order', async () => {
      const mountOrder: string[] = [];

      class OrderA extends BasePlugin<OptionsSpec> {
        static override readonly meta: PluginMeta = {
          name: 'OrderA',
          description: 'Order test plugin A',
          version: '1.0.0',
          defaultEnabled: true,
        };

        static override readonly optionsSpec = {};

        override async mount(): Promise<void> {
          mountOrder.push('A');
        }
      }

      class OrderB extends BasePlugin<OptionsSpec> {
        static override readonly meta: PluginMeta = {
          name: 'OrderB',
          description: 'Order test plugin B',
          version: '1.0.0',
          defaultEnabled: true,
          dependencies: ['OrderA'],
        };

        static override readonly optionsSpec = {};

        override async mount(): Promise<void> {
          mountOrder.push('B');
        }
      }

      // Register B before A to test ordering
      manager = new PluginManager({
        logger: mockLogger as any,
        server: mockServer,
        plugins: [
          { plugin: OrderB as any, enabled: true },
          { plugin: OrderA as any, enabled: true },
        ],
      });

      await manager.loadAll();
      await manager.mountAll();

      expect(mountOrder).toEqual(['A', 'B']);
    });

    it('should detect circular dependencies', async () => {
      manager = new PluginManager({
        logger: mockLogger as any,
        server: mockServer,
        plugins: [
          { plugin: CircularA as any, enabled: true },
          { plugin: CircularB as any, enabled: true },
        ],
      });

      await manager.loadAll();
      const result = await manager.mountAll();

      // Both should fail due to circular dependency
      expect(result.mounted).toBe(0);
    });

    it('should continue after plugin failure', async () => {
      manager = new PluginManager({
        logger: mockLogger as any,
        server: mockServer,
        plugins: [
          { plugin: FailingPlugin as any, enabled: true },
          { plugin: SimplePlugin as any, enabled: true },
        ],
      });

      await manager.loadAll();
      const result = await manager.mountAll();

      expect(result.mounted).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('unmountAll', () => {
    it('should unmount all plugins', async () => {
      manager = new PluginManager({
        logger: mockLogger as any,
        server: mockServer,
        plugins: [
          { plugin: SimplePlugin as any, enabled: true },
        ],
      });

      await manager.loadAll();
      await manager.mountAll();

      expect(manager.getRunningPlugins().length).toBe(1);

      await manager.unmountAll();

      expect(manager.getRunningPlugins().length).toBe(0);
    });

    it('should unmount in reverse dependency order', async () => {
      const unmountOrder: string[] = [];

      class UnmountA extends BasePlugin<OptionsSpec> {
        static override readonly meta: PluginMeta = {
          name: 'UnmountA',
          description: 'Unmount test plugin A',
          version: '1.0.0',
          defaultEnabled: true,
        };

        static override readonly optionsSpec = {};

        override async mount(): Promise<void> {
          // Mounted
        }

        override async unmount(): Promise<void> {
          unmountOrder.push('A');
        }
      }

      class UnmountB extends BasePlugin<OptionsSpec> {
        static override readonly meta: PluginMeta = {
          name: 'UnmountB',
          description: 'Unmount test plugin B',
          version: '1.0.0',
          defaultEnabled: true,
          dependencies: ['UnmountA'],
        };

        static override readonly optionsSpec = {};

        override async mount(): Promise<void> {
          // Mounted
        }

        override async unmount(): Promise<void> {
          unmountOrder.push('B');
        }
      }

      manager = new PluginManager({
        logger: mockLogger as any,
        server: mockServer,
        plugins: [
          { plugin: UnmountA as any, enabled: true },
          { plugin: UnmountB as any, enabled: true },
        ],
      });

      await manager.loadAll();
      await manager.mountAll();
      await manager.unmountAll();

      // B depends on A, so B should unmount first
      expect(unmountOrder).toEqual(['B', 'A']);
    });
  });

  describe('getPlugin', () => {
    it('should return plugin instance after mount', async () => {
      manager = new PluginManager({
        logger: mockLogger as any,
        server: mockServer,
        plugins: [
          { plugin: SimplePlugin as any, enabled: true },
        ],
      });

      await manager.loadAll();
      await manager.mountAll();

      const instance = manager.getPlugin('SimplePlugin');
      expect(instance).toBeDefined();
      expect(instance!.state).toBe('mounted');
    });

    it('should return undefined for unknown plugin', async () => {
      manager = new PluginManager({
        logger: mockLogger as any,
        server: mockServer,
        plugins: [],
      });

      const instance = manager.getPlugin('Unknown');
      expect(instance).toBeUndefined();
    });
  });

  describe('getRunningPlugins', () => {
    it('should return only mounted plugins', async () => {
      manager = new PluginManager({
        logger: mockLogger as any,
        server: mockServer,
        plugins: [
          { plugin: SimplePlugin as any, enabled: true },
          { plugin: PluginWithOptions as any, enabled: true, options: { message: 'test' } },
        ],
      });

      await manager.loadAll();
      await manager.mountAll();

      const running = manager.getRunningPlugins();
      expect(running.length).toBe(2);
      expect(running).toContain('SimplePlugin');
      expect(running).toContain('PluginWithOptions');
    });
  });

  describe('isPluginRunning', () => {
    it('should return true for running plugin', async () => {
      manager = new PluginManager({
        logger: mockLogger as any,
        server: mockServer,
        plugins: [
          { plugin: SimplePlugin as any, enabled: true },
        ],
      });

      await manager.loadAll();
      await manager.mountAll();

      expect(manager.isPluginRunning('SimplePlugin')).toBe(true);
    });

    it('should return false for non-running plugin', async () => {
      manager = new PluginManager({
        logger: mockLogger as any,
        server: mockServer,
        plugins: [
          { plugin: SimplePlugin as any, enabled: true },
        ],
      });

      await manager.loadAll();
      // Not mounted yet

      expect(manager.isPluginRunning('SimplePlugin')).toBe(false);
    });
  });

  describe('dispose', () => {
    it('should unmount all and cleanup', async () => {
      manager = new PluginManager({
        logger: mockLogger as any,
        server: mockServer,
        plugins: [
          { plugin: SimplePlugin as any, enabled: true },
        ],
      });

      await manager.loadAll();
      await manager.mountAll();

      await manager.dispose();

      expect(manager.getRunningPlugins().length).toBe(0);
      expect(manager.getLoadedPlugins().length).toBe(0);
    });
  });
});
