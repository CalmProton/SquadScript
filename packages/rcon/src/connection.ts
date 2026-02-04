/**
 * @squadscript/rcon
 *
 * Low-level socket connection manager.
 *
 * Handles TCP socket management, automatic reconnection with
 * exponential backoff, and raw packet transmission.
 *
 * @module
 */

import { Socket } from 'net';
import type { ModuleLogger } from '@squadscript/logger';
import {
  ConnectionState,
} from './constants.js';
import type { ResolvedRconConfig } from './types.js';
import { ConnectionError } from './errors.js';
import { TypedEventEmitter } from './events/emitter.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Connection events.
 */
interface ConnectionEventMap {
  /** TCP connection established. */
  socket_connected: void;

  /** Socket received data. */
  data: Buffer;

  /** Socket closed. */
  closed: { hadError: boolean };

  /** Socket error. */
  error: Error;

  /** Reconnection starting. */
  reconnecting: { attempt: number; delay: number };

  /** Max reconnect attempts reached. */
  reconnect_exhausted: { attempts: number };
}

/**
 * Reconnection state tracking.
 */
interface ReconnectState {
  attempts: number;
  nextDelay: number;
  timer: ReturnType<typeof setTimeout> | null;
}

// =============================================================================
// RconConnection
// =============================================================================

/**
 * Low-level RCON socket connection manager.
 *
 * Handles the TCP socket lifecycle, automatic reconnection with
 * exponential backoff, and raw data transmission.
 *
 * This class does not handle RCON protocol details - it only manages
 * the raw socket connection.
 *
 * @example
 * ```typescript
 * const connection = new RconConnection(config, logger);
 *
 * connection.on('data', (buffer) => {
 *   // Handle incoming data
 * });
 *
 * await connection.connect();
 * connection.write(packetBuffer);
 * ```
 */
export class RconConnection extends TypedEventEmitter<ConnectionEventMap> {
  /** Current connection state. */
  private state: ConnectionState = ConnectionState.DISCONNECTED;

  /** The underlying TCP socket. */
  private socket: Socket | null = null;

  /** Reconnection state. */
  private reconnectState: ReconnectState = {
    attempts: 0,
    nextDelay: 0,
    timer: null,
  };

  /** Whether auto-reconnect is enabled for this session. */
  private autoReconnectEnabled = false;

  /** Incoming data buffer for packet assembly. */
  private incomingBuffer: Buffer = Buffer.alloc(0);

  /** Promise resolver for pending connect. */
  private connectResolver: {
    resolve: () => void;
    reject: (err: Error) => void;
  } | null = null;

  constructor(
    private readonly config: ResolvedRconConfig,
    private readonly log: ModuleLogger,
  ) {
    super();
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Gets the current connection state.
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Checks if connected and ready for commands.
   */
  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }

  /**
   * Establishes a TCP connection to the RCON server.
   *
   * @returns Promise that resolves when connected
   * @throws ConnectionError if connection fails
   */
  async connect(): Promise<void> {
    if (this.state !== ConnectionState.DISCONNECTED) {
      throw new Error(`Cannot connect in state: ${this.state}`);
    }

    this.state = ConnectionState.CONNECTING;
    this.autoReconnectEnabled = this.config.reconnect.enabled;
    this.resetReconnectState();

    return this.doConnect();
  }

  /**
   * Gracefully disconnects from the server.
   *
   * Disables auto-reconnect and closes the socket.
   *
   * @returns Promise that resolves when disconnected
   */
  async disconnect(): Promise<void> {
    // Disable auto-reconnect
    this.autoReconnectEnabled = false;
    this.cancelReconnectTimer();

    if (!this.socket) {
      this.state = ConnectionState.DISCONNECTED;
      return;
    }

    return new Promise((resolve) => {
      const socket = this.socket;
      if (!socket) {
        this.state = ConnectionState.DISCONNECTED;
        resolve();
        return;
      }

      const onClose = () => {
        socket.removeListener('error', onError);
        this.state = ConnectionState.DISCONNECTED;
        resolve();
      };

      const onError = () => {
        socket.removeListener('close', onClose);
        this.state = ConnectionState.DISCONNECTED;
        resolve();
      };

      socket.once('close', onClose);
      socket.once('error', onError);

      this.log.debug('Disconnecting socket');
      socket.end();
    });
  }

