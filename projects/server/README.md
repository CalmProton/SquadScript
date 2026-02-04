# @squadscript/server

The central orchestrator for Squad server management. This package provides the `SquadServer` class that coordinates all server interactions, manages state, and routes events.

## Installation

```bash
bun add @squadscript/server
```

## Overview

`SquadServer` is the main entry point for interacting with a Squad game server. It:

- **Manages connections** to RCON and log sources (local, FTP, SFTP)
- **Maintains server state** including players, squads, teams, layers, and admins
- **Routes and enriches events** from RCON and log parser
- **Provides type-safe APIs** for querying state and executing commands
- **Handles automatic refresh** of state data on configurable intervals

## Quick Start

```typescript
import { SquadServer } from '@squadscript/server';

const server = new SquadServer({
  id: 'my-server',
  name: 'My Squad Server',
  rcon: {
    host: '127.0.0.1',
    port: 21114,
    password: 'your-rcon-password',
  },
  logReader: {
    mode: 'tail',
    logDir: '/path/to/Squad/SquadGame/Saved/Logs',
  },
});

// Subscribe to events
server.on('CHAT_MESSAGE', (event) => {
  console.log(`[${event.channel}] ${event.player.name}: ${event.message}`);
});

server.on('PLAYER_CONNECTED', (event) => {
  console.log(`Player connected: ${event.player.eosID}`);
});

// Start the server
await server.start();

// Query state
const players = server.players;
const squads = server.squads;
console.log(`${players.length} players online`);

// Execute commands
await server.broadcast('Welcome to the server!');

// Stop when done
await server.stop();
```

## Configuration

### SquadServerOptions

```typescript
interface SquadServerOptions {
  // Required
  id: string;                    // Unique server identifier
  rcon: RconConfig;              // RCON connection config
  logReader: LogReaderConfig;    // Log reader configuration

  // Optional
  name?: string;                 // Human-readable name (defaults to id)
  adminLists?: AdminListSource[]; // Admin list sources
  layerHistorySize?: number;     // Max layer history (default: 20)
  updateIntervals?: UpdateIntervals; // Custom refresh intervals
}
```

### RCON Configuration

```typescript
const server = new SquadServer({
  // ...
  rcon: {
    host: '127.0.0.1',      // Server IP
    port: 21114,            // RCON port
    password: 'secret',     // RCON password
  },
});
```

### Log Reader Modes

#### Local Tail (for same-machine deployments)

```typescript
logReader: {
  mode: 'tail',
  logDir: '/path/to/logs',
  filename: 'SquadGame.log', // Optional, defaults to SquadGame.log
}
```

#### FTP (for remote servers)

```typescript
logReader: {
  mode: 'ftp',
  logDir: '/remote/path/to/logs',
  host: 'ftp.example.com',
  port: 21,
  user: 'username',
  password: 'password',
}
```

#### SFTP (for secure remote access)

```typescript
logReader: {
  mode: 'sftp',
  logDir: '/remote/path/to/logs',
  host: 'sftp.example.com',
  port: 22,
  user: 'username',
  password: 'password',
}
```

### Update Intervals

Control how often state is refreshed from the server:

```typescript
updateIntervals: {
  playerList: 30_000,   // 30 seconds (default)
  squadList: 30_000,    // 30 seconds
  layerInfo: 30_000,    // 30 seconds
  serverInfo: 30_000,   // 30 seconds
  adminList: 300_000,   // 5 minutes
}
```

### Admin Lists

Load admin permissions from multiple sources:

```typescript
adminLists: [
  { type: 'local', source: '/path/to/Admins.cfg' },
  { type: 'remote', source: 'https://example.com/admins.txt' },
]
```

## State Access

### Players

```typescript
// Get all players
const players = server.players;

// Get by identifier
const player = server.getPlayerByEOSID(eosID);
const player = server.getPlayerBySteamID(steamID);
const player = server.getPlayerByID(playerID);
const player = server.getPlayerByName('PlayerName');
```

### Squads

```typescript
// Get all squads
const squads = server.squads;

// Get by team
const team1Squads = server.getSquadsByTeam(1);
const team2Squads = server.getSquadsByTeam(2);
```

### Layers

```typescript
// Current and next layer
const currentLayer = server.currentLayer;
const nextLayer = server.nextLayer;

// Layer history
const history = server.getLayerHistory(10);
```

### Admins

```typescript
// Check permissions
const canKick = server.hasPermission(steamID, 'kick');
const canBan = server.hasPermission(eosID, 'ban');

// Get admin info
const admin = server.getAdmin(steamID);
```

## Events

SquadServer emits all events from the base SquadEventMap plus additional server-specific events.

### Player Lifecycle Events

```typescript
server.on('PLAYER_CONNECTED', (event) => {
  // Player initiated connection
  console.log(`${event.player.eosID} connecting from ${event.ip}`);
});

server.on('PLAYER_JOIN_SUCCEEDED', (event) => {
  // Player fully joined
  console.log(`${event.player.name} joined`);
});

server.on('PLAYER_DISCONNECTED', (event) => {
  // Player left
  console.log(`${event.player.eosID} disconnected`);
});
```

### State Change Events

```typescript
server.on('PLAYER_TEAM_CHANGE', (event) => {
  console.log(`${event.player.name} changed to team ${event.newTeamID}`);
});

server.on('PLAYER_SQUAD_CHANGE', (event) => {
  console.log(`${event.player.name} joined squad ${event.newSquadID}`);
});

server.on('PLAYER_ROLE_CHANGE', (event) => {
  console.log(`${event.player.name} now playing as ${event.newRole}`);
});

server.on('PLAYER_LEADER_CHANGE', (event) => {
  if (event.isLeader) {
    console.log(`${event.player.name} became squad leader`);
  }
});
```

