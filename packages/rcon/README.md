# @squadscript/rcon

> Modern, type-safe RCON client for Squad game servers

## Features

- **Full TypeScript Support** — Complete type definitions for all commands and events
- **Automatic Reconnection** — Exponential backoff with jitter for reliable connections
- **Typed Commands** — Type-safe API for all Squad RCON commands
- **Real-time Events** — Strongly-typed events for chat, admin actions, and more
- **Result Pattern** — Explicit error handling using `Result<T, E>` types
- **Resource Safety** — Proper cleanup and lifecycle management

## Installation

```bash
bun add @squadscript/rcon
```

## Quick Start

```typescript
import { RconClient } from '@squadscript/rcon';

const client = new RconClient({
  host: '127.0.0.1',
  port: 21114,
  password: 'your-rcon-password',
});

// Connect to the server
await client.connect();

// Execute commands with type-safe responses
const players = await client.getPlayers();
if (players.ok) {
  console.log(`${players.value.length} players online`);
}

// Listen for chat messages
client.on('CHAT_MESSAGE', (event) => {
  console.log(`${event.playerName}: ${event.message}`);
});

// Execute admin commands
await client.warn('76561198012345678', 'Please follow the rules');
await client.broadcast('Server restarting in 5 minutes');

// Graceful shutdown
await client.disconnect();
```

## Configuration

```typescript
interface RconConfig {
  /** Server hostname or IP address */
  host: string;

  /** RCON port number */
  port: number;

  /** RCON password */
  password: string;

  /** Reconnection settings */
  reconnect?: {
    /** Enable automatic reconnection (default: true) */
    enabled?: boolean;
    /** Initial delay in ms (default: 1000) */
    initialDelay?: number;
    /** Maximum delay in ms (default: 30000) */
    maxDelay?: number;
    /** Backoff multiplier (default: 2) */
    multiplier?: number;
    /** Random jitter factor 0-1 (default: 0.1) */
    jitter?: number;
    /** Max reconnection attempts, 0 = unlimited (default: 0) */
    maxAttempts?: number;
  };

  /** Command execution settings */
  command?: {
    /** Command timeout in ms (default: 10000) */
    timeout?: number;
    /** Number of retries for failed commands (default: 1) */
    retries?: number;
  };

  /** Heartbeat/keepalive settings */
  heartbeat?: {
    /** Enable heartbeat (default: true) */
    enabled?: boolean;
    /** Heartbeat interval in ms (default: 30000) */
    interval?: number;
  };
}
```

## Commands

### Query Commands

```typescript
// Get list of connected players
const players = await client.getPlayers();

// Get list of squads
const squads = await client.getSquads();

// Get current and next map
const currentMap = await client.getCurrentMap();
const nextMap = await client.getNextMap();
```

### Admin Commands

```typescript
// Warn a player (accepts SteamID, EOSID, PlayerID, or name)
await client.warn(playerId, 'Warning message');

// Kick a player
await client.kick(playerId, 'Kick reason');

// Ban a player (0 = permanent, or use interval like '1h', '7d')
await client.ban(playerId, '1d', 'Ban reason');

// Broadcast message to all players
await client.broadcast('Server message');

// Change map
await client.changeMap('Narva_RAAS_v1');

// Force team change
await client.forceTeamChange(playerId);

// Disband a squad
await client.disbandSquad(teamId, squadId);
```

## Events

### Chat Events

```typescript
client.on('CHAT_MESSAGE', (event) => {
  // event.channel: 'ChatAll' | 'ChatTeam' | 'ChatSquad' | 'ChatAdmin'
  // event.playerName: string
  // event.steamID: SteamID | null
  // event.eosID: EOSID
  // event.message: string
});
```

### Admin Events

```typescript
client.on('ADMIN_CAM_ENTERED', (event) => {
  // Player entered admin camera
});

client.on('ADMIN_CAM_EXITED', (event) => {
  // Player exited admin camera
});

client.on('PLAYER_WARNED', (event) => {
  // Player was warned
});

client.on('PLAYER_KICKED', (event) => {
  // Player was kicked
});

client.on('PLAYER_BANNED', (event) => {
  // Player was banned
});

client.on('SQUAD_CREATED', (event) => {
  // New squad was created
});
```

### Connection Events

```typescript
client.on('connected', () => {
  console.log('Connected to server');
});

client.on('disconnected', (reason) => {
  console.log(`Disconnected: ${reason}`);
});

client.on('reconnecting', (attempt) => {
  console.log(`Reconnecting, attempt ${attempt}`);
});

client.on('error', (error) => {
  console.error('RCON error:', error);
});
```

## Error Handling

All command methods return `Result<T, RconError>` types:

```typescript
const result = await client.getPlayers();

if (result.ok) {
  // Success - result.value contains the players
  for (const player of result.value) {
    console.log(player.name);
  }
} else {
  // Error - result.error contains the error
  console.error(`Failed to get players: ${result.error.message}`);
}
```

## License

MIT
