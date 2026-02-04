# @squadscript/log-parser

> High-performance, type-safe log parser for Squad dedicated servers.

## Overview

The log parser is responsible for:

1. **Reading** log files from various sources (local tail, SFTP, FTP)
2. **Parsing** log lines using regex rules to extract structured data
3. **Correlating** related events using ChainID and session state
4. **Emitting** strongly-typed events for consumption by SquadServer

## Installation

```bash
bun add @squadscript/log-parser
```

## Features

- **Type Safety**: Full TypeScript with branded types and strict null checking
- **Immutable Events**: Event objects are frozen upon creation
- **Explicit Error Handling**: All fallible operations return `Result<T, E>` types
- **Pre-compiled Regex**: Patterns are compiled at load time for performance
- **Backpressure Control**: Bounded queue prevents memory exhaustion
- **Event Correlation**: ChainID tracking for damage/wound/death chains

## Usage

```typescript
import { LogParser, TailLogReader, defaultRules } from '@squadscript/log-parser';
import { Logger } from '@squadscript/logger';

const logger = new Logger();
const reader = new TailLogReader({
  logDir: '/path/to/squad/logs',
  filename: 'SquadGame.log',
});

const parser = new LogParser({
  reader,
  rules: defaultRules,
  logger: logger.child('log-parser'),
});

// Subscribe to events
parser.on('PLAYER_CONNECTED', (event) => {
  console.log(`Player connected: ${event.player.eosID}`);
});

parser.on('PLAYER_DAMAGED', (event) => {
  console.log(`${event.victim.name} took ${event.damage} damage from ${event.weapon}`);
});

// Start watching
const result = await parser.watch();
if (!result.ok) {
  console.error('Failed to start parser:', result.error);
}
```

## Log Readers

### TailLogReader (Local Files)

```typescript
import { TailLogReader } from '@squadscript/log-parser';

const reader = new TailLogReader({
  logDir: '/path/to/logs',
  filename: 'SquadGame.log',
  pollInterval: 1000,
  encoding: 'utf-8',
});
```

### FtpLogReader (Remote via FTP)

```typescript
import { FtpLogReader } from '@squadscript/log-parser';

const reader = new FtpLogReader({
  logDir: '/logs',
  filename: 'SquadGame.log',
  ftp: {
    host: 'server.example.com',
    port: 21,
    username: 'user',
    password: 'pass',
  },
  fetchInterval: 5000,
});
```

### SftpLogReader (Remote via SFTP)

```typescript
import { SftpLogReader } from '@squadscript/log-parser';

const reader = new SftpLogReader({
  logDir: '/logs',
  filename: 'SquadGame.log',
  sftp: {
    host: 'server.example.com',
    port: 22,
    username: 'user',
    password: 'pass',
  },
  fetchInterval: 5000,
});
```

## Events

The parser emits the following events:

### Player Events
- `PLAYER_CONNECTED` - Player connects to server
- `PLAYER_DISCONNECTED` - Player disconnects
- `PLAYER_JOIN_SUCCEEDED` - Player fully loads in
- `PLAYER_POSSESS` - Player possesses a pawn
- `PLAYER_UNPOSSESS` - Player unpossesses a pawn

### Combat Events
- `PLAYER_DAMAGED` - Player takes damage
- `PLAYER_WOUNDED` - Player is downed
- `PLAYER_DIED` - Player dies
- `PLAYER_REVIVED` - Player is revived
- `DEPLOYABLE_DAMAGED` - FOB/HAB takes damage

### Game Events
- `NEW_GAME` - New match starts
- `ROUND_WINNER` - Match winner determined
- `ROUND_ENDED` - Match ends
- `ROUND_TICKETS` - Ticket count update
- `SERVER_TICK_RATE` - Server performance

### Admin Events
- `ADMIN_BROADCAST` - Admin broadcasts message

## Custom Rules

You can extend the default rules with custom parsing rules:

```typescript
import { defineRule, extendRules, defaultRules } from '@squadscript/log-parser';

const myRule = defineRule({
  event: 'CUSTOM_EVENT',
  regex: /^\[([0-9.:-]+)]\[([ 0-9]*)]LogCustom: (.+)/,
  parse: (match, context) => {
    return {
      time: parseLogTimestamp(match[1]),
      raw: match[0],
      message: match[3],
    };
  },
});

const customRules = extendRules([myRule]);
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         LogParser                               │
│                                                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  LogReader  │───▶│  LineQueue   │───▶│  RuleProcessor   │   │
│  │  (Tail/FTP) │    │  (Bounded)   │    │  (Pre-compiled)  │   │
│  └─────────────┘    └──────────────┘    └────────┬─────────┘   │
│                                                   │             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      EventStore                          │   │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐   │   │
│  │  │ players  │  │ joinRequests │  │ session (combat) │   │   │
│  │  └──────────┘  └──────────────┘  └──────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              TypedEventEmitter<LogParserEventMap>        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## License

MIT
