/**
 * @squadscript/server
 *
 * Auth module request/response models.
 * Uses drizzle-typebox schemas for validation aligned with the DB schema.
 *
 * @module
 */

import { t } from 'elysia';

import { insertUserSchema } from '../../../db/models.js';
import { spread } from '../../../db/utils.js';

export const AuthModel = {
  loginBody: t.Object(spread(insertUserSchema, ['username', 'password'])),
};
