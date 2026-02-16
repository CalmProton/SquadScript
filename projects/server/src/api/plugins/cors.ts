/**
 * @squadscript/server
 *
 * CORS plugin for ElysiaJS.
 *
 * @module
 */

import { Elysia } from 'elysia';

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',');

export const corsPlugin = new Elysia({ name: 'CORS.Plugin' })
  .onRequest(({ set, request }) => {
    const origin = request.headers.get('origin');

    if (origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*'))) {
      set.headers['access-control-allow-origin'] = origin;
    } else {
      set.headers['access-control-allow-origin'] = ALLOWED_ORIGINS[0] ?? '*';
    }

    set.headers['access-control-allow-methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
    set.headers['access-control-allow-headers'] = 'Content-Type, Authorization';
    set.headers['access-control-allow-credentials'] = 'true';
    set.headers['access-control-max-age'] = '86400';

    // Handle preflight
    if (request.method === 'OPTIONS') {
      set.status = 204;
      return '';
    }

    return undefined;
  });
