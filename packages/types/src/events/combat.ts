/**
 * @squadscript/types
 *
 * Combat event types (damage, wounds, deaths, revives).
 *
 * Combat events use ChainID to correlate related events:
 * A single attack can generate PLAYER_DAMAGED -> PLAYER_WOUNDED -> PLAYER_DIED
 * events, all sharing the same ChainID.
 *
 * @module
 */

import type { BaseEvent } from './base.js';
import type { Player } from '../player.js';
import type { ChainID } from '../branded.js';

/**
 * Emitted when a player takes damage.
 *
 * This event fires for all damage, including non-lethal damage.
 * Use `teamkill` to detect friendly fire.
 */
export interface PlayerDamagedEvent extends BaseEvent {
  /** Chain ID to correlate with wound/death events. */
  readonly chainID: ChainID;

  /** The player who dealt the damage (null for environmental damage). */
  readonly attacker: Player | null;

  /** The player who received the damage. */
  readonly victim: Player;

  /** The weapon used to deal damage. */
  readonly weapon: string;

  /** The amount of damage dealt. */
  readonly damage: number;

  /** Whether this was friendly fire. */
  readonly teamkill: boolean;
}

/**
 * Emitted when a player is wounded (downed but not dead).
 *
 * Wounded players can be revived before they give up or bleed out.
 */
export interface PlayerWoundedEvent extends BaseEvent {
  /** Chain ID to correlate with damage/death events. */
  readonly chainID: ChainID;

  /** The player who dealt the wounding damage (null for environmental). */
  readonly attacker: Player | null;

  /** The player who was wounded. */
  readonly victim: Player;

  /** The weapon that caused the wound. */
  readonly weapon: string;

  /** The wounding damage amount. */
  readonly damage: number;

  /** Whether this was friendly fire. */
  readonly teamkill: boolean;

  /** The attacker's controller at time of attack. */
  readonly attackerController: string | null;
}

/**
 * Emitted when a player dies (gives up or bleeds out).
 */
export interface PlayerDiedEvent extends BaseEvent {
  /** Chain ID to correlate with damage/wound events. */
  readonly chainID: ChainID;

  /** The player who dealt the killing damage (null for suicide/environmental). */
  readonly attacker: Player | null;

  /** The player who died. */
  readonly victim: Player;

  /** The weapon that caused the death. */
  readonly weapon: string | null;

  /** The damage that caused death. */
  readonly damage: number;

  /** Whether this was a suicide. */
  readonly suicide: boolean;
}

/**
 * Emitted when a player is revived by a medic.
 */
export interface PlayerRevivedEvent extends BaseEvent {
  /** The player who was revived. */
  readonly victim: Player;

  /** The player who performed the revive. */
  readonly reviver: Player;

  /** The reviver's controller at time of revive. */
  readonly reviverController: string;

  /** The victim's controller. */
  readonly victimController: string;
}

/**
 * Emitted when a deployable (FOB, HAB, etc.) takes damage.
 */
export interface DeployableDamagedEvent extends BaseEvent {
  /** The deployable that was damaged. */
  readonly deployable: string;

  /** The weapon used. */
  readonly weapon: string;

  /** The damage dealt. */
  readonly damage: number;

  /** The player who dealt the damage (if known). */
  readonly attacker: Player | null;
}
