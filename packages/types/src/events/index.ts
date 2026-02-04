/**
 * @squadscript/types
 *
 * Events module - exports all event types and the event map.
 *
 * @module
 */

// Re-export base types
export { EventType, type BaseEvent } from './base.js';

// Re-export player events
export type {
  PlayerConnectedEvent,
  PlayerDisconnectedEvent,
  PlayerJoinSucceededEvent,
  PlayerPossessEvent,
  PlayerUnpossessEvent,
} from './player.js';

// Re-export combat events
export type {
  PlayerDamagedEvent,
  PlayerWoundedEvent,
  PlayerDiedEvent,
  PlayerRevivedEvent,
  DeployableDamagedEvent,
} from './combat.js';

// Re-export chat events
export type { ChatChannel, ChatMessageEvent, ChatCommandEvent } from './chat.js';
export { parseChatCommand } from './chat.js';

// Re-export game events
export type {
  NewGameEvent,
  RoundEndedEvent,
  RoundTicketsEvent,
  RoundWinnerEvent,
  ServerTickRateEvent,
} from './game.js';

// Re-export admin events
export type {
  AdminBroadcastEvent,
  AdminCameraEvent,
  PlayerKickedEvent,
  PlayerWarnedEvent,
  PlayerBannedEvent,
  SquadCreatedEvent,
} from './admin.js';

// Re-export RCON events
export type {
  RconConnectedEvent,
  RconDisconnectedEvent,
  RconErrorEvent,
} from './rcon.js';

// Import types for the event map
import type { EventType } from './base.js';
import type {
  PlayerConnectedEvent,
  PlayerDisconnectedEvent,
  PlayerJoinSucceededEvent,
  PlayerPossessEvent,
  PlayerUnpossessEvent,
} from './player.js';
import type {
  PlayerDamagedEvent,
  PlayerWoundedEvent,
  PlayerDiedEvent,
  PlayerRevivedEvent,
  DeployableDamagedEvent,
} from './combat.js';
import type { ChatMessageEvent, ChatCommandEvent } from './chat.js';
import type {
  NewGameEvent,
  RoundEndedEvent,
  RoundTicketsEvent,
  RoundWinnerEvent,
  ServerTickRateEvent,
} from './game.js';
import type {
  AdminBroadcastEvent,
  AdminCameraEvent,
  PlayerKickedEvent,
  PlayerWarnedEvent,
  PlayerBannedEvent,
  SquadCreatedEvent,
} from './admin.js';
import type {
  RconConnectedEvent,
  RconDisconnectedEvent,
  RconErrorEvent,
} from './rcon.js';

/**
 * Complete event map for type-safe event emission and handling.
 *
 * This interface maps event type strings to their corresponding
 * event data interfaces, enabling full type safety when emitting
 * and listening to events.
 *
 * @example
 * ```typescript
 * import type { SquadEventMap, EventType } from '@squadscript/types';
 *
 * // Type-safe event handling
 * function onPlayerDied(event: SquadEventMap[typeof EventType.PLAYER_DIED]) {
 *   console.log(`${event.victim.name} was killed by ${event.attacker?.name ?? 'unknown'}`);
 * }
 * ```
 */
export interface SquadEventMap {
  // Player lifecycle events
  [EventType.PLAYER_CONNECTED]: PlayerConnectedEvent;
  [EventType.PLAYER_DISCONNECTED]: PlayerDisconnectedEvent;
  [EventType.PLAYER_JOIN_SUCCEEDED]: PlayerJoinSucceededEvent;
  [EventType.PLAYER_POSSESS]: PlayerPossessEvent;
  [EventType.PLAYER_UNPOSSESS]: PlayerUnpossessEvent;

  // Combat events
  [EventType.PLAYER_DAMAGED]: PlayerDamagedEvent;
  [EventType.PLAYER_WOUNDED]: PlayerWoundedEvent;
  [EventType.PLAYER_DIED]: PlayerDiedEvent;
  [EventType.PLAYER_REVIVED]: PlayerRevivedEvent;
  [EventType.DEPLOYABLE_DAMAGED]: DeployableDamagedEvent;

  // Chat events
  [EventType.CHAT_MESSAGE]: ChatMessageEvent;
  [EventType.CHAT_COMMAND]: ChatCommandEvent;

  // Game events
  [EventType.NEW_GAME]: NewGameEvent;
  [EventType.ROUND_ENDED]: RoundEndedEvent;
  [EventType.ROUND_TICKETS]: RoundTicketsEvent;
  [EventType.ROUND_WINNER]: RoundWinnerEvent;
  [EventType.SERVER_TICK_RATE]: ServerTickRateEvent;

  // Squad events
  [EventType.SQUAD_CREATED]: SquadCreatedEvent;

  // Admin events
  [EventType.ADMIN_BROADCAST]: AdminBroadcastEvent;
  [EventType.ADMIN_CAMERA]: AdminCameraEvent;
  [EventType.PLAYER_KICKED]: PlayerKickedEvent;
  [EventType.PLAYER_WARNED]: PlayerWarnedEvent;
  [EventType.PLAYER_BANNED]: PlayerBannedEvent;

  // RCON events
  [EventType.RCON_CONNECTED]: RconConnectedEvent;
  [EventType.RCON_DISCONNECTED]: RconDisconnectedEvent;
  [EventType.RCON_ERROR]: RconErrorEvent;
}

/**
 * Utility type to get the event data type for a given event type.
 */
export type EventData<T extends EventType> = SquadEventMap[T];

/**
 * Event handler function type.
 */
export type EventHandler<T extends EventType> = (
  event: SquadEventMap[T],
) => void | Promise<void>;
