/**
 * @squadscript/types
 *
 * Branded types for type-safe ID handling.
 *
 * Branded types prevent accidentally mixing different ID types at compile time.
 * For example, you cannot pass a SteamID where an EOSID is expected.
 *
 * @example
 * ```typescript
 * import { type SteamID, asSteamID } from '@squadscript/types';
 *
 * const steamId = asSteamID('76561198012345678');
 * if (steamId) {
 *   // steamId is now typed as SteamID
 *   console.log(steamId);
 * }
 * ```
 *
 * @module
 */

declare const __brand: unique symbol;

/**
 * Utility type for creating branded/nominal types.
 * The brand is erased at runtime but enforced at compile time.
 */
type Brand<T, B> = T & { readonly [__brand]: B };

// =============================================================================
// Player Identification Types
// =============================================================================

/**
 * A 17-digit Steam ID.
 * @example '76561198012345678'
 */
export type SteamID = Brand<string, 'SteamID'>;

/**
 * A 32-character hexadecimal Epic Online Services ID.
 * @example '0002a10186d9414496bf20d22d3860ba'
 */
export type EOSID = Brand<string, 'EOSID'>;

/**
 * In-game player ID assigned by the server (0-100).
 * Player ID 0 is typically reserved for the server/console.
 */
export type PlayerID = Brand<number, 'PlayerID'>;

/**
 * Player controller identifier used in game logs.
 * @example 'BP_PlayerController_C_2147482581'
 */
export type PlayerController = Brand<string, 'PlayerController'>;

// =============================================================================
// Team/Squad Identification Types
// =============================================================================

/**
 * Team identifier (always 1 or 2 in Squad).
 */
export type TeamID = Brand<1 | 2, 'TeamID'>;

/**
 * Squad number within a team.
 */
export type SquadID = Brand<number, 'SquadID'>;

// =============================================================================
// Combat Event Types
// =============================================================================

/**
 * Chain ID used to correlate damage -> wound -> death events.
 * Multiple events with the same ChainID belong to the same damage chain.
 */
export type ChainID = Brand<number, 'ChainID'>;

// =============================================================================
// Validation and Construction Functions
// =============================================================================

/** Regular expression pattern for validating Steam IDs (17 digits). */
const STEAM_ID_PATTERN = /^[0-9]{17}$/;

/** Regular expression pattern for validating EOS IDs (32 hex characters). */
const EOS_ID_PATTERN = /^[0-9a-f]{32}$/i;

/**
 * Validates and converts a string to a SteamID.
 *
 * @param value - The string to validate
 * @returns The branded SteamID if valid, null otherwise
 *
 * @example
 * ```typescript
 * const steamId = asSteamID('76561198012345678');
 * if (steamId === null) {
 *   console.error('Invalid Steam ID');
 * }
 * ```
 */
export function asSteamID(value: string): SteamID | null {
  return STEAM_ID_PATTERN.test(value) ? (value as SteamID) : null;
}

/**
 * Validates and converts a string to an EOSID.
 *
 * @param value - The string to validate
 * @returns The branded EOSID if valid, null otherwise
 *
 * @example
 * ```typescript
 * const eosId = asEOSID('0002a10186d9414496bf20d22d3860ba');
 * if (eosId === null) {
 *   console.error('Invalid EOS ID');
 * }
 * ```
 */
export function asEOSID(value: string): EOSID | null {
  return EOS_ID_PATTERN.test(value) ? (value.toLowerCase() as EOSID) : null;
}

/**
 * Validates and converts a number to a PlayerID.
 *
 * @param value - The number to validate
 * @returns The branded PlayerID if valid (0-100), null otherwise
 *
 * @example
 * ```typescript
 * const playerId = asPlayerID(42);
 * if (playerId === null) {
 *   console.error('Invalid player ID');
 * }
 * ```
 */
export function asPlayerID(value: number): PlayerID | null {
  return Number.isInteger(value) && value >= 0 && value <= 100
    ? (value as PlayerID)
    : null;
}

/**
 * Validates and converts a number to a TeamID.
 *
 * @param value - The number to validate
 * @returns The branded TeamID if 1 or 2, null otherwise
 */
export function asTeamID(value: number): TeamID | null {
  return value === 1 || value === 2 ? (value as TeamID) : null;
}

/**
 * Validates and converts a number to a SquadID.
 *
 * @param value - The number to validate
 * @returns The branded SquadID if valid positive integer, null otherwise
 */
export function asSquadID(value: number): SquadID | null {
  return Number.isInteger(value) && value > 0 ? (value as SquadID) : null;
}

/**
 * Validates and converts a string to a PlayerController.
 *
 * @param value - The string to validate
 * @returns The branded PlayerController if valid, null otherwise
 */
export function asPlayerController(value: string): PlayerController | null {
  // Player controller format: BP_PlayerController_C_<number>
  return value.startsWith('BP_PlayerController_C_')
    ? (value as PlayerController)
    : null;
}

/**
 * Validates and converts a number to a ChainID.
 *
 * @param value - The number to validate
 * @returns The branded ChainID if valid non-negative integer, null otherwise
 */
export function asChainID(value: number): ChainID | null {
  return Number.isInteger(value) && value >= 0 ? (value as ChainID) : null;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value is a valid SteamID string.
 */
export function isSteamIDString(value: string): boolean {
  return STEAM_ID_PATTERN.test(value);
}

/**
 * Type guard to check if a value is a valid EOSID string.
 */
export function isEOSIDString(value: string): boolean {
  return EOS_ID_PATTERN.test(value);
}