  /**
   * Forcefully destroys the connection.
   *
   * Use this for cleanup when the client is being destroyed.
   */
  destroy(): void {
    this.autoReconnectEnabled = false;
    this.cancelReconnectTimer();
    this.state = ConnectionState.DESTROYING;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }

    this.incomingBuffer = Buffer.alloc(0);
    this.state = ConnectionState.DISCONNECTED;

    // Reject any pending connect
    if (this.connectResolver) {
      this.connectResolver.reject(new Error('Connection destroyed'));
      this.connectResolver = null;
    }
  }

  /**
   * Writes data to the socket.
   *
   * @param data - Buffer to send
   * @throws Error if not connected
   */
  write(data: Buffer): void {
    if (!this.socket || !this.socket.writable) {
      throw ConnectionError.notConnected();
    }

    this.socket.write(data);
  }

  /**
   * Marks the connection as authenticated and ready.
   */
  setAuthenticated(): void {
    if (this.state === ConnectionState.AUTHENTICATING) {
      this.state = ConnectionState.CONNECTED;
    }
  }

  /**
   * Transitions to authenticating state.
   */
  setAuthenticating(): void {
    if (this.state === ConnectionState.CONNECTING) {
      this.state = ConnectionState.AUTHENTICATING;
    }
  }

  // ===========================================================================
  // Connection Logic
  // ===========================================================================

  /**
   * Performs the actual connection attempt.
   */
  private doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connectResolver = { resolve, reject };

      const { host, port, connectTimeout } = this.config;

      this.log.debug(`Connecting to ${host}:${port}`);

      // Create new socket
      this.socket = new Socket();
      this.socket.setNoDelay(true);

      // Set up timeout
      const timeout = setTimeout(() => {
        if (this.socket) {
          this.socket.destroy();
        }
        const err = ConnectionError.timeout(host, port, connectTimeout);
        this.handleConnectError(err);
      }, connectTimeout);

      // Connection established
      const onConnect = () => {
        clearTimeout(timeout);
        this.socket?.removeListener('error', onError);

        this.log.info(`Connected to ${host}:${port}`);
        this.state = ConnectionState.AUTHENTICATING;

        // Set up permanent listeners
        this.setupSocketListeners();

        // Emit event
        this.emit('socket_connected');

        // Resolve the connect promise
        if (this.connectResolver) {
          this.connectResolver.resolve();
          this.connectResolver = null;
        }
      };

      // Connection error
      const onError = (err: Error) => {
        clearTimeout(timeout);
        this.socket?.removeListener('connect', onConnect);
        this.handleConnectError(err);
      };

      this.socket.once('connect', onConnect);
      this.socket.once('error', onError);

      // Start connection
      this.socket.connect(port, host);
    });
  }

  /**
   * Handles connection errors.
   */
  private handleConnectError(err: Error): void {
    const { host, port } = this.config;

    this.log.warn(`Connection failed: ${err.message}`);

    // Clean up socket
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }

    // Convert to ConnectionError if needed
    const connectionErr =
      err instanceof ConnectionError
        ? err
        : ConnectionError.refused(host, port, err);

    // Reject pending connect promise
    if (this.connectResolver) {
      this.connectResolver.reject(connectionErr);
      this.connectResolver = null;
    }

    this.state = ConnectionState.DISCONNECTED;

    // Attempt reconnection if enabled
    if (this.autoReconnectEnabled) {
      this.scheduleReconnect();
    }
  }

  /**
   * Sets up socket event listeners.
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('data', (data: Buffer) => {
      // Append to incoming buffer
      this.incomingBuffer = Buffer.concat([this.incomingBuffer, data]);

      // Emit data event
      this.emit('data', this.incomingBuffer);
    });

    this.socket.on('close', (hadError: boolean) => {
      this.log.info(`Socket closed${hadError ? ' with error' : ''}`);

      this.socket = null;
      this.incomingBuffer = Buffer.alloc(0);

      const wasConnected = this.state === ConnectionState.CONNECTED;
      this.state = ConnectionState.DISCONNECTED;

      this.emit('closed', { hadError });

      // Attempt reconnection if we were connected and auto-reconnect is enabled
      if (wasConnected && this.autoReconnectEnabled) {
        this.scheduleReconnect();
      }
    });

    this.socket.on('error', (err: Error) => {
      this.log.error(`Socket error: ${err.message}`);
      this.emit('error', err);
    });
  }

  // ===========================================================================
  // Reconnection Logic
  // ===========================================================================

  /**
   * Schedules a reconnection attempt.
   */
  private scheduleReconnect(): void {
    const { reconnect } = this.config;

    // Check if max attempts reached
    if (
      reconnect.maxAttempts > 0 &&
      this.reconnectState.attempts >= reconnect.maxAttempts
    ) {
      this.log.error(
        `Max reconnection attempts (${reconnect.maxAttempts}) reached`,
      );
      this.emit('reconnect_exhausted', {
        attempts: this.reconnectState.attempts,
      });
      return;
    }

    // Calculate delay with jitter
    const delay = this.calculateReconnectDelay();
    this.reconnectState.attempts++;

    this.log.info(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectState.attempts})`,
    );

    this.state = ConnectionState.RECONNECTING;
    this.emit('reconnecting', {
      attempt: this.reconnectState.attempts,
      delay,
    });

    this.reconnectState.timer = setTimeout(() => {
      this.reconnectState.timer = null;
      this.doConnect().catch(() => {
        // Error handled in doConnect
      });
    }, delay);
  }

  /**
   * Calculates the next reconnection delay with exponential backoff and jitter.
   */
  private calculateReconnectDelay(): number {
    const { reconnect } = this.config;

    // First attempt uses initial delay
    if (this.reconnectState.attempts === 0) {
      this.reconnectState.nextDelay = reconnect.initialDelay;
      return reconnect.initialDelay;
    }

    // Calculate base delay with exponential backoff
    let delay = this.reconnectState.nextDelay * reconnect.multiplier;

    // Cap at max delay
    delay = Math.min(delay, reconnect.maxDelay);

    // Add jitter
    const jitter = delay * reconnect.jitter * (Math.random() * 2 - 1);
    delay = Math.max(0, delay + jitter);

    // Store for next time
    this.reconnectState.nextDelay = delay;

    return Math.floor(delay);
  }

  /**
   * Cancels any pending reconnection timer.
   */
  private cancelReconnectTimer(): void {
    if (this.reconnectState.timer) {
      clearTimeout(this.reconnectState.timer);
      this.reconnectState.timer = null;
    }
  }

  /**
   * Resets reconnection state.
   */
  private resetReconnectState(): void {
    this.cancelReconnectTimer();
    this.reconnectState = {
      attempts: 0,
      nextDelay: this.config.reconnect.initialDelay,
      timer: null,
    };
  }

  /**
   * Clears processed bytes from the incoming buffer.
   *
   * @param bytesConsumed - Number of bytes to remove from the front
   */
  consumeBuffer(bytesConsumed: number): void {
    if (bytesConsumed > 0 && bytesConsumed <= this.incomingBuffer.length) {
      this.incomingBuffer = this.incomingBuffer.subarray(bytesConsumed);
    }
  }

  /**
   * Gets the current incoming buffer for processing.
   */
  getBuffer(): Buffer {
    return this.incomingBuffer;
  }
}
