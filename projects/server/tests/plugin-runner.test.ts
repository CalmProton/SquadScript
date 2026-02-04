/**
 * @squadscript/server
 *
 * Unit tests for PluginRunner.
 */

import { describe, expect, it, beforeEach, mock } from 'bun:test';
import { PluginRunner, type PluginInstance } from '../src/plugins/runner';
import { BasePlugin } from '../src/plugins/base-plugin';
import { PluginErrorHandler, PluginError, PluginErrorType } from '../src/plugins/error-handler';
import type { PluginContext, PluginMeta, OptionsSpec } from '@squadscript/types';
import type { LoadedPlugin } from '../src/plugins/loader';

// Create mock logger
function createMockLogger() {
  return {
    trace: mock(() => {}),
    debug: mock(() => {}),
    verbose: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    log: mock(() => {}),
    isEnabled: mock(() => true),
    child: mock(function(this: ReturnType<typeof createMockLogger>) { return this; }),
  };
}

// Create mock context
function createMockContext(meta: PluginMeta): PluginContext {
  const mockLogger = createMockLogger();
  return {
    logger: mockLogger as any,
    events: {
      on: mock(() => mock(() => {})),
      once: mock(() => mock(() => {})),
      waitFor: mock(() => Promise.resolve({} as any)),
    },
    rcon: {
      execute: mock(() => Promise.resolve({ ok: true, value: '' } as any)),
      broadcast: mock(() => Promise.resolve({ ok: true, value: undefined } as any)),
      warn: mock(() => Promise.resolve({ ok: true, value: undefined } as any)),
    },
    state: {
      getPlayers: mock(() => []),
      getSquads: mock(() => []),
      getTeams: mock(() => []),
      getServerInfo: mock(() => ({ name: 'Test', currentMap: 'Test', playerCount: 0 } as any)),
      getPlayer: mock(() => undefined),
    },
    connectors: {
      get: mock(() => Promise.resolve(undefined)),
      getSync: mock(() => undefined),
      has: mock(() => false),
    },
    options: {},
    meta,
  };
}

// Test plugin implementations
class SuccessPlugin extends BasePlugin<OptionsSpec> {
  static override readonly meta: PluginMeta = {
    name: 'SuccessPlugin',
    description: 'A successful test plugin',
    version: '1.0.0',
    defaultEnabled: true,
  };

  mountCalled = false;
  unmountCalled = false;
  prepareToMountCalled = false;

  override async prepareToMount(): Promise<void> {
    this.prepareToMountCalled = true;
  }

  override async mount(): Promise<void> {
    this.mountCalled = true;
  }

  override async unmount(): Promise<void> {
    this.unmountCalled = true;
  }
}

class FailingMountPlugin extends BasePlugin<OptionsSpec> {
  static override readonly meta: PluginMeta = {
    name: 'FailingMountPlugin',
    description: 'A plugin that fails during mount',
    version: '1.0.0',
    defaultEnabled: true,
  };

  override async mount(): Promise<void> {
    throw new Error('Mount failed');
  }
}

class SlowPlugin extends BasePlugin<OptionsSpec> {
  static override readonly meta: PluginMeta = {
    name: 'SlowPlugin',
    description: 'A slow test plugin',
    version: '1.0.0',
    defaultEnabled: true,
  };

