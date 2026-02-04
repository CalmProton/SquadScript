/**
 * @squadscript/log-parser
 *
 * A high-performance, type-safe log parser for Squad game servers.
 * Supports local file tailing, FTP, and SFTP log sources.
 *
 * @example
 * ```typescript
 * import { LogParser, TailLogReader } from '@squadscript/log-parser';
 *
 * const reader = new TailLogReader('/path/to/SquadGame.log');
 * const parser = new LogParser({ reader });
 *
 * parser.on('PLAYER_CONNECTED', (event) => {
 *   console.log(`Player ${event.eosID} connected`);
 * });
 *
 * parser.on('PLAYER_DAMAGED', (event) => {
 *   console.log(`${event.attackerName} damaged ${event.victimName}`);
 * });
 *
 * const result = await parser.watch();
 * if (!result.ok) {
 *   console.error('Failed to start parser:', result.error);
 * }
 * ```
 */

// ============================================================================
// Error Types
// ============================================================================

export {
	LogParserError,
	LogReaderError,
	type LogParserErrorCode,
	type LogReaderErrorCode,
} from "./errors";

// ============================================================================
// Log Readers
// ============================================================================

export {
	createLogReader,
	FtpLogReader,
	SftpLogReader,
	TailLogReader,
	type FtpLogReaderOptions,
	type LogReader,
	type SftpLogReaderOptions,
	type TailLogReaderOptions,
} from "./readers";

// ============================================================================
// Parsing Rules
// ============================================================================

export {
	adminBroadcastRule,
	createLogRegex,
	defaultRules,
	defineRule,
	deployableDamagedRule,
	excludeRules,
	extendRules,
	filterRules,
	newGameRule,
	playerConnectedRule,
	playerDamagedRule,
	playerDiedRule,
	playerDisconnectedRule,
	playerJoinSucceededRule,
	playerPossessRule,
	playerRevivedRule,
	playerUnpossessRule,
	playerWoundedRule,
	roundEndedRule,
	roundTicketsRule,
	roundWinnerRule,
	serverTickRateRule,
	type ParsingRule,
} from "./rules";

// ============================================================================
// Queue
// ============================================================================

export {
	BoundedQueue,
	type BoundedQueueOptions,
	type QueueStats,
} from "./queue/bounded-queue";

// ============================================================================
// Event Store
// ============================================================================

export {
	EventStore,
	type CombatSession,
	type JoinRequest,
	type RoundResult,
	type StoredPlayer,
} from "./store";

// ============================================================================
// Events
// ============================================================================

export { TypedEventEmitter } from "./events";

// ============================================================================
// Utilities
// ============================================================================

export {
	formatLogTimestamp,
	parseChainID,
	parseLogTimestamp,
} from "./utils/date-parser";

export {
	capitalizeID,
	hasInvalidIDs,
	iterateIDs,
	parseOnlineIDs,
} from "./utils/id-parser";

export {
	CHAIN_ID,
	EOS_PLAYER_ID,
	LOG_PREFIX,
	ONLINE_IDS,
	PLAYER_CONTROLLER,
	PLAYER_NAME,
	SQUAD_ID,
	STEAM_ID,
	TEAM_ID,
} from "./utils/regex";

// ============================================================================
// Types
// ============================================================================

export type {
	InternalStats,
	LogParserEventMap,
	LogParserOptions,
	ParserStats,
} from "./types";

// ============================================================================
// Main Parser
// ============================================================================

export { LogParser } from "./parser";
