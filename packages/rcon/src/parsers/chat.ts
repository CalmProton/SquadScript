/**
 * @squadscript/rcon
 *
 * Chat packet parsing for RCON events.
 *
 * Parses unsolicited chat/admin packets from the server into
 * strongly-typed event objects.
 *
 * @module
 */

import {
  type SteamID,
  type EOSID,
  asSteamID,
  asEOSID,
  asSquadID,
  asPlayerID,
} from '@squadscript/types';
import { ChatChannel, type ChatChannel as ChatChannelType } from '../constants.js';
import type {
  RconChatMessageEvent,
  RconAdminCamPossessedEvent,
  RconAdminCamUnpossessedEvent,
  RconPlayerWarnedEvent,
  RconPlayerKickedEvent,
  RconPlayerBannedEvent,
  RconSquadCreatedEvent,
  RconEventType,
} from '../types.js';

// =============================================================================
// Pre-compiled Regex Patterns
// =============================================================================

/**
 * Pre-compiled regex patterns for chat packet parsing.
 *
 * These are compiled once at module load time for performance.
 * Each pattern is carefully crafted to match Squad's RCON output format.
 */
const Patterns = {
  /**
   * Chat message pattern.
   * Example: [ChatAll] [Online IDs:EOS: abc123 steam: 76561198012345678] PlayerName : Hello world
   */
  CHAT_MESSAGE:
    /^\[(ChatAll|ChatTeam|ChatSquad|ChatAdmin)\] \[Online IDs:([^\]]+)\] (.+?) : (.*)$/,

  /**
   * Admin camera possessed pattern.
   * Example: [Online Ids:EOS: abc123 steam: 76561198012345678] AdminName has possessed admin camera.
   */
  ADMIN_CAM_POSSESSED:
    /^\[Online Ids:([^\]]+)\] (.+) has possessed admin camera\.$/,

  /**
   * Admin camera unpossessed pattern.
   * Example: [Online IDs:EOS: abc123 steam: 76561198012345678] AdminName has unpossessed admin camera.
   */
  ADMIN_CAM_UNPOSSESSED:
    /^\[Online IDs:([^\]]+)\] (.+) has unpossessed admin camera\.$/,

  /**
   * Player warned pattern.
   * Example: Remote admin has warned player PlayerName. Message was "Stop teamkilling"
   */
  PLAYER_WARNED:
    /^Remote admin has warned player (.+)\. Message was "(.+)"$/,

  /**
   * Player kicked pattern.
   * Example: Kicked player 5. [Online IDs=EOS: abc123 steam: 76561198012345678] PlayerName
   */
  PLAYER_KICKED:
    /^Kicked player (\d+)\. \[Online IDs=([^\]]+)\] (.+)$/,

  /**
   * Player banned pattern.
   * Example: Banned player 5. [Online IDs=EOS: abc123 steam: 76561198012345678] PlayerName for interval 1d
   */
  PLAYER_BANNED:
    /^Banned player (\d+)\. \[Online IDs=([^\]]+)\] (.+) for interval (.+)$/,

  /**
   * Squad created pattern.
   * Example: PlayerName (Online IDs:EOS: abc123 steam: 76561198012345678) has created Squad 5 (Squad Name: Infantry) on US Army
   */
  SQUAD_CREATED:
    /^(.+) \(Online IDs:([^)]+)\) has created Squad (\d+) \(Squad Name: (.+)\) on (.+)$/,
} as const;

// =============================================================================
// ID Parsing
// =============================================================================

/**
 * Parsed online IDs from RCON.
 */
interface ParsedOnlineIDs {
  steamID: SteamID | null;
  eosID: EOSID;
}

/**
 * Parses online IDs from the format: "EOS: abc123 steam: 76561198012345678"
 *
 * Squad sends player IDs in various formats, this function handles:
 * - "EOS: <eosid> steam: <steamid>"
 * - "EOS: <eosid>"
 * - Spaces and case variations
 *
 * @param idsString - The raw IDs string from the packet
 * @returns Parsed Steam and EOS IDs
 */
