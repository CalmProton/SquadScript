/**
 * @squadscript/server
 *
 * Database schema definitions using Drizzle ORM pgTable.
 *
 * @module
 */

import {
  pgTable,
  text,
  serial,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

// =============================================================================
// Dashboard Users
// =============================================================================

/**
 * Dashboard users (NOT game server admins — those come from Admins.cfg).
 * These are users who can log into the web dashboard.
 */
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull().default('viewer'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// =============================================================================
// Roles and Permissions
// =============================================================================

/**
 * Role definitions with associated permissions.
 */
export const roles = pgTable('roles', {
  name: text('name').primaryKey(),
  permissions: jsonb('permissions').notNull().default([]),
});

// =============================================================================
// Audit Log
// =============================================================================

/**
 * Audit log for all admin actions performed through the dashboard.
 */
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  action: text('action').notNull(),
  target: text('target'),
  details: jsonb('details'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_audit_log_created_at').on(table.createdAt),
  index('idx_audit_log_action').on(table.action),
]);

// =============================================================================
// Ban History
// =============================================================================

/**
 * Ban history persisted beyond in-memory state.
 */
export const banHistory = pgTable('ban_history', {
  id: serial('id').primaryKey(),
  steamId: text('steam_id'),
  eosId: text('eos_id'),
  name: text('name'),
  reason: text('reason').notNull(),
  duration: integer('duration').notNull(),
  adminId: text('admin_id').references(() => users.id),
  adminName: text('admin_name'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
}, (table) => [
  index('idx_ban_history_steam_id').on(table.steamId),
  index('idx_ban_history_eos_id').on(table.eosId),
]);

// =============================================================================
// Metrics History
// =============================================================================

/**
 * Server metrics snapshots for historical graphs.
 */
export const metricsHistory = pgTable('metrics_history', {
  id: serial('id').primaryKey(),
  playerCount: integer('player_count').notNull(),
  tickRate: real('tick_rate'),
  cpuPercent: real('cpu_percent'),
  memoryMb: real('memory_mb'),
  publicQueue: integer('public_queue').default(0),
  reserveQueue: integer('reserve_queue').default(0),
  sampledAt: timestamp('sampled_at').notNull().defaultNow(),
}, (table) => [
  index('idx_metrics_sampled_at').on(table.sampledAt),
]);

// =============================================================================
// Plugin State
// =============================================================================

/**
 * Plugin persistent state (enabled/disabled, options).
 */
export const pluginState = pgTable('plugin_state', {
  pluginName: text('plugin_name').primaryKey(),
  enabled: boolean('enabled').notNull().default(true),
  options: jsonb('options'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// =============================================================================
// Notifications
// =============================================================================

/**
 * Notification history for the dashboard.
 */
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(),
  severity: text('severity').notNull().default('info'),
  title: text('title').notNull(),
  message: text('message'),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_notifications_read').on(table.read),
]);

// =============================================================================
// Event Log
// =============================================================================

/**
 * Event log for the server logs view.
 */
export const eventLog = pgTable('event_log', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(),
  message: text('message').notNull(),
  player: text('player'),
  playerEos: text('player_eos'),
  details: jsonb('details'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_event_log_type').on(table.type),
  index('idx_event_log_created_at').on(table.createdAt),
  index('idx_event_log_player_eos').on(table.playerEos),
]);
