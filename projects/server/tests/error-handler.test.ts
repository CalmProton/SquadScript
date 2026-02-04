/**
 * @squadscript/server
 *
 * Unit tests for PluginErrorHandler and circuit breaker.
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import {
  PluginError,
  PluginErrorType,
  PluginCircuitBreaker,
  PluginErrorHandler,
  CircuitState,
} from '../src/plugins/error-handler';

describe('PluginError', () => {
  it('should create error with plugin name', () => {
    const error = new PluginError('MyPlugin', 'Something failed', PluginErrorType.LIFECYCLE);

    expect(error.pluginName).toBe('MyPlugin');
    expect(error.errorType).toBe(PluginErrorType.LIFECYCLE);
    expect(error.message).toContain('MyPlugin');
    expect(error.message).toContain('Something failed');
  });

  it('should preserve cause stack trace', () => {
    const cause = new Error('Root cause');
    const error = new PluginError('MyPlugin', 'Wrapper', PluginErrorType.EVENT, cause);

    expect(error.cause).toBe(cause);
    expect(error.stack).toContain('Root cause');
  });

  it('should record timestamp', () => {
    const before = new Date();
    const error = new PluginError('MyPlugin', 'Test', PluginErrorType.UNKNOWN);
    const after = new Date();

    expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  describe('factory methods', () => {
    it('should create lifecycle error', () => {
      const error = PluginError.lifecycle('MyPlugin', 'mount', new Error('Failed'));

      expect(error.errorType).toBe(PluginErrorType.LIFECYCLE);
      expect(error.context?.phase).toBe('mount');
    });

    it('should create event error', () => {
      const error = PluginError.event('MyPlugin', 'CHAT_MESSAGE', new Error('Failed'));

      expect(error.errorType).toBe(PluginErrorType.EVENT);
      expect(error.context?.eventName).toBe('CHAT_MESSAGE');
    });

    it('should create connector error', () => {
      const error = PluginError.connector('MyPlugin', 'discord', new Error('Failed'));

      expect(error.errorType).toBe(PluginErrorType.CONNECTOR);
      expect(error.context?.connectorName).toBe('discord');
    });

    it('should create rcon error', () => {
      const error = PluginError.rcon('MyPlugin', 'AdminBroadcast', new Error('Failed'));

      expect(error.errorType).toBe(PluginErrorType.RCON);
      expect(error.context?.command).toBe('AdminBroadcast');
    });
  });
});

describe('PluginCircuitBreaker', () => {
  let breaker: PluginCircuitBreaker;

  beforeEach(() => {
    breaker = new PluginCircuitBreaker('TestPlugin', {
      failureThreshold: 3,
      resetTimeout: 100, // Short timeout for tests
      successThreshold: 2,
    });
  });

  afterEach(() => {
    breaker.dispose();
  });

  it('should start in closed state', () => {
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    expect(breaker.isAllowed()).toBe(true);
  });

  it('should open after failure threshold', () => {
    const error = new PluginError('TestPlugin', 'Error', PluginErrorType.EVENT);

    breaker.recordFailure(error);
    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    breaker.recordFailure(error);
    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    breaker.recordFailure(error); // Third failure
    expect(breaker.getState()).toBe(CircuitState.OPEN);
    expect(breaker.isAllowed()).toBe(false);
  });

  it('should reset failure count on success', () => {
    const error = new PluginError('TestPlugin', 'Error', PluginErrorType.EVENT);

    breaker.recordFailure(error);
    breaker.recordFailure(error);
    expect(breaker.getFailureCount()).toBe(2);

    breaker.recordSuccess();
    expect(breaker.getFailureCount()).toBe(0);
  });

  it('should transition to half-open after reset timeout', async () => {
    const error = new PluginError('TestPlugin', 'Error', PluginErrorType.EVENT);

    // Trip the breaker
    breaker.recordFailure(error);
    breaker.recordFailure(error);
    breaker.recordFailure(error);

    expect(breaker.getState()).toBe(CircuitState.OPEN);

    // Wait for reset timeout
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    expect(breaker.isAllowed()).toBe(true);
  });

  it('should close after successes in half-open state', async () => {
    const error = new PluginError('TestPlugin', 'Error', PluginErrorType.EVENT);

    // Trip and wait for half-open
    breaker.recordFailure(error);
    breaker.recordFailure(error);
    breaker.recordFailure(error);
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

    breaker.recordSuccess();
    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

    breaker.recordSuccess(); // Second success
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should reopen on failure in half-open state', async () => {
    const error = new PluginError('TestPlugin', 'Error', PluginErrorType.EVENT);

    // Trip and wait for half-open
    breaker.recordFailure(error);
    breaker.recordFailure(error);
    breaker.recordFailure(error);
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

    breaker.recordFailure(error);
    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should track last error', () => {
    const error1 = new PluginError('TestPlugin', 'First error', PluginErrorType.EVENT);
    const error2 = new PluginError('TestPlugin', 'Second error', PluginErrorType.RCON);

    breaker.recordFailure(error1);
    expect(breaker.getLastError()?.message).toContain('First error');

    breaker.recordFailure(error2);
    expect(breaker.getLastError()?.message).toContain('Second error');
  });

  it('should reset to initial state', () => {
    const error = new PluginError('TestPlugin', 'Error', PluginErrorType.EVENT);

    breaker.recordFailure(error);
    breaker.recordFailure(error);
    breaker.recordFailure(error);

    expect(breaker.getState()).toBe(CircuitState.OPEN);

    breaker.reset();

    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    expect(breaker.getFailureCount()).toBe(0);
    expect(breaker.getLastError()).toBeUndefined();
  });
});

describe('PluginErrorHandler', () => {
  let handler: PluginErrorHandler;

  beforeEach(() => {
    handler = new PluginErrorHandler({
      isolatePlugins: true,
      circuitBreaker: {
        failureThreshold: 2,
        resetTimeout: 100,
      },
    });
  });

  afterEach(() => {
    handler.dispose();
  });

  it('should track errors in history', () => {
    const error1 = new PluginError('Plugin1', 'Error 1', PluginErrorType.EVENT);
    const error2 = new PluginError('Plugin2', 'Error 2', PluginErrorType.LIFECYCLE);

    handler.handleError(error1);
    handler.handleError(error2);

    const allErrors = handler.getAllErrors();
    expect(allErrors.length).toBe(2);
    expect(allErrors[0]).toBe(error2); // Most recent first
    expect(allErrors[1]).toBe(error1);
  });

  it('should filter errors by plugin', () => {
    const error1 = new PluginError('Plugin1', 'Error 1', PluginErrorType.EVENT);
    const error2 = new PluginError('Plugin2', 'Error 2', PluginErrorType.EVENT);
    const error3 = new PluginError('Plugin1', 'Error 3', PluginErrorType.EVENT);

    handler.handleError(error1);
    handler.handleError(error2);
    handler.handleError(error3);

    const plugin1Errors = handler.getPluginErrors('Plugin1');
    expect(plugin1Errors.length).toBe(2);
  });

  it('should create circuit breakers per plugin', () => {
    const breaker1 = handler.getCircuitBreaker('Plugin1');
    const breaker2 = handler.getCircuitBreaker('Plugin2');

    expect(breaker1).not.toBe(breaker2);
    expect(breaker1.pluginName).toBe('Plugin1');
    expect(breaker2.pluginName).toBe('Plugin2');

    // Same plugin should return same breaker
    expect(handler.getCircuitBreaker('Plugin1')).toBe(breaker1);
  });

  it('should block plugin when circuit opens', () => {
    const error = new PluginError('FailingPlugin', 'Error', PluginErrorType.EVENT);

    expect(handler.isPluginAllowed('FailingPlugin')).toBe(true);

    handler.handleError(error);
    handler.handleError(error); // Threshold is 2

    expect(handler.isPluginAllowed('FailingPlugin')).toBe(false);
  });

  it('should allow unknown plugins', () => {
    expect(handler.isPluginAllowed('NewPlugin')).toBe(true);
  });

  it('should reset specific plugin', () => {
    const error = new PluginError('Plugin1', 'Error', PluginErrorType.EVENT);

    handler.handleError(error);
    handler.handleError(error);
    expect(handler.isPluginAllowed('Plugin1')).toBe(false);

    handler.resetPlugin('Plugin1');
    expect(handler.isPluginAllowed('Plugin1')).toBe(true);
  });

  it('should reset all state', () => {
    const error1 = new PluginError('Plugin1', 'Error', PluginErrorType.EVENT);
    const error2 = new PluginError('Plugin2', 'Error', PluginErrorType.EVENT);

    handler.handleError(error1);
    handler.handleError(error1);
    handler.handleError(error2);
    handler.handleError(error2);

    expect(handler.isPluginAllowed('Plugin1')).toBe(false);
    expect(handler.isPluginAllowed('Plugin2')).toBe(false);
    expect(handler.getAllErrors().length).toBe(4);

    handler.reset();

    expect(handler.isPluginAllowed('Plugin1')).toBe(true);
    expect(handler.isPluginAllowed('Plugin2')).toBe(true);
    expect(handler.getAllErrors().length).toBe(0);
  });

  describe('wrap method', () => {
    it('should return result on success', async () => {
      const result = await handler.wrap(
        'TestPlugin',
        PluginErrorType.EVENT,
        async () => 42,
      );

      expect(result).toBe(42);
    });

    it('should return undefined on error', async () => {
      const result = await handler.wrap(
        'TestPlugin',
        PluginErrorType.EVENT,
        async () => {
          throw new Error('Test error');
        },
      );

      expect(result).toBeUndefined();
    });

    it('should record error in handler', async () => {
      await handler.wrap('TestPlugin', PluginErrorType.RCON, async () => {
        throw new Error('Failed');
      });

      const errors = handler.getPluginErrors('TestPlugin');
      expect(errors.length).toBe(1);
      expect(errors[0].errorType).toBe(PluginErrorType.RCON);
    });

    it('should return undefined if plugin not allowed', async () => {
      // Trip the circuit
      const error = new PluginError('BlockedPlugin', 'Error', PluginErrorType.EVENT);
      handler.handleError(error);
      handler.handleError(error);

      expect(handler.isPluginAllowed('BlockedPlugin')).toBe(false);

      const result = await handler.wrap(
        'BlockedPlugin',
        PluginErrorType.EVENT,
        async () => 42,
      );

      expect(result).toBeUndefined();
    });

    it('should record success in circuit breaker', async () => {
      await handler.wrap('TestPlugin', PluginErrorType.EVENT, async () => 'ok');

      const breaker = handler.getCircuitBreaker('TestPlugin');
      expect(breaker.getFailureCount()).toBe(0);
    });
  });

  describe('onError callback', () => {
    it('should call error callback', () => {
      const errors: PluginError[] = [];
      const handlerWithCallback = new PluginErrorHandler({
        onError: (error) => errors.push(error),
      });

      const error = new PluginError('TestPlugin', 'Error', PluginErrorType.EVENT);
      handlerWithCallback.handleError(error);

      expect(errors.length).toBe(1);
      expect(errors[0]).toBe(error);

      handlerWithCallback.dispose();
    });
  });
});
