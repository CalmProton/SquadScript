/**
 * @squadscript/server
 *
 * Metrics repository for storing and querying performance snapshots.
 *
 * @module
 */

import { desc, gte, lte, and, lt } from 'drizzle-orm';

import type { DrizzleDB } from '../index.js';
import { metricsHistory } from '../schema.js';

export class MetricsRepository {
  constructor(private readonly db: DrizzleDB) {}

  async insert(data: {
    playerCount: number;
    tickRate: number | null;
    cpuPercent: number | null;
    memoryMb: number | null;
    publicQueue: number;
    reserveQueue: number;
  }) {
    const results = await this.db.insert(metricsHistory).values({
      playerCount: data.playerCount,
      tickRate: data.tickRate,
      cpuPercent: data.cpuPercent,
      memoryMb: data.memoryMb,
      publicQueue: data.publicQueue,
      reserveQueue: data.reserveQueue,
    }).returning();
    return results[0]!;
  }

  async query(options: {
    from?: Date;
    to?: Date;
    limit?: number;
  } = {}) {
    const conditions = [];

    if (options.from) {
      conditions.push(gte(metricsHistory.sampledAt, options.from));
    }
    if (options.to) {
      conditions.push(lte(metricsHistory.sampledAt, options.to));
    }

    return this.db
      .select()
      .from(metricsHistory)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(metricsHistory.sampledAt))
      .limit(options.limit ?? 1000);
  }

  /**
   * Delete metrics older than the given date (retention cleanup).
   */
  async deleteOlderThan(date: Date) {
    return this.db
      .delete(metricsHistory)
      .where(lt(metricsHistory.sampledAt, date));
  }
}
