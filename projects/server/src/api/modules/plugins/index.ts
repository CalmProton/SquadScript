/**
 * @squadscript/server
 *
 * Plugins controller — /api/plugins/*
 *
 * @module
 */

import { Elysia, t } from 'elysia';

import type { SquadServer } from '../../../server.js';
import { authGuard, checkAuth, checkRole } from '../../plugins/auth.js';

export function createPluginsModule(_squadServer: SquadServer) {
  // TODO: use _squadServer once PluginManager API is integrated
  return new Elysia({ prefix: '/plugins' })
    .use(authGuard)

    .get('/', ({ user, set }) => {
      const denied = checkAuth(user, set);
      if (denied) return denied;
      // Return basic plugin list. Real implementation depends on PluginManager API.
      return { plugins: [] };
    })

    .get('/:name', ({ params: { name: _name }, user, set }) => {
      const denied = checkAuth(user, set);
      if (denied) return denied;
      // Placeholder — will be fleshed out with PluginManager integration
      set.status = 404;
      return { error: 'Plugin not found' };
    })

    .patch('/:name', ({ params: { name: _name }, user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;
      // Placeholder — update plugin config
      set.status = 501;
      return { error: 'Not implemented yet' };
    }, {
      body: t.Object({
        enabled: t.Optional(t.Boolean()),
        options: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
    });
}
