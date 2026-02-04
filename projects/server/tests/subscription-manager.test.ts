/**
 * @squadscript/server
 *
 * Unit tests for SubscriptionManager.
 */

import { describe, expect, it, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { SubscriptionManager } from '../src/plugins/subscription-manager';

describe('SubscriptionManager', () => {
  let manager: SubscriptionManager;

  beforeEach(() => {
    manager = new SubscriptionManager();
  });

  afterEach(() => {
    // Ensure cleanup
    if (!manager.cleaned) {
      manager.cleanup();
    }
  });

  describe('subscription tracking', () => {
    it('should track subscriptions', () => {
      const unsubscribe = mock(() => {});

      manager.trackSubscription(unsubscribe);

      expect(manager.subscriptionCount).toBe(1);
      expect(manager.totalCount).toBe(1);
    });

    it('should return wrapped unsubscribe that removes tracking', () => {
      const unsubscribe = mock(() => {});

      const wrapped = manager.trackSubscription(unsubscribe);
      expect(manager.subscriptionCount).toBe(1);

      wrapped();

      expect(manager.subscriptionCount).toBe(0);
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should track multiple subscriptions', () => {
      const unsub1 = mock(() => {});
      const unsub2 = mock(() => {});
      const unsub3 = mock(() => {});

      manager.trackSubscription(unsub1);
      manager.trackSubscription(unsub2);
      manager.trackSubscription(unsub3);

      expect(manager.subscriptionCount).toBe(3);
    });

    it('should throw when tracking after cleanup', () => {
      manager.cleanup();

      expect(() => {
        manager.trackSubscription(() => {});
      }).toThrow('Cannot track subscription after cleanup');
    });
  });

  describe('interval tracking', () => {
    it('should create and track intervals', () => {
      const callback = mock(() => {});

      manager.setInterval(callback, 100, 'test-interval');

      expect(manager.intervalCount).toBe(1);
    });

    it('should return clear function that removes interval', () => {
      const callback = mock(() => {});

      const clear = manager.setInterval(callback, 100);
      expect(manager.intervalCount).toBe(1);

      clear();

      expect(manager.intervalCount).toBe(0);
    });

    it('should execute callback on interval', async () => {
      const callback = mock(() => {});

      manager.setInterval(callback, 10, 'quick-interval');

      await new Promise((resolve) => setTimeout(resolve, 35));

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should throw when setting interval after cleanup', () => {
      manager.cleanup();

      expect(() => {
        manager.setInterval(() => {}, 100);
      }).toThrow('Cannot set interval after cleanup');
    });
  });

  describe('timeout tracking', () => {
    it('should create and track timeouts', () => {
      const callback = mock(() => {});

      manager.setTimeout(callback, 1000, 'test-timeout');

      expect(manager.timeoutCount).toBe(1);
    });

    it('should return clear function that removes timeout', () => {
      const callback = mock(() => {});

      const clear = manager.setTimeout(callback, 1000);
      expect(manager.timeoutCount).toBe(1);

      clear();

      expect(manager.timeoutCount).toBe(0);
    });

    it('should execute callback after timeout', async () => {
      const callback = mock(() => {});

      manager.setTimeout(callback, 10, 'quick-timeout');

      await new Promise((resolve) => setTimeout(resolve, 25));

      expect(callback).toHaveBeenCalledTimes(1);
      // Timeout should auto-remove after firing
      expect(manager.timeoutCount).toBe(0);
    });

    it('should throw when setting timeout after cleanup', () => {
      manager.cleanup();

      expect(() => {
        manager.setTimeout(() => {}, 100);
      }).toThrow('Cannot set timeout after cleanup');
    });
  });

  describe('cleanup', () => {
    it('should call all unsubscribe functions', () => {
      const unsub1 = mock(() => {});
      const unsub2 = mock(() => {});

      manager.trackSubscription(unsub1);
      manager.trackSubscription(unsub2);

      manager.cleanup();

      expect(unsub1).toHaveBeenCalledTimes(1);
      expect(unsub2).toHaveBeenCalledTimes(1);
    });

    it('should clear all intervals', () => {
      const callback = mock(() => {});

      manager.setInterval(callback, 10);
      manager.setInterval(callback, 10);

      expect(manager.intervalCount).toBe(2);

      manager.cleanup();

      expect(manager.intervalCount).toBe(0);
    });

    it('should clear all timeouts', () => {
      const callback = mock(() => {});

      manager.setTimeout(callback, 1000);
      manager.setTimeout(callback, 1000);

      expect(manager.timeoutCount).toBe(2);

      manager.cleanup();

      expect(manager.timeoutCount).toBe(0);
    });

    it('should return cleanup counts', () => {
      manager.trackSubscription(() => {});
      manager.trackSubscription(() => {});
      manager.setInterval(() => {}, 1000);
      manager.setTimeout(() => {}, 1000);
      manager.setTimeout(() => {}, 1000);

      const counts = manager.cleanup();

      expect(counts.subscriptions).toBe(2);
      expect(counts.intervals).toBe(1);
      expect(counts.timeouts).toBe(2);
    });

    it('should mark manager as cleaned', () => {
      expect(manager.cleaned).toBe(false);

      manager.cleanup();

      expect(manager.cleaned).toBe(true);
    });

    it('should be idempotent (multiple calls are safe)', () => {
      const unsub = mock(() => {});
      manager.trackSubscription(unsub);

      manager.cleanup();
      const secondCounts = manager.cleanup();

      expect(unsub).toHaveBeenCalledTimes(1);
      expect(secondCounts.subscriptions).toBe(0);
    });

    it('should handle errors during unsubscribe', () => {
      const failingUnsub = mock(() => {
        throw new Error('Unsubscribe failed');
      });
      const normalUnsub = mock(() => {});

      manager.trackSubscription(failingUnsub);
      manager.trackSubscription(normalUnsub);

      // Should not throw
      expect(() => manager.cleanup()).not.toThrow();

      // Both should have been called
      expect(failingUnsub).toHaveBeenCalledTimes(1);
      expect(normalUnsub).toHaveBeenCalledTimes(1);
    });
  });

  describe('reset', () => {
    it('should allow reuse after cleanup', () => {
      manager.cleanup();
      expect(manager.cleaned).toBe(true);

      manager.reset();
      expect(manager.cleaned).toBe(false);

      // Should now be able to track again
      expect(() => {
        manager.trackSubscription(() => {});
      }).not.toThrow();
    });
  });

  describe('totalCount', () => {
    it('should return sum of all tracked resources', () => {
      manager.trackSubscription(() => {});
      manager.trackSubscription(() => {});
      manager.setInterval(() => {}, 1000);
      manager.setTimeout(() => {}, 1000);
      manager.setTimeout(() => {}, 1000);
      manager.setTimeout(() => {}, 1000);

      expect(manager.totalCount).toBe(6);
      expect(manager.subscriptionCount).toBe(2);
      expect(manager.intervalCount).toBe(1);
      expect(manager.timeoutCount).toBe(3);
    });
  });
});
