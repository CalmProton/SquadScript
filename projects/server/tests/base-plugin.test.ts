/**
 * @squadscript/server
 *
 * Unit tests for BasePlugin.
 */

import { describe, expect, it, beforeEach, afterEach, mock } from 'bun:test';
import { BasePlugin, type SquadPluginContext } from '../src/plugins/base-plugin';
import type { PluginMeta, OptionsSpecification, ResolvedOptions, PluginEventEmitter, Unsubscribe } from '@squadscript/types/plugin';
import type { SquadEventMap } from '@squadscript/types';

// Create mock context
function createMockContext(): SquadPluginContext {
  const subscriptions = new Map<string, Set<Function>>();

  return {
    events: {
      on: <K extends keyof SquadEventMap & string>(
        event: K,
        handler: (data: SquadEventMap[K]) => void | Promise<void>,
      ): Unsubscribe => {
        if (!subscriptions.has(event)) {
          subscriptions.set(event, new Set());
        }
        subscriptions.get(event)!.add(handler);
        return () => {
          subscriptions.get(event)?.delete(handler);
        };
      },
      once: <K extends keyof SquadEventMap & string>(
        event: K,
        handler: (data: SquadEventMap[K]) => void | Promise<void>,
      ): Unsubscribe => {
        const wrappedHandler = (data: SquadEventMap[K]) => {
          subscriptions.get(event)?.delete(wrappedHandler);
          return handler(data);
        };
        if (!subscriptions.has(event)) {
          subscriptions.set(event, new Set());
        }
        subscriptions.get(event)!.add(wrappedHandler);
        return () => {
          subscriptions.get(event)?.delete(wrappedHandler);
        };
      },
      waitFor: <K extends keyof SquadEventMap & string>(
        event: K,
        options?: { signal?: AbortSignal; timeout?: number },
      ): Promise<SquadEventMap[K]> => {
        return new Promise((resolve, reject) => {
          const timeout = options?.timeout;
          if (timeout) {
            setTimeout(() => reject(new Error('Timeout')), timeout);
          }
        });
      },
    } as PluginEventEmitter<SquadEventMap>,
    rcon: {
      execute: mock(async () => ''),
      broadcast: mock(async () => {}),
      warn: mock(async () => {}),
      kick: mock(async () => {}),
      ban: mock(async () => {}),
    },
    state: {
      players: new Map(),
      squads: new Map(),
      currentLayer: null,
      nextLayer: null,
      playerCount: 0,
      getPlayerByEOSID: () => undefined,
      getPlayerBySteamID: () => undefined,
      getPlayerByID: () => undefined,
      getPlayersByName: () => [],
      getSquadsByTeam: () => [],
    },
    log: {
      trace: mock(() => {}),
      debug: mock(() => {}),
      verbose: mock(() => {}),
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
    },
    getConnector: <T>() => undefined as T | undefined,
  };
}

// Test plugin implementation
const testOptionsSpec = {
  message: { type: 'string', required: true, description: 'Message' },
  interval: { type: 'number', required: false, default: 1000, description: 'Interval' },
} as const satisfies OptionsSpecification;

class TestPlugin extends BasePlugin<typeof testOptionsSpec> {
  static readonly meta: PluginMeta = {
    name: 'TestPlugin',
    description: 'A test plugin',
    version: '1.0.0',
    defaultEnabled: true,
  };

  static readonly optionsSpec = testOptionsSpec;

  public mountCalled = false;
  public unmountCalled = false;
  public prepareToMountCalled = false;

  async prepareToMount(): Promise<void> {
    this.prepareToMountCalled = true;
  }

  async mount(): Promise<void> {
    this.mountCalled = true;
  }

  async unmount(): Promise<void> {
    this.unmountCalled = true;
    await super.unmount();
  }

  // Expose protected methods for testing
  public testOn<K extends keyof SquadEventMap & string>(
    event: K,
    handler: (data: SquadEventMap[K]) => void | Promise<void>,
  ): Unsubscribe {
    return this.on(event, handler);
  }

  public testSetInterval(callback: () => void, ms: number, label?: string): () => void {
    return this.setInterval(callback, ms, label);
  }

  public testSetTimeout(callback: () => void, ms: number, label?: string): () => void {
    return this.setTimeout(callback, ms, label);
  }
}

