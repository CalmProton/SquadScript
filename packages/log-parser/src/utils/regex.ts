/**
 * @squadscript/log-parser
 *
 * Shared regex patterns and utilities for log parsing.
 *
 * @module
 */

// =============================================================================
// Common Log Patterns
// =============================================================================

/**
 * Common prefix for all Squad log lines.
 *
 * Captures:
 * - [1] Timestamp (YYYY.MM.DD-HH.MM.SS:mmm)
 * - [2] Chain ID (may have leading spaces)
 *
 * @example
 * ```typescript
 * const line = "[2024.01.15-12.30.45:123][ 42]LogSquad: Something happened";
 * const match = LOG_PREFIX.exec(line);
 * // match[1] = "2024.01.15-12.30.45:123"
 * // match[2] = " 42"
 * ```
 */
export const LOG_PREFIX = /^\[(\d{4}\.\d{2}\.\d{2}-\d{2}\.\d{2}\.\d{2}:\d{3})\]\[([ \d]+)\]/;

/**
 * Pattern for player controller identifiers.
 *
 * @example "BP_PlayerController_C_2147482581"
 */
export const PLAYER_CONTROLLER = /(?:BP_)?PlayerController(?:|.+)_C_\d+/;

/**
 * Pattern for Online IDs portion of log lines.
 *
 * Captures the entire Online IDs string including platform:id pairs.
 */
export const ONLINE_IDS = /Online IDs:([^)|]+)/;

/**
 * Pattern for player names in logs.
 *
 * Player names can contain most characters except control characters.
 * Uses non-greedy matching to avoid capturing too much.
 */
export const PLAYER_NAME = /.+?/;

/**
 * Pattern for weapon/item class names.
 *
 * @example "BP_Weapon_AK74_C", "SQVehicleSeatComponent_C"
 */
export const WEAPON_CLASS = /[A-Za-z0-9_-]+_C/;

/**
 * Pattern for damage values (may be negative or have decimals).
 */
export const DAMAGE_VALUE = /-?\d+(?:\.\d+)?/;

/**
 * Pattern for layer class names.
 *
 * @example "Narva_AAS_v2"
 */
export const LAYER_CLASSNAME = /[A-Za-z0-9_-]+/;

/**
 * Pattern for IP addresses (IPv4).
 */
export const IP_ADDRESS = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Escapes special regex characters in a string.
 *
 * @param str - String to escape
 * @returns Escaped string safe for use in RegExp
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates a regex that matches any of the given strings.
 *
 * @param options - Strings to match
 * @returns Regex pattern
 */
export function alternation(options: readonly string[]): string {
  return `(?:${options.map(escapeRegex).join('|')})`;
}

/**
 * Makes a regex pattern optional (non-capturing group with ?).
 *
 * @param pattern - Pattern to make optional
 * @returns Optional pattern
 */
export function optional(pattern: string): string {
  return `(?:${pattern})?`;
}

/**
 * Creates a named capturing group.
 *
 * @param name - Group name
 * @param pattern - Pattern to capture
 * @returns Named group pattern
 */
export function namedGroup(name: string, pattern: string): string {
  return `(?<${name}>${pattern})`;
}

/**
 * Compiles a regex pattern with pre-validation.
 *
 * @param pattern - Pattern string or RegExp
 * @param flags - Optional flags
 * @returns Compiled RegExp
 * @throws Error if pattern is invalid
 */
export function compilePattern(
  pattern: string | RegExp,
  flags?: string,
): RegExp {
  if (pattern instanceof RegExp) {
    return pattern;
  }

  try {
    return new RegExp(pattern, flags);
  } catch (error) {
    throw new Error(
      `Invalid regex pattern: ${pattern}`,
      { cause: error },
    );
  }
}

// =============================================================================
// Additional ID Patterns
// =============================================================================

/**
 * Pattern for Chain ID (numeric, may have leading spaces).
 */
export const CHAIN_ID = /[ \d]+/;

/**
 * Pattern for EOS Player ID (32 hex characters).
 */
export const EOS_PLAYER_ID = /[0-9a-f]{32}/i;

/**
 * Pattern for Squad ID (numeric).
 */
export const SQUAD_ID = /\d+/;

/**
 * Pattern for Steam ID (17 digits).
 */
export const STEAM_ID = /\d{17}/;

/**
 * Pattern for Team ID (1 or 2).
 */
export const TEAM_ID = /[12]/
