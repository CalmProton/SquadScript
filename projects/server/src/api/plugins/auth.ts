/**
 * @squadscript/server
 *
 * Auth guard plugin for ElysiaJS — resolves JWT user via derive().
 * Uses @elysiajs/bearer to extract the Bearer token from the Authorization header.
 *
 * Usage: `.use(authGuard)` adds `user: JWTPayload | null` to handler context.
 *
 * @module
 */

import { Elysia } from 'elysia';
import { bearer } from '@elysiajs/bearer';

import { AuthService, type JWTPayload } from '../modules/auth/service.js';

/**
 * Elysia plugin that resolves the JWT user from the Authorization header.
 * Adds `user: JWTPayload | null` to all handler contexts.
 *
 * Uses functional plugin pattern so TypeScript propagates the derived
 * `user` property through `.use(authGuard)` chains.
 */
export const authGuard = (app: Elysia) =>
  app.use(bearer()).derive(({ bearer }) => {
    const user: JWTPayload | null = bearer ? AuthService.verifyJWT(bearer) : null;
    return { user };
  });

/** Elysia `set` bag — status may be a number or HTTP status string. */
type ElysiaSet = { status?: number | string };

/**
 * Returns an error response if user is not authenticated.
 * Use at the start of handlers that require auth.
 */
export function checkAuth(user: JWTPayload | null, set: ElysiaSet): { error: string } | null {
  if (!user) {
    set.status = 401;
    return { error: 'Authentication required' };
  }
  return null;
}

/**
 * Returns an error response if user doesn't have the required role.
 */
export function checkRole(user: JWTPayload | null, role: string, set: ElysiaSet): { error: string } | null {
  if (!user) {
    set.status = 401;
    return { error: 'Authentication required' };
  }
  if (user.role !== role && user.role !== 'admin') {
    set.status = 403;
    return { error: 'Insufficient permissions' };
  }
  return null;
}
