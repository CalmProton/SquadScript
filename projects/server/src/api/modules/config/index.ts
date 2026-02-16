/**
 * @squadscript/server
 *
 * Config controller — /api/config/*
 *
 * @module
 */

import { Elysia, t } from 'elysia';

import { authGuard, checkRole } from '../../plugins/auth.js';

export function createConfigModule() {
  return new Elysia({ prefix: '/config' })
    .use(authGuard)

    .get('/server', ({ user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;
      // Placeholder — reads server configuration
      set.status = 501;
      return { error: 'Not implemented yet' };
    })

    .put('/server', ({ user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;
      set.status = 501;
      return { error: 'Not implemented yet' };
    }, {
      body: t.Object({
        name: t.Optional(t.String()),
        settings: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
    })

    .get('/rotation', ({ user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;
      set.status = 501;
      return { error: 'Not implemented yet' };
    })

    .put('/rotation', ({ user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;
      set.status = 501;
      return { error: 'Not implemented yet' };
    }, {
      body: t.Object({
        layers: t.Array(t.String()),
      }),
    });
}
