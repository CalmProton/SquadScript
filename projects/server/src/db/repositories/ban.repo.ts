/**
 * @squadscript/server
 *
 * Ban history repository.
 *
 * @module
 */

import { desc, eq, or, and, gte, lte } from 'drizzle-orm';

import type { DrizzleDB } from '../index.js';
import { banHistory } from '../schema.js';

export class BanRepository {
  constructor(private readonly db: DrizzleDB) {}

  async insert(data: {
    steamId?: string | null;
    eosId?: string | null;
    name?: string | null;
    reason: string;
    duration: number;
    adminId?: string | null;
    adminName?: string | null;
    expiresAt?: Date | null;
  }) {
    const results = await this.db.insert(banHistory).values({
      steamId: data.steamId ?? null,
      eosId: data.eosId ?? null,
      name: data.name ?? null,
      reason: data.reason,
      duration: data.duration,
      adminId: data.adminId ?? null,
      adminName: data.adminName ?? null,
      expiresAt: data.expiresAt ?? null,
    }).returning();
    return results[0]!;
  }

  async findByPlayer(identifier: string) {
    return this.db
      .select()
      .from(banHistory)
      .where(or(eq(banHistory.steamId, identifier), eq(banHistory.eosId, identifier)))
      .orderBy(desc(banHistory.createdAt));
  }

  async query(options: {
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  } = {}) {
    const conditions = [];

    if (options.from) {
      conditions.push(gte(banHistory.createdAt, options.from));
    }
    if (options.to) {
      conditions.push(lte(banHistory.createdAt, options.to));
    }

    return this.db
      .select()
      .from(banHistory)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(banHistory.createdAt))
      .limit(options.limit ?? 50)
      .offset(options.offset ?? 0);
  }
}
