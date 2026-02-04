/**
 * @squadscript/log-parser
 *
 * Rule registry and exports.
 *
 * @module
 */

import type { ParsingRule } from './base.js';
import { playerConnectedRule } from './player-connected.js';
import { playerDisconnectedRule } from './player-disconnected.js';
import { playerJoinSucceededRule } from './player-join-succeeded.js';
import { playerPossessRule } from './player-possess.js';
import { playerUnpossessRule } from './player-unpossess.js';
import { playerDamagedRule } from './player-damaged.js';
import { playerWoundedRule } from './player-wounded.js';
import { playerDiedRule } from './player-died.js';
import { playerRevivedRule } from './player-revived.js';
import { newGameRule } from './new-game.js';
import { roundWinnerRule } from './round-winner.js';
import { roundEndedRule } from './round-ended.js';
import { roundTicketsRule } from './round-tickets.js';
import { adminBroadcastRule } from './admin-broadcast.js';
import { serverTickRateRule } from './server-tick-rate.js';
import { deployableDamagedRule } from './deployable-damaged.js';

// Re-export base types
export {
  type ParsingRule,
  type ParseContext,
  defineRule,
  createLogRegex,
  LOG_LINE_PREFIX,
  ONLINE_IDS_PATTERN,
  CONTROLLER_PATTERN,
  WEAPON_PATTERN,
  DAMAGE_PATTERN,
  IP_PATTERN,
} from './base.js';

// Re-export individual rules for custom configurations
export { playerConnectedRule } from './player-connected.js';
export { playerDisconnectedRule } from './player-disconnected.js';
export { playerJoinSucceededRule } from './player-join-succeeded.js';
export { playerPossessRule } from './player-possess.js';
export { playerUnpossessRule } from './player-unpossess.js';
export { playerDamagedRule } from './player-damaged.js';
export { playerWoundedRule } from './player-wounded.js';
export { playerDiedRule } from './player-died.js';
export { playerRevivedRule } from './player-revived.js';
export { newGameRule } from './new-game.js';
export { roundWinnerRule } from './round-winner.js';
export { roundEndedRule } from './round-ended.js';
export { roundTicketsRule } from './round-tickets.js';
export { adminBroadcastRule } from './admin-broadcast.js';
export { serverTickRateRule } from './server-tick-rate.js';
export { deployableDamagedRule } from './deployable-damaged.js';

/**
 * All built-in parsing rules in evaluation order.
 *
 * Rules are ordered so that more specific patterns are matched first.
 * Combat events are ordered: damage -> wound -> die -> revive.
 * Game events are ordered to ensure proper correlation.
 */
export const defaultRules: readonly ParsingRule[] = Object.freeze([
  // ==========================================================================
  // Connection Events
  // ==========================================================================
  playerConnectedRule,
  playerJoinSucceededRule,
  playerDisconnectedRule,

  // ==========================================================================
  // Possession Events
  // ==========================================================================
  playerPossessRule,
  playerUnpossessRule,

  // ==========================================================================
  // Combat Events (order matters for correlation)
  // ==========================================================================
  playerDamagedRule,
  playerWoundedRule,
  playerDiedRule,
  playerRevivedRule,

  // ==========================================================================
  // Deployable Events
  // ==========================================================================
  deployableDamagedRule,

  // ==========================================================================
  // Game Events
  // ==========================================================================
  roundWinnerRule,
  roundTicketsRule,
  roundEndedRule,
  newGameRule,

  // ==========================================================================
  // Server Events
  // ==========================================================================
  serverTickRateRule,

  // ==========================================================================
  // Admin Events
  // ==========================================================================
  adminBroadcastRule,
]);

/**
 * Creates a custom rule set with additional rules prepended.
 *
 * Additional rules are evaluated before default rules, allowing
 * custom rules to override or extend default behavior.
 *
 * @param additionalRules - Rules to add before defaults
 * @returns Combined rule set
 *
 * @example
 * ```typescript
 * const customRule = defineRule({
 *   name: 'my-custom-rule',
 *   eventName: 'CUSTOM_EVENT',
 *   regex: /...\,
 *   parse: (match, context) => { ... },
 * });
 *
 * const rules = extendRules([customRule]);
 * ```
 */
export function extendRules(additionalRules: readonly ParsingRule[]): ParsingRule[] {
  return [...additionalRules, ...defaultRules];
}

/**
 * Creates a filtered rule set from default rules.
 *
 * @param predicate - Filter function
 * @returns Filtered rules
 *
 * @example
 * ```typescript
 * // Only combat rules
 * const combatRules = filterRules((rule) =>
 *   rule.eventName.includes('DAMAGE') ||
 *   rule.eventName.includes('WOUND') ||
 *   rule.eventName.includes('DIE')
 * );
 * ```
 */
export function filterRules(
  predicate: (rule: ParsingRule) => boolean,
): ParsingRule[] {
  return defaultRules.filter(predicate);
}

/**
 * Creates a rule set excluding specific rules by name.
 *
 * @param rulesToExclude - Names of rules to exclude
 * @returns Filtered rules
 *
 * @example
 * ```typescript
 * // Exclude tick rate spam
 * const rules = excludeRules(['server-tick-rate']);
 * ```
 */
export function excludeRules(rulesToExclude: readonly string[]): ParsingRule[] {
  const excludeSet = new Set(rulesToExclude);
  return defaultRules.filter((rule) => !excludeSet.has(rule.name));
}
