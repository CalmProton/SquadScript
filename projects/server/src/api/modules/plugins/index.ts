/**
 * @squadscript/server
 *
 * Plugins controller — /api/plugins/*
 *
 * @module
 */

import { Elysia, t } from 'elysia';

import type { PluginManager } from '../../../plugins/manager.js';
import { authGuard, checkAuth, checkRole } from '../../plugins/auth.js';

export function createPluginsModule(pluginManager: PluginManager | null) {
  return new Elysia({ prefix: '/plugins' })
    .use(authGuard)

    .get('/', ({ user, set }) => {
      const denied = checkAuth(user, set);
      if (denied) return denied;

      if (!pluginManager) {
        return { plugins: [] };
      }

      const loadedPlugins = pluginManager.getLoadedPlugins();

      const plugins = loadedPlugins.map((loaded) => {
        const running = pluginManager.isPluginRunning(loaded.meta.name);
        const instance = pluginManager.getPlugin(loaded.meta.name);

        return {
          name: loaded.meta.name,
          description: loaded.meta.description,
          version: loaded.meta.version,
          enabled: running,
          state: instance?.state ?? 'unloaded',
          author: loaded.meta.author ?? null,
          dependencies: loaded.meta.dependencies ?? [],
          options: instance
            ? Object.fromEntries(
                Object.entries(loaded.optionsSpec).map(([key, spec]) => [
                  key,
                  spec.default ?? null,
                ]),
              )
            : {},
          optionSpecs: Object.entries(loaded.optionsSpec).map(([name, spec]) => ({
            name,
            type: spec.type,
            description: spec.description,
            defaultValue: spec.default ?? null,
            required: spec.required,
            choices: spec.choices ?? null,
          })),
        };
      });

      return { plugins };
    })

    .get('/:name', ({ params: { name }, user, set }) => {
      const denied = checkAuth(user, set);
      if (denied) return denied;

      if (!pluginManager) {
        set.status = 404;
        return { error: 'Plugin system not initialized' };
      }

      const meta = pluginManager.getPluginMeta(name);
      if (!meta) {
        set.status = 404;
        return { error: 'Plugin not found' };
      }

      const loaded = pluginManager
        .getLoadedPlugins()
        .find((p) => p.meta.name === name);
      const instance = pluginManager.getPlugin(name);
      const running = pluginManager.isPluginRunning(name);

      return {
        name: meta.name,
        description: meta.description,
        version: meta.version,
        enabled: running,
        state: instance?.state ?? 'unloaded',
        author: meta.author ?? null,
        dependencies: meta.dependencies ?? [],
        options: loaded
          ? Object.fromEntries(
              Object.entries(loaded.optionsSpec).map(([key, spec]) => [
                key,
                spec.default ?? null,
              ]),
            )
          : {},
        optionSpecs: loaded
          ? Object.entries(loaded.optionsSpec).map(([name, spec]) => ({
              name,
              type: spec.type,
              description: spec.description,
              defaultValue: spec.default ?? null,
              required: spec.required,
              choices: spec.choices ?? null,
            }))
          : [],
        error: instance?.error?.message ?? null,
      };
    })

    .patch('/:name', ({ params: { name }, user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;

      if (!pluginManager) {
        set.status = 503;
        return { error: 'Plugin system not initialized' };
      }

      const meta = pluginManager.getPluginMeta(name);
      if (!meta) {
        set.status = 404;
        return { error: 'Plugin not found' };
      }

      // NOTE: Hot-reload of plugin options requires PluginManager extension.
      // For now, return current state.
      set.status = 501;
      return { error: 'Plugin configuration updates are not supported yet. Restart the server to apply plugin config changes.' };
    }, {
      body: t.Object({
        enabled: t.Optional(t.Boolean()),
        options: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
    });
}
