/**
 * @squadscript/server
 *
 * Event log repository for querying server logs.
 *
 * @module
 */

import { desc, eq, and, gte, lte, or, ilike } from 'drizzle-orm';

import type { DrizzleDB } from '../index.js';
import { eventLog } from '../schema.js';

export class EventLogRepository {
  constructor(private readonly db: DrizzleDB) {}

  async insert(data: {
    type: string;
    message: string;
    player?: string | null;
    playerEos?: string | null;
    details?: Record<string, unknown> | null;
  }) {
    const results = await this.db.insert(eventLog).values({
      type: data.type,
      message: data.message,
      player: data.player ?? null,
      playerEos: data.playerEos ?? null,
      details: data.details ?? null,
    }).returning();
    return results[0]!;
  }

  async query(options: {
    type?: string;
    player?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  } = {}) {
    const conditions = [];

    if (options.type) {
      conditions.push(eq(eventLog.type, options.type));
    }
    if (options.player) {
      conditions.push(
        or(
          eq(eventLog.playerEos, options.player),
          ilike(eventLog.player, `%${options.player}%`),
        )!,
      );
    }
    if (options.from) {
      conditions.push(gte(eventLog.createdAt, options.from));
    }
    if (options.to) {
      conditions.push(lte(eventLog.createdAt, options.to));
    }

    return this.db
      .select()
      .from(eventLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(eventLog.createdAt))
      .limit(options.limit ?? 50)
      .offset(options.offset ?? 0);
  }

  async countByFilter(options: {
    type?: string;
    player?: string;
    from?: Date;
    to?: Date;
  } = {}) {
    const conditions = [];

    if (options.type) {
      conditions.push(eq(eventLog.type, options.type));
    }
    if (options.player) {
      conditions.push(
        or(
          eq(eventLog.playerEos, options.player),
          ilike(eventLog.player, `%${options.player}%`),
        )!,
      );
    }
    if (options.from) {
      conditions.push(gte(eventLog.createdAt, options.from));
    }
    if (options.to) {
      conditions.push(lte(eventLog.createdAt, options.to));
    }

    const results = await this.db
      .select()
      .from(eventLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return results.length;
  }
}
