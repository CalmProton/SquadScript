/**
 * @squadscript/server
 *
 * Player module request/response models.
 *
 * @module
 */

import { t } from 'elysia';

export const PlayerModel = {
  warnBody: t.Object({
    message: t.String({ minLength: 1, maxLength: 500 }),
  }),
  kickBody: t.Object({
    reason: t.String({ minLength: 1, maxLength: 500 }),
  }),
  banBody: t.Object({
    duration: t.Number({ minimum: 0 }),
    reason: t.String({ minLength: 1, maxLength: 500 }),
  }),
  messageBody: t.Object({
    message: t.String({ minLength: 1, maxLength: 500 }),
  }),
};
