/**
 * @squadscript/server
 *
 * Update scheduler for periodic state refresh operations.
 *
 * Provides a clean interface for managing timed tasks with proper
 * lifecycle management to prevent memory leaks.
 *
 * @module
 */

import type { ModuleLogger } from '@squadscript/logger';

/**
 * A scheduled update task.
 */
export interface UpdateTask {
  /** Unique task name. */
  readonly name: string;
  /** Interval in milliseconds. */
  readonly interval: number;
  /** Task function to execute. */
  readonly execute: () => Promise<void>;
  /** Whether the task is currently enabled. */
  enabled: boolean;
}

/**
 * Internal task state tracking.
 */
interface TaskState {
  task: UpdateTask;
  timerId: ReturnType<typeof setInterval> | null;
  lastRun: Date | null;
  lastError: Error | null;
  runCount: number;
  errorCount: number;
  isRunning: boolean;
}

/**
 * Statistics for a scheduled task.
 */
export interface TaskStats {
  /** Task name. */
  readonly name: string;
  /** Whether the task is enabled. */
  readonly enabled: boolean;
  /** Last successful run time. */
  readonly lastRun: Date | null;
  /** Last error if any. */
  readonly lastError: Error | null;
  /** Total number of runs. */
  readonly runCount: number;
  /** Total number of errors. */
  readonly errorCount: number;
  /** Whether the task is currently running. */
  readonly isRunning: boolean;
}

/**
 * Options for the UpdateScheduler.
 */
export interface UpdateSchedulerOptions {
  /** Logger instance. */
  readonly logger: ModuleLogger;
}

/**
 * Manages periodic update tasks with proper lifecycle management.
 *
 * Features:
 * - Tracks task execution statistics
 * - Handles errors gracefully without crashing
 * - Supports enabling/disabling individual tasks
 * - Proper cleanup to prevent memory leaks
 *
 * @example
 * ```typescript
 * const scheduler = new UpdateScheduler({ logger });
 *
 * scheduler.register({
 *   name: 'playerList',
 *   interval: 30000,
 *   execute: async () => {
 *     await server.updatePlayerList();
 *   },
 *   enabled: true,
 * });
 *
 * scheduler.startAll();
 *
 * // Later...
 * scheduler.stopAll();
 * ```
 */
export class UpdateScheduler {
  private readonly logger: ModuleLogger;
  private readonly tasks = new Map<string, TaskState>();
  private isStarted = false;

  constructor(options: UpdateSchedulerOptions) {
    this.logger = options.logger;
  }

  /**
   * Registers a new update task.
   *
   * @param task - The task configuration
   * @throws Error if a task with the same name already exists
   */
  register(task: UpdateTask): void {
    if (this.tasks.has(task.name)) {
      throw new Error(`Task "${task.name}" is already registered`);
    }

    const state: TaskState = {
      task,
      timerId: null,
      lastRun: null,
      lastError: null,
      runCount: 0,
      errorCount: 0,
      isRunning: false,
    };

    this.tasks.set(task.name, state);

    this.logger.debug(`Registered update task: ${task.name} (${task.interval}ms)`);

    // If scheduler is already started and task is enabled, start it immediately
    if (this.isStarted && task.enabled) {
      this.startTask(state);
    }
  }

  /**
   * Unregisters a task and stops it if running.
   *
   * @param name - The task name
   */
  unregister(name: string): void {
    const state = this.tasks.get(name);
    if (!state) {
      return;
    }

    this.stopTask(state);
    this.tasks.delete(name);

    this.logger.debug(`Unregistered update task: ${name}`);
  }

  /**
   * Starts all enabled tasks.
   */
  startAll(): void {
    if (this.isStarted) {
      this.logger.warn('Scheduler is already started');
      return;
    }

    this.isStarted = true;

    for (const state of this.tasks.values()) {
      if (state.task.enabled) {
        this.startTask(state);
      }
    }

    this.logger.info(`Started ${this.tasks.size} update tasks`);
  }

  /**
   * Stops all tasks.
   */
  stopAll(): void {
    if (!this.isStarted) {
      return;
    }

    for (const state of this.tasks.values()) {
      this.stopTask(state);
    }

    this.isStarted = false;
    this.logger.info('Stopped all update tasks');
  }

  /**
   * Enables or disables a specific task.
   *
   * @param name - The task name
   * @param enabled - Whether to enable or disable
   */
  setEnabled(name: string, enabled: boolean): void {
    const state = this.tasks.get(name);
    if (!state) {
      this.logger.warn(`Task "${name}" not found`);
      return;
    }

    if (state.task.enabled === enabled) {
      return;
    }

    state.task.enabled = enabled;

    if (this.isStarted) {
      if (enabled) {
        this.startTask(state);
      } else {
        this.stopTask(state);
      }
    }

    this.logger.debug(`Task "${name}" ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Runs a task immediately, regardless of its schedule.
   *
   * @param name - The task name
   * @returns Promise that resolves when the task completes
   */
  async runNow(name: string): Promise<void> {
    const state = this.tasks.get(name);
    if (!state) {
      throw new Error(`Task "${name}" not found`);
    }

    await this.executeTask(state);
  }

  /**
   * Gets statistics for all tasks.
   */
  getStats(): Map<string, TaskStats> {
    const stats = new Map<string, TaskStats>();

    for (const [name, state] of this.tasks) {
      stats.set(name, {
        name,
        enabled: state.task.enabled,
        lastRun: state.lastRun,
        lastError: state.lastError,
        runCount: state.runCount,
        errorCount: state.errorCount,
        isRunning: state.isRunning,
      });
    }

    return stats;
  }

  /**
   * Gets statistics for a specific task.
   *
   * @param name - The task name
   */
  getTaskStats(name: string): TaskStats | undefined {
    const state = this.tasks.get(name);
    if (!state) {
      return undefined;
    }

    return {
      name,
      enabled: state.task.enabled,
      lastRun: state.lastRun,
      lastError: state.lastError,
      runCount: state.runCount,
      errorCount: state.errorCount,
      isRunning: state.isRunning,
    };
  }

  /**
   * Checks if the scheduler is currently running.
   */
  isRunning(): boolean {
    return this.isStarted;
  }

  /**
   * Starts a specific task's interval timer.
   */
  private startTask(state: TaskState): void {
    if (state.timerId !== null) {
      return;
    }

    // Run immediately on start
    void this.executeTask(state);

    // Then schedule for interval
    state.timerId = setInterval(() => {
      void this.executeTask(state);
    }, state.task.interval);

    this.logger.debug(`Started task: ${state.task.name}`);
  }

  /**
   * Stops a specific task's interval timer.
   */
  private stopTask(state: TaskState): void {
    if (state.timerId !== null) {
      clearInterval(state.timerId);
      state.timerId = null;
      this.logger.debug(`Stopped task: ${state.task.name}`);
    }
  }

  /**
   * Executes a task and handles errors gracefully.
   */
  private async executeTask(state: TaskState): Promise<void> {
    if (state.isRunning) {
      this.logger.debug(`Task "${state.task.name}" is already running, skipping`);
      return;
    }

    state.isRunning = true;

    try {
      await state.task.execute();
      state.lastRun = new Date();
      state.runCount++;
      state.lastError = null;
    } catch (error) {
      state.errorCount++;
      state.lastError = error instanceof Error ? error : new Error(String(error));
      this.logger.warn(`Task "${state.task.name}" failed: ${state.lastError.message}`);
    } finally {
      state.isRunning = false;
    }
  }
}
