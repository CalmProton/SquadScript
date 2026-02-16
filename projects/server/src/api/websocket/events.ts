/**
 * @squadscript/server
 *
 * WebSocket event type definitions.
 *
 * @module
 */

import type { WSChannel, WSServerMessage, WSClientMessage } from '@squadscript/types';

export type { WSChannel, WSServerMessage, WSClientMessage };

/**
 * Internal broadcast payload for the event broadcaster.
 */
export interface BroadcastPayload {
  readonly channel: WSChannel;
  readonly event: string;
  readonly data: unknown;
}
