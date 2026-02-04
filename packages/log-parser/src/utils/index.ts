/**
 * @squadscript/log-parser
 *
 * Utility exports for log parsing.
 *
 * @module
 */

export {
  type ParsedIDs,
  iterateIDs,
  parseOnlineIDs,
  hasInvalidIDs,
  capitalizeID,
  lowerID,
} from './id-parser.js';

export {
  parseLogTimestamp,
  parseChainID,
  formatLogTimestamp,
  timestampDifference,
} from './date-parser.js';

export {
  LOG_PREFIX,
  PLAYER_CONTROLLER,
  ONLINE_IDS,
  PLAYER_NAME,
  WEAPON_CLASS,
  DAMAGE_VALUE,
  LAYER_CLASSNAME,
  IP_ADDRESS,
  CHAIN_ID,
  EOS_PLAYER_ID,
  SQUAD_ID,
  STEAM_ID,
  TEAM_ID,
  escapeRegex,
  alternation,
  optional,
  namedGroup,
  compilePattern,
} from './regex.js';
