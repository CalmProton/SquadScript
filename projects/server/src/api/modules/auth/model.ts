/**
 * @squadscript/server
 *
 * Auth module request/response models.
 *
 * @module
 */

import { t } from 'elysia';

export const AuthModel = {
  loginBody: t.Object({
    username: t.String({ minLength: 1 }),
    password: t.String({ minLength: 1 }),
  }),
};
