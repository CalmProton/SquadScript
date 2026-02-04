/**
 * @squadscript/log-parser
 *
 * Base types and utilities for parsing rules.
 *
 * Each parsing rule defines a regex pattern and a function to convert
 * a match into a typed event object.
 *
 * @module
 */

import type { Logger } from '@squadscript/logger';
import type { EventStore } from '../store/event-store.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Context passed to rule parse functions.
 *
 * Provides access to the event store for correlation and the logger
 * for debugging.
 */
export interface ParseContext {
  /** Event store for correlating related events. */
  readonly store: EventStore;

  /** Logger for debugging and errors. */
  readonly logger: Logger;
}

/**
 * A parsing rule that matches log lines and produces events.
 *
 * Rules are evaluated in order against each log line. The first
 * matching rule handles the line.
 *
 * @typeParam T - The event type this rule produces
 */
export interface ParsingRule<T = unknown> {
  /**
   * Unique name for this rule (used in logs and debugging).
   */
  readonly name: string;

  /**
   * The event type name this rule produces.
   */
  readonly eventName: string;

  /**
   * Regex pattern to match log lines.
   *
   * Should be pre-compiled for performance. The pattern should
   * match the entire log line including timestamp prefix.
   */
  readonly regex: RegExp;

  /**
   * Parses a regex match into an event object.
   *
   * @param match - The regex match array
   * @param context - Parse context with store and logger
   * @returns The event object, or null to skip this line
   */
  parse(match: RegExpExecArray, context: ParseContext): T | null;
}

// =============================================================================
// Rule Definition Helper
// =============================================================================

/**
 * Helper to define a type-safe parsing rule.
 *
 * Ensures the regex is pre-compiled and validates the rule structure.
 *
 * @param rule - The rule definition
 * @returns The validated rule
 *
 * @example
 * ```typescript
 * const myRule = defineRule({
 *   name: 'player-connected',
 *   eventName: 'PLAYER_CONNECTED',
 *   regex: /^\[([0-9.:-]+)]\[([ 0-9]*)]LogSquad: Player connected/,
 *   parse: (match, context) => {
 *     return {
 *       time: parseLogTimestamp(match[1]),
 *       raw: match[0],
 *       // ... event data
 *     };
 *   },
 * });
 * ```
 */
export function defineRule<T>(rule: ParsingRule<T>): ParsingRule<T> {
  // Ensure regex is valid and has no global flag (which can cause issues)
  if (rule.regex.global) {
    // Create non-global version
    const newRegex = new RegExp(rule.regex.source, rule.regex.flags.replace('g', ''));
    return {
      ...rule,
      regex: newRegex,
    };
  }

  return rule;
}

// =============================================================================
// Common Regex Patterns
// =============================================================================

/**
 * Common prefix for all Squad log lines.
 *
 * Captures:
 * - [1] Timestamp (YYYY.MM.DD-HH.MM.SS:mmm)
 * - [2] Chain ID (may have leading spaces)
 *
 * @example "[2024.01.15-12.30.45:123][ 42]"
 */
export const LOG_LINE_PREFIX = String.raw`\[(\d{4}\.\d{2}\.\d{2}-\d{2}\.\d{2}\.\d{2}:\d{3})\]\[([ \d]+)\]`;

/**
 * Pattern for Online IDs in log lines.
 * Captures the full Online IDs string.
 */
export const ONLINE_IDS_PATTERN = String.raw`Online IDs:([^)|]+)`;

/**
 * Pattern for player controller IDs.
 */
export const CONTROLLER_PATTERN = String.raw`(?:BP_)?PlayerController(?:|.+)_C_\d+`;

/**
 * Pattern for weapon class names.
 */
export const WEAPON_PATTERN = String.raw`[A-Za-z0-9_-]+`;

/**
 * Pattern for damage values (may be negative, may have decimals).
 */
export const DAMAGE_PATTERN = String.raw`-?\d+(?:\.\d+)?`;

/**
 * Pattern for IP addresses.
 */
export const IP_PATTERN = String.raw`\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}`;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Creates a complete log line regex by prepending the standard prefix.
 *
 * @param pattern - The pattern after the log prefix
 * @returns Complete regex with timestamp and chain ID capture groups
 */
export function createLogRegex(pattern: string): RegExp {
  return new RegExp(`^${LOG_LINE_PREFIX}${pattern}`);
}
