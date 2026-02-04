# @squadscript/plugins

Official plugin collection for SquadScript.

## Plugins

### Core Server Plugins

- **ChatCommands** - Listen for `!command` patterns and respond with preset messages
- **AutoTKWarn** - Automatically warn players when they teamkill
- **SeedingMode** - Broadcast seeding rule messages when below player threshold
- **IntervalledBroadcasts** - Broadcast rotating messages at regular intervals
- **AutoKickUnassigned** - Kick players who remain unassigned for too long
- **FogOfWar** - Automatically set fog of war mode at round start
- **TeamRandomizer** - Randomize team assignments via admin command

## Usage

```typescript
import { ChatCommands, AutoTKWarn, SeedingMode } from '@squadscript/plugins';

// Register plugins with the server
server.registerPlugin(ChatCommands, {
  commands: [
    { command: 'rules', type: 'warn', response: 'Be respectful!' },
  ],
});

server.registerPlugin(AutoTKWarn, {
  attackerMessage: 'Please apologise for ALL TKs in ALL chat!',
});

server.registerPlugin(SeedingMode, {
  seedingThreshold: 50,
  seedingMessage: 'Seeding Rules Active! Fight only over the middle flags!',
});
```

## License

ISC
