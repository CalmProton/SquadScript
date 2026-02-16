/**
 * @squadscript/server
 *
 * Audit log repository for tracking admin actions.
 *
 * @module
 */

import { desc, and, eq, gte, lte } from 'drizzle-orm';

import type { DrizzleDB } from '../index.js';
import { auditLog } from '../schema.js';

export class AuditRepository {
  constructor(private readonly db: DrizzleDB) {}

  async insert(data: {
    userId: string | null;
    action: string;
    target?: string | null;
    details?: Record<string, unknown> | null;
  }) {
    const results = await this.db.insert(auditLog).values({
      userId: data.userId,
      action: data.action,
      target: data.target ?? null,
      details: data.details ?? null,
    }).returning();
    return results[0]!;
  }

  async query(options: {
    action?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  } = {}) {
    const conditions = [];

    if (options.action) {
      conditions.push(eq(auditLog.action, options.action));
    }
    if (options.from) {
      conditions.push(gte(auditLog.createdAt, options.from));
    }
    if (options.to) {
      conditions.push(lte(auditLog.createdAt, options.to));
    }

    const query = this.db
      .select()
      .from(auditLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLog.createdAt))
      .limit(options.limit ?? 50)
      .offset(options.offset ?? 0);

    return query;
  }
}
