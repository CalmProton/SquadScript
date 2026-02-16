/**
 * @squadscript/server
 *
 * TypeBox validation models generated from Drizzle schema via drizzle-typebox.
 *
 * Each table gets:
 *   - `insertXxxSchema` — TypeBox schema for INSERT (create) payloads
 *   - `selectXxxSchema` — TypeBox schema for SELECT (read) responses
 *
 * Use `spread()` from `./utils` to pick individual columns for Elysia models.
 *
 * @module
 */

import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';

import {
  users,
  roles,
  auditLog,
  banHistory,
  metricsHistory,
  pluginState,
  notifications,
  eventLog,
} from './schema.js';

// ── Users ───────────────────────────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

// ── Roles ───────────────────────────────────────────────────────────────────

export const insertRoleSchema = createInsertSchema(roles);
export const selectRoleSchema = createSelectSchema(roles);

// ── Audit Log ───────────────────────────────────────────────────────────────

export const insertAuditLogSchema = createInsertSchema(auditLog);
export const selectAuditLogSchema = createSelectSchema(auditLog);

// ── Ban History ─────────────────────────────────────────────────────────────

export const insertBanHistorySchema = createInsertSchema(banHistory);
export const selectBanHistorySchema = createSelectSchema(banHistory);

// ── Metrics History ─────────────────────────────────────────────────────────

export const insertMetricsHistorySchema = createInsertSchema(metricsHistory);
export const selectMetricsHistorySchema = createSelectSchema(metricsHistory);

// ── Plugin State ────────────────────────────────────────────────────────────

export const insertPluginStateSchema = createInsertSchema(pluginState);
export const selectPluginStateSchema = createSelectSchema(pluginState);

// ── Notifications ───────────────────────────────────────────────────────────

export const insertNotificationSchema = createInsertSchema(notifications);
export const selectNotificationSchema = createSelectSchema(notifications);

// ── Event Log ───────────────────────────────────────────────────────────────

export const insertEventLogSchema = createInsertSchema(eventLog);
export const selectEventLogSchema = createSelectSchema(eventLog);
