/**
 * @squadscript/server
 *
 * Auth controller — /api/auth/*
 *
 * @module
 */

import { Elysia } from 'elysia';

import type { DrizzleDB } from '../../../db/index.js';
import { AuthService } from './service.js';
import { AuthModel } from './model.js';
import { authGuard, checkAuth } from '../../plugins/auth.js';

export function createAuthModule(db: DrizzleDB) {
  return new Elysia({ prefix: '/auth' })
    .post('/login', async ({ body, set }) => {
      const { username, password } = body as { username: string; password: string };
      const result = await AuthService.authenticate(db, username, password);

      if (!result) {
        set.status = 401;
        return { error: 'Invalid username or password' };
      }

      return {
        token: result.token,
        expiresAt: result.expiresAt,
        user: {
          id: result.user.id,
          username: result.user.username,
          role: result.user.role,
          createdAt: new Date().toISOString(),
        },
      };
    }, {
      body: AuthModel.loginBody,
    })

    .use(authGuard)

    .post('/refresh', ({ user, set }) => {
      const denied = checkAuth(user, set);
      if (denied) return denied;

      const token = AuthService.signJWT({
        id: user!.id,
        username: user!.username,
        role: user!.role,
      });
      const payload = AuthService.verifyJWT(token)!;

      return {
        token,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        user: {
          id: user!.id,
          username: user!.username,
          role: user!.role,
          createdAt: new Date().toISOString(),
        },
      };
    })

    .post('/logout', ({ user, set }) => {
      const denied = checkAuth(user, set);
      if (denied) return denied;
      return { ok: true };
    });
}
