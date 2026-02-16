/**
 * @squadscript/server
 *
 * CORS plugin for ElysiaJS — uses @elysiajs/cors.
 *
 * @module
 */

import { cors } from '@elysiajs/cors';

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',');

export const corsPlugin = cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
});