function parseOnlineIDs(idsString: string): ParsedOnlineIDs {
  let steamID: SteamID | null = null;
  let eosID: EOSID = '' as EOSID; // Will be set below

  // Normalize: trim and handle various spacing
  const normalized = idsString.trim();

  // Match Steam ID (17 digits)
  const steamMatch = normalized.match(/steam:\s*(\d{17})/i);
  if (steamMatch && steamMatch[1]) {
    steamID = asSteamID(steamMatch[1]);
  }

  // Match EOS ID (32 hex characters)
  const eosMatch = normalized.match(/EOS:\s*([0-9a-f]{32})/i);
  if (eosMatch && eosMatch[1]) {
    const parsed = asEOSID(eosMatch[1]);
    if (parsed) {
      eosID = parsed;
    }
  }

  return { steamID, eosID };
}

// =============================================================================
// Chat Channel Parsing
// =============================================================================

/**
 * Parses a chat channel string to the enum value.
 *
 * @param channel - Raw channel string like "ChatAll"
 * @returns The ChatChannel enum value
 */
function parseChatChannel(channel: string): ChatChannelType {
  switch (channel) {
    case 'ChatAll':
      return ChatChannel.ALL;
    case 'ChatTeam':
      return ChatChannel.TEAM;
    case 'ChatSquad':
      return ChatChannel.SQUAD;
    case 'ChatAdmin':
      return ChatChannel.ADMIN;
    default:
      // Default to ALL for unknown channels
      return ChatChannel.ALL;
  }
}

// =============================================================================
// Parsed Event Result
// =============================================================================

/**
 * Result of parsing a chat packet.
 */
export interface ParsedChatEvent<T extends RconEventType = RconEventType> {
  /** The event type. */
  readonly type: T;

  /** The parsed event data. */
  readonly event: T extends 'CHAT_MESSAGE'
    ? RconChatMessageEvent
    : T extends 'ADMIN_CAM_ENTERED'
      ? RconAdminCamPossessedEvent
      : T extends 'ADMIN_CAM_EXITED'
        ? RconAdminCamUnpossessedEvent
        : T extends 'PLAYER_WARNED'
          ? RconPlayerWarnedEvent
          : T extends 'PLAYER_KICKED'
            ? RconPlayerKickedEvent
            : T extends 'PLAYER_BANNED'
              ? RconPlayerBannedEvent
              : T extends 'SQUAD_CREATED'
                ? RconSquadCreatedEvent
                : never;
}

// =============================================================================
// Parser Functions
// =============================================================================

/**
 * Attempts to parse a chat packet body into a typed event.
 *
 * This function tries all known patterns and returns the first match.
 * If no pattern matches, returns null.
 *
 * @param body - The raw packet body
 * @returns Parsed event or null if not recognized
 *
 * @example
 * ```typescript
 * const result = parseChatPacket('[ChatAll] [Online IDs:EOS: abc123] Player : Hello');
 * if (result) {
 *   console.log(result.type); // 'CHAT_MESSAGE'
 *   console.log(result.event.message); // 'Hello'
 * }
 * ```
 */
