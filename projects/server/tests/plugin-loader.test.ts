/**
 * @squadscript/server
 *
 * Unit tests for PluginLoader.
 */

import { describe, expect, it, beforeEach, mock } from 'bun:test';
import { PluginLoader, PluginLoadError, type PluginClass } from '../src/plugins/loader';
import { BasePlugin } from '../src/plugins/base-plugin';
import type { PluginMeta, OptionsSpecification, ResolvedOptions } from '@squadscript/types/plugin';
import type { SquadPluginContext } from '../src/plugins/base-plugin';

// Create a mock logger
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

// Valid test plugin
class ValidPlugin extends BasePlugin {
  static readonly meta: PluginMeta = {
    name: 'ValidPlugin',
    description: 'A valid test plugin',
    version: '1.0.0',
    defaultEnabled: true,
  };

  static readonly optionsSpec: OptionsSpecification = {};

  async mount(): Promise<void> {
    // No-op
  }
}

// Plugin with dependencies
class DependentPlugin extends BasePlugin {
  static readonly meta: PluginMeta = {
    name: 'DependentPlugin',
    description: 'Plugin with dependencies',
    version: '1.0.0',
    defaultEnabled: true,
    dependencies: ['ValidPlugin'],
  };

  static readonly optionsSpec: OptionsSpecification = {};

  async mount(): Promise<void> {
    // No-op
  }
}

// Plugin with options
const testOptionsSpec = {
  message: { type: 'string', required: true, description: 'Message' },
  count: { type: 'number', required: false, default: 5, description: 'Count' },
} as const satisfies OptionsSpecification;

class PluginWithOptions extends BasePlugin<typeof testOptionsSpec> {
  static readonly meta: PluginMeta = {
    name: 'PluginWithOptions',
    description: 'Plugin with options',
    version: '1.0.0',
    defaultEnabled: false,
    author: 'Test Author',
    url: 'https://example.com',
  };

  static readonly optionsSpec = testOptionsSpec;

  async mount(): Promise<void> {
    // Access options to verify typing
    const msg = this.options.message;
    const cnt = this.options.count;
  }
}

describe('PluginLoader', () => {
  let loader: PluginLoader;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    loader = new PluginLoader({ logger: mockLogger as any });
  });

  describe('loadClass', () => {
    it('should load a valid plugin class', () => {
      const result = loader.loadClass(ValidPlugin);

      expect(result.Class).toBe(ValidPlugin);
      expect(result.meta).toBe(ValidPlugin.meta);
      expect(result.optionsSpec).toBe(ValidPlugin.optionsSpec);
      expect(result.source).toBe('direct');
    });

    it('should load plugin with custom source', () => {
      const result = loader.loadClass(ValidPlugin, './my-plugin.ts');

      expect(result.source).toBe('./my-plugin.ts');
    });

    it('should reject non-function', () => {
      expect(() => {
        loader.loadClass('not a class' as any);
      }).toThrow(PluginLoadError);
    });

    it('should reject class without meta', () => {
      class NoMeta extends BasePlugin {
        static readonly optionsSpec = {};
        async mount() {}
      }

      expect(() => {
        loader.loadClass(NoMeta);
      }).toThrow(PluginLoadError);
    });

    it('should reject class with invalid meta.name', () => {
      class BadMeta extends BasePlugin {
        static readonly meta = {
          name: '', // Empty name
          description: 'Test',
          version: '1.0.0',
          defaultEnabled: true,
        };
        static readonly optionsSpec = {};
        async mount() {}
      }

      expect(() => {
        loader.loadClass(BadMeta);
      }).toThrow(PluginLoadError);
    });

    it('should reject class without optionsSpec', () => {
      class NoOptions extends BasePlugin {
        static readonly meta = {
          name: 'NoOptions',
          description: 'Test',
          version: '1.0.0',
          defaultEnabled: true,
        };
        // Missing optionsSpec
        async mount() {}
      }

      expect(() => {
        loader.loadClass(NoOptions);
      }).toThrow(PluginLoadError);
    });

    it('should accept plugin with dependencies', () => {
      const result = loader.loadClass(DependentPlugin);

      expect(result.meta.dependencies).toEqual(['ValidPlugin']);
    });

    it('should accept plugin with full metadata', () => {
      const result = loader.loadClass(PluginWithOptions);

      expect(result.meta.author).toBe('Test Author');
      expect(result.meta.url).toBe('https://example.com');
      expect(result.meta.defaultEnabled).toBe(false);
    });
  });

  describe('load with custom resolver', () => {
    it('should use custom resolver', async () => {
      const customLoader = new PluginLoader({
        logger: mockLogger as any,
        resolve: async (source) => {
          if (source === 'test-plugin') {
            return { default: ValidPlugin };
          }
          throw new Error('Not found');
        },
      });

      const result = await customLoader.load('test-plugin');

      expect(result.meta.name).toBe('ValidPlugin');
    });

    it('should find named export', async () => {
      const customLoader = new PluginLoader({
        logger: mockLogger as any,
        resolve: async () => ({
          MyPlugin: ValidPlugin,
        }),
      });

      const result = await customLoader.load('any-source');

      expect(result.meta.name).toBe('ValidPlugin');
    });

    it('should throw PluginLoadError on resolver failure', async () => {
      const customLoader = new PluginLoader({
        logger: mockLogger as any,
        resolve: async () => {
          throw new Error('Module not found');
        },
      });

      await expect(customLoader.load('missing-module')).rejects.toThrow(PluginLoadError);
    });

    it('should throw when module has no plugin class', async () => {
      const customLoader = new PluginLoader({
        logger: mockLogger as any,
        resolve: async () => ({
          notAPlugin: 'just a string',
          alsoNot: { foo: 'bar' },
        }),
      });

      await expect(customLoader.load('bad-module')).rejects.toThrow(PluginLoadError);
    });
  });

  describe('loadMany', () => {
    it('should load multiple plugins', async () => {
      const customLoader = new PluginLoader({
        logger: mockLogger as any,
        resolve: async (source) => {
          if (source === 'plugin-a') return { default: ValidPlugin };
          if (source === 'plugin-b') return { default: DependentPlugin };
          throw new Error('Not found');
        },
      });

      const result = await customLoader.loadMany(['plugin-a', 'plugin-b']);

      expect(result.loaded.length).toBe(2);
      expect(result.errors.length).toBe(0);
    });

    it('should collect errors without stopping', async () => {
      const customLoader = new PluginLoader({
        logger: mockLogger as any,
        resolve: async (source) => {
          if (source === 'good') return { default: ValidPlugin };
          throw new Error('Not found');
        },
      });

      const result = await customLoader.loadMany(['good', 'bad', 'also-bad']);

      expect(result.loaded.length).toBe(1);
      expect(result.errors.length).toBe(2);
      expect(result.errors[0].source).toBe('bad');
      expect(result.errors[1].source).toBe('also-bad');
    });
  });

  describe('PluginLoadError', () => {
    it('should include source in message', () => {
      const error = new PluginLoadError('./my-plugin.ts', 'Something went wrong');

      expect(error.source).toBe('./my-plugin.ts');
      expect(error.message).toContain('./my-plugin.ts');
      expect(error.message).toContain('Something went wrong');
    });

    it('should preserve cause', () => {
      const cause = new Error('Root cause');
      const error = new PluginLoadError('test', 'Failed', cause);

      expect(error.cause).toBe(cause);
    });
  });
});