  override async mount(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

class FailingUnmountPlugin extends BasePlugin<OptionsSpec> {
  static override readonly meta: PluginMeta = {
    name: 'FailingUnmountPlugin',
    description: 'A plugin that fails during unmount',
    version: '1.0.0',
    defaultEnabled: true,
  };

  override async mount(): Promise<void> {
    // Successfully mounts
  }

  override async unmount(): Promise<void> {
    throw new Error('Unmount failed');
  }
}

// Helper to create a LoadedPlugin
function createLoadedPlugin(PluginClass: typeof BasePlugin): LoadedPlugin {
  return {
    Class: PluginClass as any,
    meta: (PluginClass as any).meta,
    optionsSpec: (PluginClass as any).optionsSpec ?? {},
    source: 'test',
  };
}

// Helper to create a PluginInstance using the runner
function createInstance(
  runner: PluginRunner,
  PluginClass: typeof BasePlugin,
): PluginInstance {
  const loadedPlugin = createLoadedPlugin(PluginClass);
  const context = createMockContext(loadedPlugin.meta);
  return runner.create(loadedPlugin, context, {});
}

describe('PluginRunner', () => {
  let runner: PluginRunner;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let errorHandler: PluginErrorHandler;

  beforeEach(() => {
    mockLogger = createMockLogger();
    errorHandler = new PluginErrorHandler({ logger: mockLogger as any });
    runner = new PluginRunner({
      logger: mockLogger as any,
      errorHandler,
      mountTimeout: 1000,
      unmountTimeout: 1000,
    });
  });

  describe('create', () => {
    it('should create plugin instance', () => {
      const instance = createInstance(runner, SuccessPlugin);

      expect(instance.plugin).toBeInstanceOf(SuccessPlugin);
      expect(instance.state).toBe('unloaded');
      expect(instance.loadedPlugin.meta.name).toBe('SuccessPlugin');
    });
  });

  describe('mount', () => {
    it('should mount plugin successfully', async () => {
      const instance = createInstance(runner, SuccessPlugin);

      const result = await runner.mount(instance);

      expect(result.success).toBe(true);
      expect((instance.plugin as SuccessPlugin).mountCalled).toBe(true);
      expect(instance.state).toBe('mounted');
    });

    it('should call prepareToMount before mount', async () => {
      const instance = createInstance(runner, SuccessPlugin);
      const plugin = instance.plugin as SuccessPlugin;
      const order: string[] = [];

      const origPrepare = plugin.prepareToMount.bind(plugin);
      const origMount = plugin.mount.bind(plugin);

      plugin.prepareToMount = async () => {
        order.push('prepare');
        await origPrepare();
      };
      plugin.mount = async () => {
        order.push('mount');
        await origMount();
      };

      await runner.mount(instance);

      expect(order).toEqual(['prepare', 'mount']);
    });

    it('should handle mount errors', async () => {
      const instance = createInstance(runner, FailingMountPlugin);

      const result = await runner.mount(instance);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('Error during mount');
      expect(instance.state).toBe('error');
    });

    it('should timeout slow mount', async () => {
      const fastRunner = new PluginRunner({
        logger: mockLogger as any,
        errorHandler,
        mountTimeout: 50,
        unmountTimeout: 50,
      });

      const instance = createInstance(fastRunner, SlowPlugin);

      const result = await fastRunner.mount(instance);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('Error during mount');
    });

    it('should not mount already mounted plugin', async () => {
      const instance = createInstance(runner, SuccessPlugin);

      await runner.mount(instance);
      const result = await runner.mount(instance);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('Cannot mount plugin in state');
    });
  });

  describe('unmount', () => {
    it('should unmount plugin successfully', async () => {
      const instance = createInstance(runner, SuccessPlugin);

      await runner.mount(instance);
      const result = await runner.unmount(instance);

      expect(result.success).toBe(true);
      expect((instance.plugin as SuccessPlugin).unmountCalled).toBe(true);
      expect(instance.state).toBe('unloaded');
    });

    it('should handle unmount errors but still complete', async () => {
      const instance = createInstance(runner, FailingUnmountPlugin);

      await runner.mount(instance);
      const result = await runner.unmount(instance);

      // Note: unmount errors are logged but don't fail the operation
      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('Error during unmount');
      // State is still set to unloaded
      expect(instance.state).toBe('unloaded');
    });

    it('should not unmount plugin that is not mounted', async () => {
      const instance = createInstance(runner, SuccessPlugin);

      const result = await runner.unmount(instance);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('Cannot unmount plugin in state');
    });
  });

  describe('prepare', () => {
    it('should prepare plugin successfully', async () => {
      const instance = createInstance(runner, SuccessPlugin);

      const result = await runner.prepare(instance);

      expect(result.success).toBe(true);
      expect((instance.plugin as SuccessPlugin).prepareToMountCalled).toBe(true);
    });

    it('should not prepare already prepared plugin', async () => {
      const instance = createInstance(runner, SuccessPlugin);

      await runner.prepare(instance);
      const result = await runner.prepare(instance);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('Cannot prepare plugin in state');
    });
  });

  describe('circuit breaker integration', () => {
    it('should track errors in error handler', async () => {
      const instance = createInstance(runner, FailingMountPlugin);

      await runner.mount(instance);

      // Circuit should still be closed (allows plugins through) after 1 error
      expect(errorHandler.isPluginAllowed('FailingMountPlugin')).toBe(true);

      // Record more errors to trip circuit (threshold is 5)
      for (let i = 0; i < 5; i++) {
        errorHandler.handleError(
          new PluginError('FailingMountPlugin', 'Test error', PluginErrorType.LIFECYCLE),
        );
      }

      // Now the circuit should be open (plugin not allowed)
      expect(errorHandler.isPluginAllowed('FailingMountPlugin')).toBe(false);
    });
  });
});
