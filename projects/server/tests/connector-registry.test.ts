/**
 * @squadscript/server
 *
 * Unit tests for ConnectorRegistry.
 */

import { describe, expect, it, beforeEach, afterEach, mock } from 'bun:test';
import { ConnectorRegistry, type ConnectorFactory } from '../src/plugins/connector-registry';
import type { Connector, ConnectorConfig } from '@squadscript/types/plugin';

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

// Mock connector implementation
class MockConnector implements Connector {
  readonly name: string;
  private _isConnected = false;
  public connectCalled = false;
  public disconnectCalled = false;

  constructor(name: string) {
    this.name = name;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  async connect(): Promise<void> {
    this.connectCalled = true;
    this._isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.disconnectCalled = true;
    this._isConnected = false;
  }
}

// Mock factory
const createMockConnector: ConnectorFactory<MockConnector> = async (config, logger) => {
  return new MockConnector(config.name);
};

describe('ConnectorRegistry', () => {
  let registry: ConnectorRegistry;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    registry = new ConnectorRegistry({ logger: mockLogger as any });
  });

  afterEach(async () => {
    await registry.disconnectAll();
  });

  describe('registerFactory', () => {
    it('should register a factory', () => {
      registry.registerFactory('mock', createMockConnector);

      // Verify by adding a connector config
      expect(() => {
        registry.add({ type: 'mock', name: 'test', options: {} });
      }).not.toThrow();
    });

    it('should warn when overwriting factory', () => {
      registry.registerFactory('mock', createMockConnector);
      registry.registerFactory('mock', createMockConnector);

      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('add', () => {
    it('should add connector config', () => {
      registry.registerFactory('mock', createMockConnector);
      registry.add({ type: 'mock', name: 'my-connector', options: {} });

      expect(registry.has('my-connector')).toBe(true);
    });

    it('should throw for duplicate name', () => {
      registry.registerFactory('mock', createMockConnector);
      registry.add({ type: 'mock', name: 'test', options: {} });

      expect(() => {
        registry.add({ type: 'mock', name: 'test', options: {} });
      }).toThrow('already exists');
    });

    it('should throw for unknown type', () => {
      expect(() => {
        registry.add({ type: 'unknown', name: 'test', options: {} });
      }).toThrow('No factory registered');
    });
  });

  describe('register', () => {
    it('should register pre-created connector', () => {
      const connector = new MockConnector('external');
      registry.register('external', connector);

      expect(registry.has('external')).toBe(true);
      expect(registry.getSync('external')).toBe(connector);
    });

    it('should throw for duplicate name', () => {
      const connector = new MockConnector('test');
      registry.register('test', connector);

      expect(() => {
        registry.register('test', connector);
      }).toThrow('already exists');
    });
  });

  describe('get', () => {
    it('should create and connect connector lazily', async () => {
      registry.registerFactory('mock', createMockConnector);
      registry.add({ type: 'mock', name: 'lazy', options: {} });

      const connector = await registry.get<MockConnector>('lazy');

      expect(connector).toBeDefined();
      expect(connector!.connectCalled).toBe(true);
      expect(connector!.isConnected).toBe(true);
    });

    it('should return cached instance on second call', async () => {
      registry.registerFactory('mock', createMockConnector);
      registry.add({ type: 'mock', name: 'cached', options: {} });

      const first = await registry.get('cached');
      const second = await registry.get('cached');

      expect(first).toBe(second);
    });

    it('should return undefined for unknown connector', async () => {
      const connector = await registry.get('unknown');

      expect(connector).toBeUndefined();
    });

    it('should handle initialization errors', async () => {
      const failingFactory: ConnectorFactory = async () => {
        throw new Error('Connection failed');
      };

      registry.registerFactory('failing', failingFactory);
      registry.add({ type: 'failing', name: 'bad', options: {} });

      const connector = await registry.get('bad');

      expect(connector).toBeUndefined();
    });

    it('should not retry after initialization failure', async () => {
      let attempts = 0;
      const failingFactory: ConnectorFactory = async () => {
        attempts++;
        throw new Error('Connection failed');
      };

      registry.registerFactory('failing', failingFactory);
      registry.add({ type: 'failing', name: 'bad', options: {} });

      await registry.get('bad');
      await registry.get('bad');

      expect(attempts).toBe(1);
    });
  });

  describe('getSync', () => {
    it('should return undefined if not initialized', () => {
      registry.registerFactory('mock', createMockConnector);
      registry.add({ type: 'mock', name: 'test', options: {} });

      expect(registry.getSync('test')).toBeUndefined();
    });

    it('should return connector if initialized', async () => {
      registry.registerFactory('mock', createMockConnector);
      registry.add({ type: 'mock', name: 'test', options: {} });

      await registry.get('test');

      expect(registry.getSync('test')).toBeDefined();
    });
  });

  describe('has', () => {
    it('should return true for registered connector', () => {
      registry.registerFactory('mock', createMockConnector);
      registry.add({ type: 'mock', name: 'test', options: {} });

      expect(registry.has('test')).toBe(true);
    });

    it('should return false for unknown connector', () => {
      expect(registry.has('unknown')).toBe(false);
    });
  });

  describe('isConnected', () => {
    it('should return false if not initialized', () => {
      registry.registerFactory('mock', createMockConnector);
      registry.add({ type: 'mock', name: 'test', options: {} });

      expect(registry.isConnected('test')).toBe(false);
    });

    it('should return true if connected', async () => {
      registry.registerFactory('mock', createMockConnector);
      registry.add({ type: 'mock', name: 'test', options: {} });

      await registry.get('test');

      expect(registry.isConnected('test')).toBe(true);
    });
  });

  describe('names', () => {
    it('should return all registered names', () => {
      registry.registerFactory('mock', createMockConnector);
      registry.add({ type: 'mock', name: 'a', options: {} });
      registry.add({ type: 'mock', name: 'b', options: {} });
      registry.add({ type: 'mock', name: 'c', options: {} });

      expect(registry.names).toEqual(['a', 'b', 'c']);
    });
  });

  describe('getAll', () => {
    it('should return only initialized connectors', async () => {
      registry.registerFactory('mock', createMockConnector);
      registry.add({ type: 'mock', name: 'init', options: {} });
      registry.add({ type: 'mock', name: 'not-init', options: {} });

      await registry.get('init');

      const all = registry.getAll();

      expect(all.size).toBe(1);
      expect(all.has('init')).toBe(true);
      expect(all.has('not-init')).toBe(false);
    });
  });

  describe('connectAll', () => {
    it('should initialize all connectors', async () => {
      registry.registerFactory('mock', createMockConnector);
      registry.add({ type: 'mock', name: 'a', options: {} });
      registry.add({ type: 'mock', name: 'b', options: {} });

      const result = await registry.connectAll();

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(registry.isConnected('a')).toBe(true);
      expect(registry.isConnected('b')).toBe(true);
    });

    it('should report failures', async () => {
      const failingFactory: ConnectorFactory = async () => {
        throw new Error('Failed');
      };

      registry.registerFactory('mock', createMockConnector);
      registry.registerFactory('failing', failingFactory);
      registry.add({ type: 'mock', name: 'good', options: {} });
      registry.add({ type: 'failing', name: 'bad', options: {} });

      const result = await registry.connectAll();

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('disconnectAll', () => {
    it('should disconnect all connectors', async () => {
      registry.registerFactory('mock', createMockConnector);
      registry.add({ type: 'mock', name: 'a', options: {} });
      registry.add({ type: 'mock', name: 'b', options: {} });

      const connectorA = await registry.get<MockConnector>('a');
      const connectorB = await registry.get<MockConnector>('b');

      await registry.disconnectAll();

      expect(connectorA!.disconnectCalled).toBe(true);
      expect(connectorB!.disconnectCalled).toBe(true);
    });

    it('should handle errors during disconnect', async () => {
      const errorConnector: Connector = {
        name: 'error',
        isConnected: true,
        connect: async () => {},
        disconnect: async () => {
          throw new Error('Disconnect failed');
        },
      };

      registry.register('error', errorConnector);

      // Should not throw
      await expect(registry.disconnectAll()).resolves.toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should remove connector', async () => {
      registry.registerFactory('mock', createMockConnector);
      registry.add({ type: 'mock', name: 'test', options: {} });

      await registry.remove('test');

      expect(registry.has('test')).toBe(false);
    });

    it('should disconnect before removing', async () => {
      registry.registerFactory('mock', createMockConnector);
      registry.add({ type: 'mock', name: 'test', options: {} });

      const connector = await registry.get<MockConnector>('test');
      await registry.remove('test');

      expect(connector!.disconnectCalled).toBe(true);
    });

    it('should handle removing non-existent connector', async () => {
      await expect(registry.remove('unknown')).resolves.toBeUndefined();
    });
  });
});
