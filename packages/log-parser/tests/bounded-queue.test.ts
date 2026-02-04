/**
 * @squadscript/log-parser
 *
 * Unit tests for bounded queue implementation.
 */

import { describe, expect, it } from "bun:test";
import { BoundedQueue } from "../src/queue/bounded-queue";

describe("BoundedQueue", () => {
	describe("basic operations", () => {
		it("should enqueue and dequeue items", () => {
			const queue = new BoundedQueue<string>({ maxSize: 10 });

			queue.enqueue("first");
			queue.enqueue("second");

			expect(queue.size).toBe(2);
			expect(queue.dequeue()).toBe("first");
			expect(queue.dequeue()).toBe("second");
			expect(queue.size).toBe(0);
		});

		it("should return undefined when dequeuing empty queue", () => {
			const queue = new BoundedQueue<string>({ maxSize: 10 });

			expect(queue.dequeue()).toBeUndefined();
		});

		it("should track isEmpty correctly", () => {
			const queue = new BoundedQueue<string>({ maxSize: 10 });

			expect(queue.isEmpty).toBe(true);
			queue.enqueue("item");
			expect(queue.isEmpty).toBe(false);
			queue.dequeue();
			expect(queue.isEmpty).toBe(true);
		});

		it("should peek without removing", () => {
			const queue = new BoundedQueue<string>({ maxSize: 10 });

			queue.enqueue("first");
			queue.enqueue("second");

			expect(queue.peek()).toBe("first");
			expect(queue.size).toBe(2);
		});

		it("should clear all items", () => {
			const queue = new BoundedQueue<string>({ maxSize: 10 });

			queue.enqueue("first");
			queue.enqueue("second");
			queue.clear();

			expect(queue.isEmpty).toBe(true);
			expect(queue.size).toBe(0);
		});
	});

	describe("capacity and overflow", () => {
		it("should drop oldest when over capacity", () => {
			const queue = new BoundedQueue<string>({ maxSize: 3 });

			queue.enqueue("first");
			queue.enqueue("second");
			queue.enqueue("third");
			queue.enqueue("fourth"); // Should drop "first"

			expect(queue.size).toBe(3);
			expect(queue.dequeue()).toBe("second");
		});

		it("should track dropped items count", () => {
			const queue = new BoundedQueue<string>({ maxSize: 2 });

			queue.enqueue("first");
			queue.enqueue("second");
			queue.enqueue("third");
			queue.enqueue("fourth");

			const stats = queue.getStats();
			expect(stats.totalDropped).toBe(2);
		});
	});

	describe("high water mark", () => {
		it("should call onHighWaterMark when threshold exceeded", () => {
			let highWaterCalled = false;

			const queue = new BoundedQueue<string>({
				maxSize: 10,
				highWaterMark: 0.5, // 50% of 10 = 5 items
				onHighWaterMark: () => {
					highWaterCalled = true;
				},
			});

			// Fill to high water mark (5 items = 50%)
			for (let i = 0; i < 5; i++) {
				queue.enqueue(`item-${i}`);
			}

			// At 5 items, we hit the highWaterMark (0.5 * 10 = 5)
			expect(highWaterCalled).toBe(true);
		});

		it("should report isFull status", () => {
			const queue = new BoundedQueue<string>({
				maxSize: 5,
			});

			expect(queue.isFull).toBe(false);

			for (let i = 0; i < 5; i++) {
				queue.enqueue(`item-${i}`);
			}

			expect(queue.isFull).toBe(true);
		});
	});

	describe("statistics", () => {
		it("should track enqueued and dequeued counts", () => {
			const queue = new BoundedQueue<string>({ maxSize: 10 });

			queue.enqueue("first");
			queue.enqueue("second");
			queue.dequeue();

			const stats = queue.getStats();
			expect(stats.totalEnqueued).toBe(2);
			expect(stats.totalDequeued).toBe(1);
		});

		it("should calculate current depth", () => {
			const queue = new BoundedQueue<string>({ maxSize: 10 });

			queue.enqueue("first");
			queue.enqueue("second");
			queue.enqueue("third");

			const stats = queue.getStats();
			expect(stats.currentDepth).toBe(3);
		});

		it("should report max capacity", () => {
			const queue = new BoundedQueue<string>({ maxSize: 100 });

			const stats = queue.getStats();
			expect(stats.maxSize).toBe(100);
		});
	});

	describe("iteration", () => {
		it("should be iterable", () => {
			const queue = new BoundedQueue<string>({ maxSize: 10 });

			queue.enqueue("first");
			queue.enqueue("second");
			queue.enqueue("third");

			const items = [...queue];

			expect(items).toEqual(["first", "second", "third"]);
			expect(queue.size).toBe(3); // Should not consume
		});
	});
});