describe('BasePlugin', () => {
  let context: SquadPluginContext;
  let plugin: TestPlugin;
  const defaultOptions = { message: 'Hello', interval: 1000 };

  beforeEach(() => {
    context = createMockContext();
    plugin = new TestPlugin(context, defaultOptions as ResolvedOptions<typeof testOptionsSpec>);
  });

  afterEach(async () => {
    // Clean up any active resources
    if (plugin.isRunning) {
      await plugin.unmount();
    }
  });

  describe('construction', () => {
    it('should initialize with unloaded state', () => {
      expect(plugin.state).toBe('unloaded');
      expect(plugin.isRunning).toBe(false);
    });

    it('should store options', () => {
      expect(plugin['options'].message).toBe('Hello');
      expect(plugin['options'].interval).toBe(1000);
    });

    it('should provide access to context components', () => {
      expect(plugin['events']).toBe(context.events);
      expect(plugin['rcon']).toBe(context.rcon);
      expect(plugin['server']).toBe(context.state);
      expect(plugin['log']).toBe(context.log);
    });
  });

  describe('lifecycle', () => {
    it('should call prepareToMount', async () => {
      await plugin.prepareToMount();
      expect(plugin.prepareToMountCalled).toBe(true);
    });

    it('should call mount', async () => {
      await plugin.mount();
      expect(plugin.mountCalled).toBe(true);
    });

    it('should call unmount', async () => {
      await plugin.unmount();
      expect(plugin.unmountCalled).toBe(true);
    });
  });

  describe('state management', () => {
    it('should update state via _setState', () => {
      plugin._setState('mounted');
      expect(plugin.state).toBe('mounted');
      expect(plugin.isRunning).toBe(true);
    });

    it('should track error', () => {
      const error = new Error('Test error');
      plugin._setState('error', error);

      expect(plugin.state).toBe('error');
      expect(plugin.error).toBe(error);
    });
  });

  describe('event subscriptions', () => {
    it('should track subscriptions', () => {
      expect(plugin.activeSubscriptionCount).toBe(0);

      plugin.testOn('CHAT_MESSAGE', () => {});

      expect(plugin.activeSubscriptionCount).toBe(1);
    });

    it('should unsubscribe when returned function called', () => {
      const unsubscribe = plugin.testOn('CHAT_MESSAGE', () => {});
      expect(plugin.activeSubscriptionCount).toBe(1);

      unsubscribe();

      expect(plugin.activeSubscriptionCount).toBe(0);
    });

    it('should cleanup subscriptions on unmount', async () => {
      plugin.testOn('CHAT_MESSAGE', () => {});
      plugin.testOn('PLAYER_CONNECTED', () => {});

      expect(plugin.activeSubscriptionCount).toBe(2);

      await plugin.unmount();

      expect(plugin.activeSubscriptionCount).toBe(0);
    });
  });

  describe('interval tracking', () => {
    it('should track intervals', () => {
      expect(plugin.activeIntervalCount).toBe(0);

      plugin.testSetInterval(() => {}, 1000, 'test');

      expect(plugin.activeIntervalCount).toBe(1);
    });

    it('should clear interval when returned function called', () => {
      const clear = plugin.testSetInterval(() => {}, 1000);
      expect(plugin.activeIntervalCount).toBe(1);

      clear();

      expect(plugin.activeIntervalCount).toBe(0);
    });

    it('should cleanup intervals on unmount', async () => {
      plugin.testSetInterval(() => {}, 1000);
      plugin.testSetInterval(() => {}, 2000);

      expect(plugin.activeIntervalCount).toBe(2);

      await plugin.unmount();

      expect(plugin.activeIntervalCount).toBe(0);
    });
  });

  describe('timeout tracking', () => {
    it('should track timeouts', () => {
      expect(plugin.activeTimeoutCount).toBe(0);

      plugin.testSetTimeout(() => {}, 1000, 'test');

      expect(plugin.activeTimeoutCount).toBe(1);
    });

    it('should clear timeout when returned function called', () => {
      const clear = plugin.testSetTimeout(() => {}, 1000);
      expect(plugin.activeTimeoutCount).toBe(1);

      clear();

      expect(plugin.activeTimeoutCount).toBe(0);
    });

    it('should cleanup timeouts on unmount', async () => {
      plugin.testSetTimeout(() => {}, 10000);
      plugin.testSetTimeout(() => {}, 20000);

      expect(plugin.activeTimeoutCount).toBe(2);

      await plugin.unmount();

      expect(plugin.activeTimeoutCount).toBe(0);
    });
  });

  describe('total resource count', () => {
    it('should count all resources', () => {
      plugin.testOn('CHAT_MESSAGE', () => {});
      plugin.testSetInterval(() => {}, 1000);
      plugin.testSetTimeout(() => {}, 1000);

      expect(plugin.activeResourceCount).toBe(3);
      expect(plugin.activeSubscriptionCount).toBe(1);
      expect(plugin.activeIntervalCount).toBe(1);
      expect(plugin.activeTimeoutCount).toBe(1);
    });
  });

  describe('logging', () => {
    it('should log via context logger', () => {
      plugin['log'].info('Test message');

      expect(context.log.info).toHaveBeenCalledWith('Test message');
    });
  });

  describe('connectors', () => {
    it('should get connector from context', () => {
      const mockConnector = { name: 'test', isConnected: true };
      const contextWithConnector = {
        ...context,
        getConnector: <T>(name: string) => (name === 'test' ? mockConnector as T : undefined),
      };

      const pluginWithConnector = new TestPlugin(
        contextWithConnector,
        defaultOptions as ResolvedOptions<typeof testOptionsSpec>,
      );

      expect(pluginWithConnector['getConnector']('test')).toBe(mockConnector);
      expect(pluginWithConnector['getConnector']('missing')).toBeUndefined();
    });
  });
});

describe('BasePlugin static properties', () => {
  it('should have required static meta', () => {
    expect(TestPlugin.meta.name).toBe('TestPlugin');
    expect(TestPlugin.meta.description).toBe('A test plugin');
    expect(TestPlugin.meta.version).toBe('1.0.0');
    expect(TestPlugin.meta.defaultEnabled).toBe(true);
  });

  it('should have static optionsSpec', () => {
    expect(TestPlugin.optionsSpec).toEqual(testOptionsSpec);
  });
});
