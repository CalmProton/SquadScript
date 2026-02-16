/**
 * @squadscript/server
 *
 * Notifications controller — /api/notifications/*
 *
 * @module
 */

import { Elysia } from 'elysia';

import type { DrizzleDB } from '../../../db/index.js';
import { NotificationRepository } from '../../../db/repositories/notification.repo.js';
import { authGuard, checkAuth } from '../../plugins/auth.js';

export function createNotificationsModule(db: DrizzleDB) {
  return new Elysia({ prefix: '/notifications' })
    .use(authGuard)

    .get('/', async ({ user, set }) => {
      const denied = checkAuth(user, set);
      if (denied) return denied;
      const repo = new NotificationRepository(db);
      const data = await repo.findAll({ limit: 50 });

      return data.map((n) => ({
        id: n.id,
        type: n.type,
        severity: n.severity,
        title: n.title,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      }));
    })

    .post('/:id/read', async ({ params: { id }, user, set }) => {
      const denied = checkAuth(user, set);
      if (denied) return denied;
      const repo = new NotificationRepository(db);
      await repo.markAsRead(Number(id));
      return { ok: true };
    })

    .post('/read-all', async ({ user, set }) => {
      const denied = checkAuth(user, set);
      if (denied) return denied;
      const repo = new NotificationRepository(db);
      await repo.markAllAsRead();
      return { ok: true };
    });
}
