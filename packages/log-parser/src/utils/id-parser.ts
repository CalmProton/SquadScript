/**
 * @squadscript/log-parser
 *
 * ID parsing utilities for extracting platform IDs from log lines.
 *
 * Squad logs contain player identifiers in the format:
 * "Online IDs: EOS: abc123 steam: 76561198012345678"
 *
 * @module
 */

import {
  type EOSID,
  type SteamID,
  asSteamID,
  asEOSID,
} from '@squadscript/types';

// =============================================================================
// Types
// =============================================================================

/**
 * Parsed platform IDs from a log line.
 */
export interface ParsedIDs {
  /** Steam ID if present and valid. */
  readonly steamID: SteamID | null;

  /** Epic Online Services ID if present and valid. */
  readonly eosID: EOSID | null;
}

/**
 * A key-value pair from ID parsing.
 */
interface IDEntry {
  /** The platform name (e.g., "steam", "EOS"). */
  readonly platform: string;

  /** The ID value. */
  readonly id: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Pattern to match individual platform:id pairs.
 * Handles whitespace variations in Squad logs.
 */
const ID_MATCHER = /(?<platform>[^\s:]+)\s*:\s*(?<id>[^\s|)]+)/g;

// =============================================================================
// Functions
// =============================================================================

/**
 * Iterates over platform:id pairs in an Online IDs string.
 *
 * @param idsString - The Online IDs portion of a log line
 * @returns Generator yielding platform/id entries
 *
 * @example
 * ```typescript
 * const ids = " EOS: abc123def steam: 76561198012345678 ";
 * for (const entry of iterateIDs(ids)) {
 *   console.log(entry.platform, entry.id);
 * }
 * // Output:
 * // EOS abc123def
 * // steam 76561198012345678
 * ```
 */
export function* iterateIDs(idsString: string): Generator<IDEntry> {
  const regex = new RegExp(ID_MATCHER.source, ID_MATCHER.flags);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(idsString)) !== null) {
    if (match.groups) {
      yield {
        platform: match.groups.platform,
        id: match.groups.id,
      };
    }
  }
}

/**
 * Parses an Online IDs string into structured platform IDs.
 *
 * Validates IDs using branded type constructors to ensure
 * only valid IDs are returned.
 *
 * @param idsString - The Online IDs portion of a log line
 * @returns Parsed and validated IDs
 *
 * @example
 * ```typescript
 * const ids = parseOnlineIDs(" EOS: abc123def steam: 76561198012345678 ");
 * if (ids.steamID) {
 *   // ids.steamID is typed as SteamID
 * }
 * ```
 */
export function parseOnlineIDs(idsString: string): ParsedIDs {
  let steamID: SteamID | null = null;
  let eosID: EOSID | null = null;

  for (const entry of iterateIDs(idsString)) {
    const platformLower = entry.platform.toLowerCase();

    if (platformLower === 'steam') {
      const validated = asSteamID(entry.id);
      if (validated) {
        steamID = validated;
      }
    } else if (platformLower === 'eos') {
      const validated = asEOSID(entry.id);
      if (validated) {
        eosID = validated;
      }
    }
  }

  return { steamID, eosID };
}

/**
 * Checks if an Online IDs string contains INVALID markers.
 *
 * Squad logs may contain "INVALID" in place of real IDs when
 * the player's identity couldn't be resolved.
 *
 * @param idsString - The Online IDs portion of a log line
 * @returns True if any IDs are marked as invalid
 *
 * @example
 * ```typescript
 * if (hasInvalidIDs(idsString)) {
 *   // Skip processing this event
 *   return null;
 * }
 * ```
 */
export function hasInvalidIDs(idsString: string): boolean {
  return idsString.toUpperCase().includes('INVALID');
}

/**
 * Capitalizes a platform name for property keys.
 *
 * @param platform - The platform name (e.g., "steam", "EOS")
 * @returns Capitalized ID name (e.g., "SteamID", "EOSID")
 *
 * @example
 * ```typescript
 * capitalizeID('steam')  // 'SteamID'
 * capitalizeID('EOS')    // 'EOSID'
 * ```
 */
export function capitalizeID(platform: string): string {
  const lower = platform.toLowerCase();
  if (lower === 'eos') {
    return 'EOSID';
  }
  return platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase() + 'ID';
}

/**
 * Lowercases a platform name for property keys.
 *
 * @param platform - The platform name (e.g., "Steam", "EOS")
 * @returns Lowercase ID name (e.g., "steamID", "eosID")
 */
export function lowerID(platform: string): string {
  const lower = platform.toLowerCase();
  return lower + 'ID';
}
