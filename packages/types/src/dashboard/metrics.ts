/**
 * @squadscript/types
 *
 * Metrics snapshot types.
 *
 * @module
 */

/**
 * In-memory metrics snapshot collected at regular intervals.
 */
export interface MetricsDataPoint {
  readonly playerCount: number;
  readonly tickRate: number | null;
  readonly cpuPercent: number | null;
  readonly memoryMb: number;
  readonly publicQueue: number;
  readonly reserveQueue: number;
  readonly uptime: number;
  readonly timestamp: Date;
}
