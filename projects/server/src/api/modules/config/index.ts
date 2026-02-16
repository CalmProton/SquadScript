/**
 * @squadscript/server
 *
 * Config controller — /api/config/*
 *
 * Provides read/write access to Squad game server configuration
 * (server name, settings, map rotation).
 *
 * @module
 */

import { Elysia, t } from 'elysia';
import { readFile, writeFile } from 'node:fs/promises';

import { authGuard, checkRole } from '../../plugins/auth.js';

/** Path to the Squad server configuration directory. */
const SQUAD_CONFIG_DIR = process.env.SQUAD_CONFIG_DIR ?? '/squad/SquadGame/ServerConfig';
const SERVER_CFG_PATH = `${SQUAD_CONFIG_DIR}/Server.cfg`;
const MAP_ROTATION_PATH = `${SQUAD_CONFIG_DIR}/MapRotation.cfg`;

/**
 * Parses a Squad Server.cfg file into key-value pairs.
 *
 * Server.cfg format:
 * ```
 * ServerName="My Server"
 * MaxPlayers=80
 * // Comment
 * ```
 */
function parseServerCfg(content: string): Record<string, string> {
  const settings: Record<string, string> = {};

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//') || line.startsWith('#')) continue;

    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();

    // Strip surrounding quotes
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    settings[key] = value;
  }

  return settings;
}

/**
 * Serializes settings back to Server.cfg format.
 */
function serializeServerCfg(settings: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(settings)) {
    const strValue = String(value);
    // Quote values that contain spaces
    lines.push(strValue.includes(' ') ? `${key}="${strValue}"` : `${key}=${strValue}`);
  }

  return `${lines.join('\n')}\n`;
}

/**
 * Parses a MapRotation.cfg file into an array of layer names.
 */
function parseMapRotation(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//') && !line.startsWith('#'));
}

export function createConfigModule() {
  return new Elysia({ prefix: '/config' })
    .use(authGuard)

    .get('/server', async ({ user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;

      try {
        const content = await readFile(SERVER_CFG_PATH, 'utf-8');
        const settings = parseServerCfg(content);
        return {
          name: settings.ServerName ?? 'Unknown',
          settings,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        set.status = 500;
        return { error: `Failed to read server config: ${message}` };
      }
    })

    .put('/server', async ({ body, user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;

      try {
        // Read existing config to merge
        let existing: Record<string, string> = {};
        try {
          const content = await readFile(SERVER_CFG_PATH, 'utf-8');
          existing = parseServerCfg(content);
        } catch {
          // File doesn't exist yet, start fresh
        }

        const merged = { ...existing };
        if (body.name) merged.ServerName = body.name;
        if (body.settings) Object.assign(merged, body.settings);

        await writeFile(SERVER_CFG_PATH, serializeServerCfg(merged), 'utf-8');
        return { ok: true, name: merged.ServerName ?? 'Unknown', settings: merged };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        set.status = 500;
        return { error: `Failed to write server config: ${message}` };
      }
    }, {
      body: t.Object({
        name: t.Optional(t.String()),
        settings: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
    })

    .get('/rotation', async ({ user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;

      try {
        const content = await readFile(MAP_ROTATION_PATH, 'utf-8');
        const layers = parseMapRotation(content);
        return { layers };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        set.status = 500;
        return { error: `Failed to read map rotation: ${message}` };
      }
    })

    .put('/rotation', async ({ body, user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;

      try {
        const content = body.layers.join('\n') + '\n';
        await writeFile(MAP_ROTATION_PATH, content, 'utf-8');
        return { ok: true, layers: body.layers };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        set.status = 500;
        return { error: `Failed to write map rotation: ${message}` };
      }
    }, {
      body: t.Object({
        layers: t.Array(t.String()),
      }),
    });
}
