/**
 * @squadscript/server
 *
 * User repository for dashboard user CRUD operations.
 *
 * @module
 */

import { eq } from 'drizzle-orm';

import type { DrizzleDB } from '../index.js';
import { users } from '../schema.js';

export class UserRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findAll() {
    return this.db.select().from(users);
  }

  async findById(id: string) {
    const results = await this.db.select().from(users).where(eq(users.id, id));
    return results[0] ?? null;
  }

  async findByUsername(username: string) {
    const results = await this.db.select().from(users).where(eq(users.username, username));
    return results[0] ?? null;
  }

  async create(data: { username: string; password: string; role: string }) {
    const results = await this.db.insert(users).values(data).returning();
    return results[0]!;
  }

  async update(id: string, data: Partial<{ password: string; role: string }>) {
    const results = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return results[0] ?? null;
  }

  async delete(id: string) {
    const results = await this.db.delete(users).where(eq(users.id, id)).returning();
    return results[0] ?? null;
  }

  async count() {
    const results = await this.db.select().from(users);
    return results.length;
  }
}