export function parseChatPacket(body: string): ParsedChatEvent | null {
  const timestamp = new Date();

  // Try chat message
  const chatMatch = body.match(Patterns.CHAT_MESSAGE);
  if (chatMatch) {
    const [, channel, idsString, playerName, message] = chatMatch;
    if (!channel || !idsString || !playerName) return null;

    const { steamID, eosID } = parseOnlineIDs(idsString);

    const event: RconChatMessageEvent = {
      raw: body,
      timestamp,
      steamID,
      eosID,
      channel: parseChatChannel(channel),
      playerName,
      message: message ?? '',
    };

    return { type: 'CHAT_MESSAGE', event } as ParsedChatEvent<'CHAT_MESSAGE'>;
  }

  // Try admin cam possessed
  const possessMatch = body.match(Patterns.ADMIN_CAM_POSSESSED);
  if (possessMatch) {
    const [, idsString, playerName] = possessMatch;
    if (!idsString || !playerName) return null;

    const { steamID, eosID } = parseOnlineIDs(idsString);

    const event: RconAdminCamPossessedEvent = {
      raw: body,
      timestamp,
      steamID,
      eosID,
      playerName,
    };

    return { type: 'ADMIN_CAM_ENTERED', event } as ParsedChatEvent<'ADMIN_CAM_ENTERED'>;
  }

  // Try admin cam unpossessed
  const unpossessMatch = body.match(Patterns.ADMIN_CAM_UNPOSSESSED);
  if (unpossessMatch) {
    const [, idsString, playerName] = unpossessMatch;
    if (!idsString || !playerName) return null;

    const { steamID, eosID } = parseOnlineIDs(idsString);

    const event: RconAdminCamUnpossessedEvent = {
      raw: body,
      timestamp,
      steamID,
      eosID,
      playerName,
    };

    return { type: 'ADMIN_CAM_EXITED', event } as ParsedChatEvent<'ADMIN_CAM_EXITED'>;
  }

  // Try player warned
  const warnMatch = body.match(Patterns.PLAYER_WARNED);
  if (warnMatch) {
    const [, playerName, reason] = warnMatch;
    if (!playerName || !reason) return null;

    const event: RconPlayerWarnedEvent = {
      raw: body,
      timestamp,
      playerName,
      reason,
    };

    return { type: 'PLAYER_WARNED', event } as ParsedChatEvent<'PLAYER_WARNED'>;
  }

  // Try player kicked
  const kickMatch = body.match(Patterns.PLAYER_KICKED);
  if (kickMatch) {
    const [, playerIDStr, idsString, playerName] = kickMatch;
    if (!playerIDStr || !idsString || !playerName) return null;

    const { steamID, eosID } = parseOnlineIDs(idsString);
    const playerID = asPlayerID(parseInt(playerIDStr, 10));

    if (!playerID) return null;

    const event: RconPlayerKickedEvent = {
      raw: body,
      timestamp,
      steamID,
      eosID,
      playerID,
      playerName,
    };

    return { type: 'PLAYER_KICKED', event } as ParsedChatEvent<'PLAYER_KICKED'>;
  }

  // Try player banned
  const banMatch = body.match(Patterns.PLAYER_BANNED);
  if (banMatch) {
    const [, playerIDStr, idsString, playerName, interval] = banMatch;
    if (!playerIDStr || !idsString || !playerName || !interval) return null;

    const { steamID, eosID } = parseOnlineIDs(idsString);
    const playerID = asPlayerID(parseInt(playerIDStr, 10));

    if (!playerID) return null;

    const event: RconPlayerBannedEvent = {
      raw: body,
      timestamp,
      steamID,
      eosID,
      playerID,
      playerName,
      interval,
    };

    return { type: 'PLAYER_BANNED', event } as ParsedChatEvent<'PLAYER_BANNED'>;
  }

  // Try squad created
  const squadMatch = body.match(Patterns.SQUAD_CREATED);
  if (squadMatch) {
    const [, playerName, idsString, squadIDStr, squadName, teamName] = squadMatch;
    if (!playerName || !idsString || !squadIDStr || !squadName || !teamName) return null;

    const { steamID, eosID } = parseOnlineIDs(idsString);
    const squadID = asSquadID(parseInt(squadIDStr, 10));

    if (!squadID) return null;

    const event: RconSquadCreatedEvent = {
      raw: body,
      timestamp,
      steamID,
      eosID,
      playerName,
      squadID,
      squadName,
      teamName,
    };

    return { type: 'SQUAD_CREATED', event } as ParsedChatEvent<'SQUAD_CREATED'>;
  }

  // No pattern matched
  return null;
}

/**
 * Checks if a packet body looks like a chat/event packet.
 *
 * This is a quick check that can be used before the more expensive
 * full parsing.
 *
 * @param body - The packet body to check
 * @returns True if this might be a chat/event packet
 */
export function mightBeChatPacket(body: string): boolean {
  // Quick check for common prefixes
  return (
    body.startsWith('[Chat') ||
    body.startsWith('[Online') ||
    body.startsWith('Remote admin') ||
    body.startsWith('Kicked player') ||
    body.startsWith('Banned player') ||
    body.includes('has created Squad')
  );
}
