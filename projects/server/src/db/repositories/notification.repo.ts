/**
 * @squadscript/server
 *
 * Notification repository.
 *
 * @module
 */

import { desc, eq, and } from 'drizzle-orm';

import type { DrizzleDB } from '../index.js';
import { notifications } from '../schema.js';

export class NotificationRepository {
  constructor(private readonly db: DrizzleDB) {}

  async insert(data: {
    type: string;
    severity: string;
    title: string;
    message?: string | null;
  }) {
    const results = await this.db.insert(notifications).values({
      type: data.type,
      severity: data.severity,
      title: data.title,
      message: data.message ?? null,
    }).returning();
    return results[0]!;
  }

  async findAll(options: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}) {
    const conditions = [];

    if (options.unreadOnly) {
      conditions.push(eq(notifications.read, false));
    }

    return this.db
      .select()
      .from(notifications)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(notifications.createdAt))
      .limit(options.limit ?? 50)
      .offset(options.offset ?? 0);
  }

  async markAsRead(id: number) {
    return this.db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id))
      .returning();
  }

  async markAllAsRead() {
    return this.db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.read, false));
  }
}