### Combat Events

```typescript
server.on('PLAYER_WOUNDED', (event) => {
  console.log(`${event.attacker.name} wounded ${event.victim.name}`);
});

server.on('PLAYER_DIED', (event) => {
  if (event.suicide) {
    console.log(`${event.victim.name} committed suicide`);
  } else if (event.attacker) {
    console.log(`${event.attacker.name} killed ${event.victim.name}`);
  }
});

server.on('PLAYER_REVIVED', (event) => {
  console.log(`${event.reviver.name} revived ${event.victim.name}`);
});
```

### Game Events

```typescript
server.on('NEW_GAME', (event) => {
  console.log(`New match started: ${event.layer?.name ?? 'Unknown'}`);
});

server.on('ROUND_ENDED', (event) => {
  console.log('Round ended');
});

server.on('ROUND_WINNER', (event) => {
  console.log(`Team ${event.winner} won!`);
});
```

### Chat Events

```typescript
server.on('CHAT_MESSAGE', (event) => {
  const { player, channel, message } = event;
  console.log(`[${channel}] ${player.name}: ${message}`);
});
```

### Admin Events

```typescript
server.on('ADMIN_BROADCAST', (event) => {
  console.log(`[BROADCAST] ${event.message}`);
});

server.on('ADMIN_CAMERA', (event) => {
  const action = event.entering ? 'entered' : 'exited';
  console.log(`${event.player.name} ${action} admin cam`);
});

server.on('PLAYER_KICKED', (event) => {
  console.log(`${event.player.name} was kicked: ${event.reason}`);
});

server.on('PLAYER_BANNED', (event) => {
  console.log(`${event.name} was banned: ${event.reason}`);
});
```

### Server Lifecycle Events

```typescript
server.on('SERVER_READY', (event) => {
  console.log(`Server ready with ${event.playerCount} players`);
});

server.on('SERVER_ERROR', (event) => {
  console.error('Server error:', event.error);
  if (event.recoverable) {
    console.log('Error is recoverable, will attempt recovery');
  }
});
```

## Commands

Execute admin commands with type-safe wrappers:

```typescript
// Broadcast a message
await server.broadcast('Server message!');

// Warn a player
await server.warn(playerID, 'Please follow the rules');

// Kick a player
await server.kick(playerID, 'Reason for kick');

// Ban a player
await server.ban(steamID, 'Ban reason', '1d'); // 1 day ban

// Execute raw command
const result = await server.execute('AdminListSquads');
if (result.ok) {
  console.log(result.value);
}
```

## Lifecycle

```typescript
// Create server instance
const server = new SquadServer(options);

// Start (connects RCON, starts log watching, fetches initial state)
const startResult = await server.start();
if (!startResult.ok) {
  console.error('Failed to start:', startResult.error);
}

// Check state
console.log('Server state:', server.getState());
// Possible states: 'created', 'starting', 'running', 'stopping', 'stopped', 'error'

// Stop gracefully
await server.stop();
```

## Error Handling

All async operations return `Result<T, E>` for explicit error handling:

```typescript
const result = await server.broadcast('Hello');

if (result.ok) {
  console.log('Broadcast sent');
} else {
  console.error('Broadcast failed:', result.error.message);
  
  // Check if error is recoverable
  if (result.error.recoverable) {
    // Retry logic
  }
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SquadServer                              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Event Emitter                             │ │
│  │  (forwards and enriches events from RCON and LogParser)     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │  PlayerSvc  │ │  SquadSvc   │ │  LayerSvc   │ │  AdminSvc   │ │
│  │  (state)    │ │  (state)    │ │  (state)    │ │  (perms)    │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
│  ┌──────────────────────┐  ┌────────────────────────────────────┐│
│  │      RconClient      │  │           LogParser                ││
│  │  (commands, events)  │  │  (file watching, event parsing)   ││
│  └──────────────────────┘  └────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    UpdateScheduler                           │ │
│  │  (periodic state refresh: players, squads, layers, admins)  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Services

The server uses internal services to manage state:

- **PlayerService**: Maintains player state with O(1) lookups by EOSID, SteamID, PlayerID, and name
- **SquadService**: Tracks squads with composite key lookups and creator tracking
- **LayerService**: Manages current/next layer and maintains layer history
- **AdminService**: Loads admin lists, resolves permissions, tracks admin cam usage

## Typed Event Emitter

The `TypedEventEmitter` class provides compile-time type safety:

```typescript
// Correct usage - TypeScript validates event names and payloads
server.on('PLAYER_CONNECTED', (event) => {
  // event is typed as PlayerConnectedEvent
});

// Type error - invalid event name
server.on('INVALID_EVENT', () => {}); // TS error

// Type error - wrong callback signature
server.on('PLAYER_CONNECTED', (event: string) => {}); // TS error
```

## Comparison with SquadJS

| Feature | SquadJS | @squadscript/server |
|---------|---------|-------------------|
| TypeScript | No | Full TypeScript |
| Type Safety | Runtime | Compile-time |
| Error Handling | Exceptions | Result types |
| Event System | EventEmitter | TypedEventEmitter |
| State Access | Properties | O(1) indexes |
| Log Parsing | Integrated | Separate package |
| RCON | Integrated | Separate package |
| Plugin System | File-based | Planned |

## License

MIT