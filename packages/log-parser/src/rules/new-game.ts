/**
 * @squadscript/log-parser
 *
 * Rule: New Game
 *
 * Matches when a new game/match starts.
 *
 * Log format:
 * [timestamp][chainID]LogWorld: Bringing World /Game/Maps/MapName/LayerName.LayerName
 *
 * @module
 */

import type { NewGameEvent } from '@squadscript/types';
import { defineRule, createLogRegex } from './base.js';
import { parseLogTimestamp } from '../utils/date-parser.js';

/**
 * Rule for NEW_GAME events.
 */
export const newGameRule = defineRule<NewGameEvent>({
  name: 'new-game',
  eventName: 'NEW_GAME',

  regex: createLogRegex(
    String.raw`LogWorld: Bringing World \/([A-Za-z0-9]+)\/(?:Maps\/)?([A-Za-z0-9-]+)\/(?:.+\/)?([A-Za-z0-9-]+)(?:\.[A-Za-z0-9-]+)`,
  ),

  parse(match, context) {
    const [raw, timestamp, , _dlc, mapClassname, layerClassname] = match;

    // Ensure required groups matched
    if (!timestamp || !mapClassname || !layerClassname) {
      context.logger.warn('new-game', 'Missing required fields in new game event');
      return null;
    }

    // Skip transition maps
    if (layerClassname === 'TransitionMap') {
      return null;
    }

    const time = parseLogTimestamp(timestamp);
    if (!time) {
      context.logger.warn('new-game', 'Failed to parse timestamp in new game event');
      return null;
    }

    // Get round result from previous match (if any) - currently unused
    // const _roundResult = context.store.getRoundResult();

    // Clear event store for new game
    context.store.clearOnMapChange();
    context.store.clearRoundResult();

    // Determine if this is the first game
    // (Would require tracking in store, for now always false)
    const isFirstGame = false;

    return Object.freeze({
      time,
      raw,
      layer: null, // Will be resolved by SquadServer
      level: mapClassname,
      layerName: layerClassname,
      isFirstGame,
    });
  },
});
