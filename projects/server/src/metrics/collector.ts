/**
 * @squadscript/server
 *
 * Metrics collector — periodically samples server performance metrics.
 *
 * - Samples every 10 seconds into an in-memory rolling buffer
 * - Persists aggregated snapshots to PostgreSQL every 60 seconds
 * - Cleans up data older than retention period (default: 30 days)
 *
 * @module
 */

import type { MetricsDataPoint } from '@squadscript/types';

import type { SquadServer } from '../server.js';
import type { DrizzleDB } from '../db/index.js';
import { MetricsRepository } from '../db/repositories/metrics.repo.js';

const SAMPLE_INTERVAL_MS = 10_000;
const PERSIST_INTERVAL_MS = 60_000;
const RETENTION_DAYS = 30;
const MAX_BUFFER_SIZE = 360; // 1 hour of 10s samples

export interface MetricsCollectorOptions {
  readonly sampleIntervalMs?: number;
  readonly persistIntervalMs?: number;
  readonly retentionDays?: number;
  readonly maxBufferSize?: number;
}

export class MetricsCollector {
  private readonly server: SquadServer;
  private readonly metricsRepo: MetricsRepository;
  private readonly buffer: MetricsDataPoint[] = [];
  private readonly startTime: number;

  private readonly sampleIntervalMs: number;
  private readonly persistIntervalMs: number;
  private readonly retentionDays: number;
  private readonly maxBufferSize: number;

  private sampleTimer: ReturnType<typeof setInterval> | null = null;
  private persistTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(server: SquadServer, db: DrizzleDB, options?: MetricsCollectorOptions) {
    this.server = server;
    this.metricsRepo = new MetricsRepository(db);
    this.startTime = Date.now();

    this.sampleIntervalMs = options?.sampleIntervalMs ?? SAMPLE_INTERVAL_MS;
    this.persistIntervalMs = options?.persistIntervalMs ?? PERSIST_INTERVAL_MS;
    this.retentionDays = options?.retentionDays ?? RETENTION_DAYS;
    this.maxBufferSize = options?.maxBufferSize ?? MAX_BUFFER_SIZE;
  }

  /**
   * Start collecting metrics.
   */
  start(): void {
    // Take initial sample
    this.sample();

    // Sample every 10s
    this.sampleTimer = setInterval(() => {
      this.sample();
    }, this.sampleIntervalMs);

    // Persist every 60s
    this.persistTimer = setInterval(() => {
      void this.persist();
    }, this.persistIntervalMs);

    // Cleanup old data daily
    this.cleanupTimer = setInterval(() => {
      void this.cleanup();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Stop collecting metrics.
   */
  stop(): void {
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get the current metrics snapshot.
   */
  getCurrentSnapshot(): MetricsDataPoint {
    const latest = this.buffer[this.buffer.length - 1];
    if (latest) {
      return latest;
    }
    return this.createSnapshot();
  }

  /**
   * Get the in-memory metrics buffer (for real-time display).
   */
  getBuffer(): readonly MetricsDataPoint[] {
    return this.buffer;
  }

  /**
   * Get server uptime in seconds.
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  private sample(): void {
    const snapshot = this.createSnapshot();
    this.buffer.push(snapshot);

    // Trim buffer to max size
    while (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
  }

  private createSnapshot(): MetricsDataPoint {
    const serverInfo = this.server.getServerInfo();
    const memUsage = process.memoryUsage();

    return {
      playerCount: this.server.playerCount,
      tickRate: null, // Will be populated from tick rate events
      cpuPercent: null, // Would need OS-level APIs or external sampling
      memoryMb: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
      publicQueue: serverInfo?.publicQueue ?? 0,
      reserveQueue: serverInfo?.reserveQueue ?? 0,
      uptime: this.getUptime(),
      timestamp: new Date(),
    };
  }

  private async persist(): Promise<void> {
    const snapshot = this.getCurrentSnapshot();

    try {
      await this.metricsRepo.insert({
        playerCount: snapshot.playerCount,
        tickRate: snapshot.tickRate,
        cpuPercent: snapshot.cpuPercent,
        memoryMb: snapshot.memoryMb,
        publicQueue: snapshot.publicQueue,
        reserveQueue: snapshot.reserveQueue,
      });
    } catch {
      // Silently fail — metrics persistence is non-critical
    }
  }

  private async cleanup(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.retentionDays);

    try {
      await this.metricsRepo.deleteOlderThan(cutoff);
    } catch {
      // Silently fail
    }
  }
}
