/**
 * @squadscript/server
 *
 * Unit tests for OptionsResolver.
 */

import { describe, expect, it, beforeEach } from 'bun:test';
import {
  OptionsResolver,
  OptionsValidationError,
} from '../src/plugins/options-resolver';
import type { OptionsSpecification } from '@squadscript/types/plugin';

describe('OptionsResolver', () => {
  let resolver: OptionsResolver;

  beforeEach(() => {
    resolver = new OptionsResolver();
  });

  describe('basic validation', () => {
    it('should pass with valid options', () => {
      const spec = {
        name: { type: 'string', required: true, description: 'Name' },
        count: { type: 'number', required: true, description: 'Count' },
      } as const satisfies OptionsSpecification;

      const result = resolver.resolve('TestPlugin', spec, {
        name: 'test',
        count: 42,
      });

      expect(result).toEqual({ name: 'test', count: 42 });
    });

    it('should throw on missing required field', () => {
      const spec = {
        name: { type: 'string', required: true, description: 'Name' },
      } as const satisfies OptionsSpecification;

      expect(() => {
        resolver.resolve('TestPlugin', spec, {});
      }).toThrow(OptionsValidationError);
    });

    it('should include plugin name in error', () => {
      const spec = {
        name: { type: 'string', required: true, description: 'Name' },
      } as const satisfies OptionsSpecification;

      try {
        resolver.resolve('MyPlugin', spec, {});
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(OptionsValidationError);
        const validationError = error as OptionsValidationError;
        expect(validationError.pluginName).toBe('MyPlugin');
        expect(validationError.message).toContain('MyPlugin');
      }
    });

    it('should apply default values', () => {
      const spec = {
        name: { type: 'string', required: true, description: 'Name' },
        count: { type: 'number', required: false, default: 10, description: 'Count' },
      } as const satisfies OptionsSpecification;

      const result = resolver.resolve('TestPlugin', spec, { name: 'test' });

      expect(result).toEqual({ name: 'test', count: 10 });
    });

    it('should allow optional fields to be undefined', () => {
      const spec = {
        name: { type: 'string', required: true, description: 'Name' },
        optional: { type: 'string', required: false, description: 'Optional' },
      } as const satisfies OptionsSpecification;

      const result = resolver.resolve('TestPlugin', spec, { name: 'test' });

      expect(result).toEqual({ name: 'test' });
    });
  });

  describe('type validation', () => {
    it('should validate string type', () => {
      const spec = {
        value: { type: 'string', required: true, description: 'Value' },
      } as const satisfies OptionsSpecification;

      expect(() => {
        resolver.resolve('TestPlugin', spec, { value: 123 });
      }).toThrow(OptionsValidationError);
    });

    it('should validate number type', () => {
      const spec = {
        value: { type: 'number', required: true, description: 'Value' },
      } as const satisfies OptionsSpecification;

      expect(() => {
        resolver.resolve('TestPlugin', spec, { value: 'not a number' });
      }).toThrow(OptionsValidationError);
    });

    it('should reject NaN for number type', () => {
      const spec = {
        value: { type: 'number', required: true, description: 'Value' },
      } as const satisfies OptionsSpecification;

      expect(() => {
        resolver.resolve('TestPlugin', spec, { value: NaN });
      }).toThrow(OptionsValidationError);
    });

    it('should validate boolean type', () => {
      const spec = {
        value: { type: 'boolean', required: true, description: 'Value' },
      } as const satisfies OptionsSpecification;

      expect(() => {
        resolver.resolve('TestPlugin', spec, { value: 'true' });
      }).toThrow(OptionsValidationError);
    });

    it('should validate array type', () => {
      const spec = {
        value: { type: 'array', required: true, description: 'Value' },
      } as const satisfies OptionsSpecification;

      const result = resolver.resolve('TestPlugin', spec, { value: [1, 2, 3] });
      expect(result.value).toEqual([1, 2, 3]);

      expect(() => {
        resolver.resolve('TestPlugin', spec, { value: 'not an array' });
      }).toThrow(OptionsValidationError);
    });

    it('should validate object type', () => {
      const spec = {
        value: { type: 'object', required: true, description: 'Value' },
      } as const satisfies OptionsSpecification;

      const result = resolver.resolve('TestPlugin', spec, { value: { key: 'val' } });
      expect(result.value).toEqual({ key: 'val' });

      expect(() => {
        resolver.resolve('TestPlugin', spec, { value: [1, 2] }); // Array is not object
      }).toThrow(OptionsValidationError);
    });
  });

  describe('number constraints', () => {
    it('should validate min constraint', () => {
      const spec = {
        value: { type: 'number', required: true, min: 10, description: 'Value' },
      } as const satisfies OptionsSpecification;

      expect(() => {
        resolver.resolve('TestPlugin', spec, { value: 5 });
      }).toThrow(OptionsValidationError);

      const result = resolver.resolve('TestPlugin', spec, { value: 15 });
      expect(result.value).toBe(15);
    });

    it('should validate max constraint', () => {
      const spec = {
        value: { type: 'number', required: true, max: 100, description: 'Value' },
      } as const satisfies OptionsSpecification;

      expect(() => {
        resolver.resolve('TestPlugin', spec, { value: 150 });
      }).toThrow(OptionsValidationError);

      const result = resolver.resolve('TestPlugin', spec, { value: 50 });
      expect(result.value).toBe(50);
    });

    it('should validate both min and max', () => {
      const spec = {
        value: { type: 'number', required: true, min: 0, max: 100, description: 'Value' },
      } as const satisfies OptionsSpecification;

      expect(() => resolver.resolve('TestPlugin', spec, { value: -1 })).toThrow();
      expect(() => resolver.resolve('TestPlugin', spec, { value: 101 })).toThrow();

      const result = resolver.resolve('TestPlugin', spec, { value: 50 });
      expect(result.value).toBe(50);
    });
  });

  describe('string constraints', () => {
    it('should validate minLength constraint', () => {
      const spec = {
        value: { type: 'string', required: true, minLength: 3, description: 'Value' },
      } as const satisfies OptionsSpecification;

      expect(() => {
        resolver.resolve('TestPlugin', spec, { value: 'ab' });
      }).toThrow(OptionsValidationError);

      const result = resolver.resolve('TestPlugin', spec, { value: 'abc' });
      expect(result.value).toBe('abc');
    });

    it('should validate maxLength constraint', () => {
      const spec = {
        value: { type: 'string', required: true, maxLength: 5, description: 'Value' },
      } as const satisfies OptionsSpecification;

      expect(() => {
        resolver.resolve('TestPlugin', spec, { value: 'abcdef' });
      }).toThrow(OptionsValidationError);

      const result = resolver.resolve('TestPlugin', spec, { value: 'abc' });
      expect(result.value).toBe('abc');
    });

    it('should validate pattern constraint', () => {
      const spec = {
        value: { type: 'string', required: true, pattern: '^[a-z]+$', description: 'Value' },
      } as const satisfies OptionsSpecification;

      expect(() => {
        resolver.resolve('TestPlugin', spec, { value: 'ABC123' });
      }).toThrow(OptionsValidationError);

      const result = resolver.resolve('TestPlugin', spec, { value: 'abc' });
      expect(result.value).toBe('abc');
    });
  });

  describe('array constraints', () => {
    it('should validate array minLength', () => {
      const spec = {
        value: { type: 'array', required: true, minLength: 2, description: 'Value' },
      } as const satisfies OptionsSpecification;

      expect(() => {
        resolver.resolve('TestPlugin', spec, { value: [1] });
      }).toThrow(OptionsValidationError);
    });

    it('should validate array maxLength', () => {
      const spec = {
        value: { type: 'array', required: true, maxLength: 3, description: 'Value' },
      } as const satisfies OptionsSpecification;

      expect(() => {
        resolver.resolve('TestPlugin', spec, { value: [1, 2, 3, 4] });
      }).toThrow(OptionsValidationError);
    });
  });

  describe('choices constraint', () => {
    it('should validate value is in choices', () => {
      const spec = {
        level: {
          type: 'string',
          required: true,
          choices: ['low', 'medium', 'high'] as const,
          description: 'Level',
        },
      } as const satisfies OptionsSpecification;

      expect(() => {
        resolver.resolve('TestPlugin', spec, { level: 'extreme' });
      }).toThrow(OptionsValidationError);

      const result = resolver.resolve('TestPlugin', spec, { level: 'medium' });
      expect(result.level).toBe('medium');
    });
  });

  describe('custom validation', () => {
    it('should call custom validate function', () => {
      const spec = {
        value: {
          type: 'number',
          required: true,
          validate: (v: unknown) => typeof v === 'number' && v % 2 === 0, // Must be even
          description: 'Value',
        },
      } as const satisfies OptionsSpecification;

      expect(() => {
        resolver.resolve('TestPlugin', spec, { value: 3 });
      }).toThrow(OptionsValidationError);

      const result = resolver.resolve('TestPlugin', spec, { value: 4 });
      expect(result.value).toBe(4);
    });
  });

  describe('nested objects', () => {
    it('should validate nested object properties', () => {
      const spec = {
        config: {
          type: 'object',
          required: true,
          properties: {
            host: { type: 'string', required: true, description: 'Host' },
            port: { type: 'number', required: true, min: 1, max: 65535, description: 'Port' },
          },
          description: 'Config',
        },
      } as const satisfies OptionsSpecification;

      const result = resolver.resolve('TestPlugin', spec, {
        config: { host: 'localhost', port: 8080 },
      });

      expect(result.config).toEqual({ host: 'localhost', port: 8080 });
    });

    it('should report nested path in errors', () => {
      const spec = {
        config: {
          type: 'object',
          required: true,
          properties: {
            port: { type: 'number', required: true, min: 1, description: 'Port' },
          },
          description: 'Config',
        },
      } as const satisfies OptionsSpecification;

      try {
        resolver.resolve('TestPlugin', spec, {
          config: { port: -1 },
        });
        expect.unreachable('Should have thrown');
      } catch (error) {
        const validationError = error as OptionsValidationError;
        expect(validationError.errors[0].path).toBe('config.port');
      }
    });
  });

  describe('array items', () => {
    it('should validate array item types', () => {
      const spec = {
        numbers: {
          type: 'array',
          required: true,
          items: { type: 'number', required: true, min: 0, description: 'Number' },
          description: 'Numbers',
        },
      } as const satisfies OptionsSpecification;

      const result = resolver.resolve('TestPlugin', spec, {
        numbers: [1, 2, 3],
      });

      expect(result.numbers).toEqual([1, 2, 3]);

      expect(() => {
        resolver.resolve('TestPlugin', spec, {
          numbers: [1, 'two', 3],
        });
      }).toThrow(OptionsValidationError);
    });

    it('should report array index in errors', () => {
      const spec = {
        items: {
          type: 'array',
          required: true,
          items: { type: 'number', required: true, description: 'Item' },
          description: 'Items',
        },
      } as const satisfies OptionsSpecification;

      try {
        resolver.resolve('TestPlugin', spec, {
          items: [1, 'bad', 3],
        });
        expect.unreachable('Should have thrown');
      } catch (error) {
        const validationError = error as OptionsValidationError;
        expect(validationError.errors[0].path).toBe('items[1]');
      }
    });
  });

  describe('validate method', () => {
    it('should return errors without throwing', () => {
      const spec = {
        name: { type: 'string', required: true, description: 'Name' },
        count: { type: 'number', required: true, description: 'Count' },
      } as const satisfies OptionsSpecification;

      const errors = resolver.validate('TestPlugin', spec, {});

      expect(errors.length).toBe(2);
      expect(errors[0].path).toBe('name');
      expect(errors[1].path).toBe('count');
    });

    it('should return empty array for valid options', () => {
      const spec = {
        name: { type: 'string', required: true, description: 'Name' },
      } as const satisfies OptionsSpecification;

      const errors = resolver.validate('TestPlugin', spec, { name: 'test' });

      expect(errors).toEqual([]);
    });
  });

  describe('connector resolution', () => {
    it('should resolve connectors via resolver function', () => {
      const mockConnector = {
        name: 'discord',
        isConnected: true,
        connect: async () => {},
        disconnect: async () => {},
      };

      const resolverWithConnectors = new OptionsResolver({
        connectorResolver: (name) => (name === 'discord' ? mockConnector : undefined),
      });

      const spec = {
        discord: {
          type: 'object',
          required: true,
          connector: 'discord',
          description: 'Discord connector',
        },
      } as const satisfies OptionsSpecification;

      const result = resolverWithConnectors.resolve('TestPlugin', spec, {});

      expect(result.discord).toBe(mockConnector);
    });

    it('should error if required connector not found', () => {
      const resolverWithConnectors = new OptionsResolver({
        connectorResolver: () => undefined,
      });

      const spec = {
        discord: {
          type: 'object',
          required: true,
          connector: 'discord',
          description: 'Discord connector',
        },
      } as const satisfies OptionsSpecification;

      expect(() => {
        resolverWithConnectors.resolve('TestPlugin', spec, {});
      }).toThrow(OptionsValidationError);
    });
  });
});
