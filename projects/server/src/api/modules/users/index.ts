/**
 * @squadscript/server
 *
 * Users controller — /api/users/* & /api/roles/*
 *
 * @module
 */

import { Elysia, t } from 'elysia';

import type { DrizzleDB } from '../../../db/index.js';
import { UserRepository } from '../../../db/repositories/user.repo.js';
import { AuthService } from '../auth/service.js';
import { authGuard, checkRole } from '../../plugins/auth.js';

export function createUsersModule(db: DrizzleDB) {
  return new Elysia()
    .use(authGuard)

    // User CRUD
    .get('/users', async ({ user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;
      const repo = new UserRepository(db);
      const allUsers = await repo.findAll();
      return allUsers.map((u: { id: string; username: string; role: string; createdAt: Date }) => ({
        id: u.id,
        username: u.username,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
      }));
    })

    .post('/users', async ({ body, user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;
      const repo = new UserRepository(db);

      const existing = await repo.findByUsername(body.username);
      if (existing) {
        set.status = 409;
        return { error: 'Username already exists' };
      }

      const hash = await AuthService.hashPassword(body.password);
      const created = await repo.create({
        username: body.username,
        password: hash,
        role: body.role,
      });

      return {
        id: created.id,
        username: created.username,
        role: created.role,
        createdAt: created.createdAt.toISOString(),
      };
    }, {
      body: t.Object({
        username: t.String({ minLength: 1 }),
        password: t.String({ minLength: 6 }),
        role: t.String({ minLength: 1 }),
      }),
    })

    .patch('/users/:id', async ({ params: { id }, body, user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;
      const repo = new UserRepository(db);

      const updateData: Partial<{ password: string; role: string }> = {};
      if (body.password) {
        updateData.password = await AuthService.hashPassword(body.password);
      }
      if (body.role) {
        updateData.role = body.role;
      }

      const updated = await repo.update(id, updateData);
      if (!updated) {
        set.status = 404;
        return { error: 'User not found' };
      }

      return {
        id: updated.id,
        username: updated.username,
        role: updated.role,
        createdAt: updated.createdAt.toISOString(),
      };
    }, {
      body: t.Object({
        password: t.Optional(t.String({ minLength: 6 })),
        role: t.Optional(t.String({ minLength: 1 })),
      }),
    })

    .delete('/users/:id', async ({ params: { id }, user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;
      const repo = new UserRepository(db);
      const deleted = await repo.delete(id);

      if (!deleted) {
        set.status = 404;
        return { error: 'User not found' };
      }

      return { ok: true };
    });
}
