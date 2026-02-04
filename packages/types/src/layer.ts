/**
 * @squadscript/types
 *
 * Layer and map domain types.
 *
 * @module
 */

/**
 * Game modes available in Squad.
 */
export type GameMode =
  | 'AAS' // Advance and Secure
  | 'RAAS' // Random Advance and Secure
  | 'Invasion'
  | 'Insurgency'
  | 'Destruction'
  | 'Skirmish'
  | 'TC' // Territory Control
  | 'Training'
  | 'Seed' // Seeding
  | 'Track' // Track Attack
  | string; // Allow for future modes

/**
 * Represents a layer (map + game mode combination).
 */
export interface Layer {
  /** Full layer name as used by the game. */
  readonly name: string;

  /** The map/level this layer is on. */
  readonly level: string;

  /** The game mode. */
  readonly gameMode: GameMode;

  /** Layer version (e.g., 'v1', 'v2'). */
  readonly version: string | null;

  /** Team 1 faction. */
  readonly team1Faction: string | null;

  /** Team 2 faction. */
  readonly team2Faction: string | null;

  /** Whether this is a night layer. */
  readonly isNight: boolean;

  /** Layer size classification. */
  readonly size: 'small' | 'medium' | 'large' | null;
}

/**
 * Current and next layer information.
 */
export interface LayerState {
  /** Currently playing layer. */
  readonly current: Layer | null;

  /** Next layer in rotation. */
  readonly next: Layer | null;

  /** Layer history (most recent first). */
  readonly history: readonly Layer[];
}

/**
 * Raw layer strings from RCON.
 */
export interface RconLayerInfo {
  /** Current level name. */
  level: string;

  /** Current layer name. */
  layer: string;
}

/**
 * Parses a layer name into its components.
 *
 * @param layerName - The full layer name (e.g., 'Narva_AAS_v2')
 * @returns Parsed layer information or null if unparseable
 */
export function parseLayerName(layerName: string): Partial<Layer> | null {
  if (!layerName || layerName === 'Unknown') {
    return null;
  }

  // Common layer name patterns:
  // MapName_GameMode_v1
  // MapName_GameMode_v1_Night
  // MapName_Faction1vsFaction2_GameMode_v1

  const parts = layerName.split('_');
  if (parts.length < 2) {
    return { name: layerName, level: layerName };
  }

  const level = parts[0] ?? layerName;
  const isNight = layerName.toLowerCase().includes('night');

  // Extract version
  const versionMatch = layerName.match(/_v(\d+)/i);
  const version = versionMatch ? `v${versionMatch[1]}` : null;

  // Try to extract game mode
  const gameModes: GameMode[] = [
    'RAAS',
    'AAS',
    'Invasion',
    'Insurgency',
    'Destruction',
    'Skirmish',
    'TC',
    'Training',
    'Seed',
    'Track',
  ];

  let gameMode: GameMode | null = null;
  for (const mode of gameModes) {
    if (layerName.toUpperCase().includes(mode.toUpperCase())) {
      gameMode = mode;
      break;
    }
  }

  return {
    name: layerName,
    level,
    gameMode: gameMode ?? 'Unknown',
    version,
    isNight,
    team1Faction: null,
    team2Faction: null,
    size: null,
  };
}

/**
 * Creates a Layer object from raw RCON info.
 */
export function createLayerFromRcon(info: RconLayerInfo): Layer {
  const parsed = parseLayerName(info.layer);

  return {
    name: info.layer,
    level: info.level,
    gameMode: parsed?.gameMode ?? 'Unknown',
    version: parsed?.version ?? null,
    team1Faction: null,
    team2Faction: null,
    isNight: parsed?.isNight ?? false,
    size: null,
  };
}

/**
 * Creates an empty layer state.
 */
export function createEmptyLayerState(): LayerState {
  return {
    current: null,
    next: null,
    history: [],
  };
}
