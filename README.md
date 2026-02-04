<div align="center">

# SquadScript

**A modern, type-safe server management framework for Squad game servers.**

[![GitHub release](https://img.shields.io/github/release/CalmProton/SquadScript.svg?style=flat-square)](https://github.com/CalmProton/SquadScript/releases)
[![GitHub contributors](https://img.shields.io/github/contributors/CalmProton/SquadScript.svg?style=flat-square)](https://github.com/CalmProton/SquadScript/graphs/contributors)
[![GitHub license](https://img.shields.io/github/license/CalmProton/SquadScript.svg?style=flat-square)](https://github.com/CalmProton/SquadScript/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/CalmProton/SquadScript.svg?style=flat-square)](https://github.com/CalmProton/SquadScript/issues)
[![GitHub stars](https://img.shields.io/github/stars/CalmProton/SquadScript.svg?style=flat-square)](https://github.com/CalmProton/SquadScript/stargazers)

<br>

Built with TypeScript and Bun for optimal performance, SquadScript provides robust RCON management, log parsing, and an extensible plugin system.

</div>

---

## About

SquadScript is a scripting framework designed for Squad servers that handles all communication and data collection to and from your servers. It allows you to easily manage your server with powerful plugins without having to worry about the hassle of RCON or log parsing. SquadScript comes with multiple plugins already built for you, allowing you to experience its power right away.

SquadScript must be hosted on the same server box as your Squad server, or be connected to your Squad server via FTP/SFTP for log access.

## Features

- 🔒 **Type-Safe** - Full TypeScript with compile-time type checking
- 🚀 **Fast** - Built on Bun runtime for optimal performance
- 🔌 **Extensible Plugin System** - Easy to create and share plugins
- 📡 **Multiple Log Readers** - Support for local, FTP, and SFTP log access
- 🎮 **Rich Event System** - React to player events, kills, chat, and more
- 🤖 **Discord Integration** - Built-in Discord plugins for chat relay, admin alerts, and more
- 📊 **Community Ban List (CBL)** - Integration for checking player reputation
- ⚡ **Result-Based Error Handling** - Explicit error handling without exceptions

## Table of Contents

- [SquadScript](#squadscript)
  - [About](#about)
  - [Features](#features)
  - [Table of Contents](#table-of-contents)
  - [Requirements](#requirements)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
    - [1. Configure Your Server](#1-configure-your-server)
    - [2. Start SquadScript](#2-start-squadscript)
  - [Configuration](#configuration)
      - [Local Tail Mode](#local-tail-mode)
      - [FTP Mode](#ftp-mode)
      - [SFTP Mode](#sftp-mode)
      - [Discord Connector](#discord-connector)
  - [Available Plugins](#available-plugins)
    - [Core Plugins](#core-plugins)
    - [Entertainment \& QoL Plugins](#entertainment--qol-plugins)
    - [Squad Management Plugins](#squad-management-plugins)
    - [Discord Plugins](#discord-plugins)
    - [Advanced Plugins](#advanced-plugins)
  - [Complete Configuration Example](#complete-configuration-example)
  - [Creating Custom Plugins](#creating-custom-plugins)
    - [Plugin Lifecycle](#plugin-lifecycle)
    - [Available APIs in Plugins](#available-apis-in-plugins)
  - [Troubleshooting](#troubleshooting)
  - [Statement on Accuracy](#statement-on-accuracy)
  - [Project Structure](#project-structure)
  - [Development](#development)
  - [License](#license)
  - [Contributing](#contributing)
  - [Support](#support)

---

## Requirements

- **[Bun](https://bun.sh/)** v1.3.0 or higher - [Download](https://bun.sh/)
- **Squad Server** with RCON enabled
- **Discord Bot Token** (optional, for Discord plugins)

## Installation

1. **[Download SquadScript](https://github.com/CalmProton/SquadScript/releases/latest)** and unzip the download.
2. Open the unzipped folder in your terminal.
3. Install the dependencies:
   ```bash
   bun install
   ```
4. Build the packages:
   ```bash
   bun run build
   ```
5. Configure the `config.json` file. See [Configuration](#configuration) for details.
6. Start SquadScript:
   ```bash
   bun run start
   ```

> **Note:** If you want to test the latest development version, clone the `main` branch directly instead of downloading a release.

## Quick Start

### 1. Configure Your Server

Edit the `config.json` file in the root directory:

```json
{
  "servers": [
    {
      "id": 1,
      "name": "My Squad Server",
      "rcon": {
        "host": "127.0.0.1",
        "port": 21114,
        "password": "your-rcon-password"
      },
      "logReader": {
        "mode": "tail",
        "logDir": "C:/servers/squad_server/SquadGame/Saved/Logs"
      },
      "plugins": [
        {
          "plugin": "SeedingMode",
          "enabled": true,
          "options": {
            "seedingThreshold": 50,
            "seedingMessage": "Seeding Rules Active! Fight only over the middle flags!"
          }
        },
        {
          "plugin": "AutoTKWarn",
          "enabled": true
        }
      ]
    }
  ]
}
```

### 2. Start SquadScript

```bash
bun run start
```

That's it! SquadScript will connect to your server and start running the enabled plugins.

---

## Configuration

The config file needs to be valid JSON syntax. If an error is thrown saying the config cannot be parsed, try putting the config into a JSON syntax checker.

<details>
<summary><h3>Server Configuration</h3></summary>

The main configuration file supports single or multi-server setups:

```json
{
  "servers": [
    {
      "id": 1,
      "name": "Server Display Name",
      "rcon": { /* RCON config */ },
      "logReader": { /* Log reader config */ },
      "adminLists": [ /* Admin list sources */ ],
      "connectors": { /* Connector configs (Discord, etc.) */ },
      "plugins": [ /* Plugin configurations */ ],
      "verbosity": { /* Logging verbosity */ }
    }
  ],
  "connectors": { /* Global connectors shared across servers */ },
  "verbosity": { /* Global verbosity settings */ }
}
```

| Option | Description |
|--------|-------------|
| `id` | An integer ID to uniquely identify the server |
| `name` | Human-readable server name |
| `rcon` | RCON connection configuration |
| `logReader` | Log reader configuration |
| `adminLists` | Sources for identifying admins on the server |
| `connectors` | Server-specific connector configurations |
| `plugins` | Array of plugin configurations |
| `verbosity` | Logging verbosity settings |

</details>

<details>
<summary><h3>RCON Settings</h3></summary>

```json
{
  "rcon": {
    "host": "127.0.0.1",
    "port": 21114,
    "password": "your-rcon-password",
    "autoReconnect": true,
    "autoReconnectDelay": 5000,
    "maxReconnectAttempts": 0,
    "timeout": 10000
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | string | - | The IP of the server |
| `port` | number | 21114 | The RCON port of the server |
| `password` | string | - | The RCON password of the server |
| `autoReconnect` | boolean | `true` | Auto-reconnect on disconnect |
| `autoReconnectDelay` | number | `5000` | Delay between reconnection attempts (ms) |
| `maxReconnectAttempts` | number | `0` | Max reconnection attempts (0 = infinite) |
| `timeout` | number | `10000` | Connection timeout (ms) |

</details>

<details>
<summary><h3>Log Reader</h3></summary>

SquadScript supports three modes for reading server logs:

#### Local Tail Mode

Use `tail` mode when SquadScript is hosted on the same machine as your Squad server.

```json
{
  "logReader": {
    "mode": "tail",
    "logDir": "C:/servers/squad_server/SquadGame/Saved/Logs",
    "filename": "SquadGame.log"
  }
}
```

#### FTP Mode

Use `ftp` mode to read logs from a remote server via FTP.

```json
{
  "logReader": {
    "mode": "ftp",
    "logDir": "/remote/path/to/logs",
    "ftp": {
      "host": "ftp.example.com",
      "port": 21,
      "username": "your-username",
      "password": "your-password",
      "secure": false
    }
  }
}
```

#### SFTP Mode

Use `sftp` mode for secure remote log access.

```json
{
  "logReader": {
    "mode": "sftp",
    "logDir": "/remote/path/to/logs",
    "ftp": {
      "host": "sftp.example.com",
      "port": 22,
      "username": "your-username",
      "password": "your-password"
    }
  }
}
```

</details>

<details>
<summary><h3>Admin Lists</h3></summary>

Load admin permissions from multiple sources:

```json
{
  "adminLists": [
    {
      "type": "local",
      "source": "C:/servers/squad_server/SquadGame/ServerConfig/Admins.cfg"
    },
    {
      "type": "remote",
      "source": "https://example.com/admins.txt",
      "refreshInterval": 300000
    },
    {
      "type": "ftp",
      "source": "/remote/path/Admins.cfg",
      "refreshInterval": 300000
    }
  ]
}
```

| Type | Description |
|------|-------------|
| `local` | Read from a local file path |
| `remote` | Fetch from a URL |
| `ftp` | Read from an FTP/SFTP server |

</details>

<details>
<summary><h3>Connectors</h3></summary>

Connectors allow SquadScript to communicate with external resources. They should be named and configured, then referenced by plugins.

#### Discord Connector

```json
{
  "connectors": {
    "discord": {
      "type": "discord",
      "token": "your-discord-bot-token",
      "guildId": "your-guild-id"
    }
  }
}
```

Requires a Discord bot login token. Create a bot at the [Discord Developer Portal](https://discord.com/developers/applications).

</details>

<details>
<summary><h3>Plugins</h3></summary>

Plugins are configured in the `plugins` array. Each plugin can be enabled/disabled and configured with options.

```json
{
  "plugins": [
    {
      "plugin": "PluginName",
      "enabled": true,
      "options": {
        "option1": "value1",
        "option2": 123
      },
      "connectors": {
        "discordClient": "discord"
      }
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `plugin` | The name of the plugin |
| `enabled` | Toggle `true`/`false` to enable/disable the plugin |
| `options` | Plugin-specific configuration options |
| `connectors` | Map connector names to the plugin (for Discord plugins, etc.) |

</details>

<details>
<summary><h3>Verbosity</h3></summary>

Control console output verbosity for different modules:

```json
{
  "verbosity": {
    "SquadServer": 1,
    "RconClient": 1,
    "LogParser": 1,
    "PluginManager": 2
  }
}
```

Higher numbers produce more verbose output.

</details>

---

## Available Plugins

The following is a list of plugins built into SquadScript. Click to expand for configuration details.

### Core Plugins

<details>
<summary><b>ChatCommands</b> - Listen for !command patterns in chat</summary>

Listen for `!command` patterns in chat and respond with preset messages.

```json
{
  "plugin": "ChatCommands",
  "enabled": true,
  "options": {
    "commands": [
      { "command": "rules", "type": "warn", "response": "Please follow server rules!" },
      { "command": "discord", "type": "broadcast", "response": "Join our Discord: discord.gg/example" }
    ]
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `commands` | Array of command definitions | `[]` |
| `commands[].command` | Command trigger (without `!` prefix) | - |
| `commands[].type` | `warn` (to player) or `broadcast` (to all) | - |
| `commands[].response` | Message to send | - |

</details>

<details>
<summary><b>AutoTKWarn</b> - Automatically warn players when they teamkill</summary>

Sends warning messages to players when they teamkill.

```json
{
  "plugin": "AutoTKWarn",
  "enabled": true,
  "options": {
    "attackerMessage": "Please apologise for ALL TKs in ALL chat!",
    "victimMessage": "You were teamkilled. The player has been warned."
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `attackerMessage` | Message sent to the team killer | `"Please apologise for ALL TKs in ALL chat!"` |
| `victimMessage` | Message sent to the victim (null to disable) | `null` |

</details>

<details>
<summary><b>SeedingMode</b> - Broadcast seeding rules when below player threshold</summary>

Broadcasts seeding rule messages when the server is below a player count threshold.

```json
{
  "plugin": "SeedingMode",
  "enabled": true,
  "options": {
    "seedingThreshold": 50,
    "seedingMessage": "Seeding Rules Active! Fight only over the middle flags!",
    "liveEnabled": true,
    "liveThreshold": 52,
    "liveMessage": "Server is now LIVE! Normal rules apply.",
    "interval": 150000,
    "waitOnNewGames": true,
    "waitTimeOnNewGame": 30000
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `seedingThreshold` | Player count below which seeding rules are active | `50` |
| `seedingMessage` | Message broadcast when seeding | `"Seeding Rules Active!..."` |
| `liveEnabled` | Enable "Live" announcements | `true` |
| `liveThreshold` | Player count for "Live" message | `52` |
| `liveMessage` | Message when server goes live | `"Server is now LIVE! Normal rules apply."` |
| `interval` | Broadcast interval (ms) | `150000` |
| `waitOnNewGames` | Pause broadcasts after new game starts | `true` |
| `waitTimeOnNewGame` | How long to pause (ms) | `30000` |

</details>

<details>
<summary><b>IntervalledBroadcasts</b> - Broadcast rotating messages at intervals</summary>

Broadcasts messages from a list in rotation at regular intervals.

```json
{
  "plugin": "IntervalledBroadcasts",
  "enabled": true,
  "options": {
    "broadcasts": [
      "Welcome to our server! Follow the rules.",
      "Join our Discord: discord.gg/example",
      "Report issues to admins using !admin"
    ],
    "interval": 300000
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `broadcasts` | Array of messages to broadcast | `[]` |
| `interval` | Interval between broadcasts (ms) | `300000` |

</details>

<details>
<summary><b>AutoKickUnassigned</b> - Kick players who remain unassigned</summary>

Automatically kicks players who remain unassigned (not in a squad) for too long.

```json
{
  "plugin": "AutoKickUnassigned",
  "enabled": true,
  "options": {
    "warningMessage": "Join a squad, you are unassigned and will be kicked",
    "kickMessage": "Unassigned - automatically removed",
    "frequencyOfWarnings": 30000,
    "unassignedTimer": 360000,
    "playerThreshold": 93,
    "roundStartDelay": 900000,
    "ignoreAdmins": false,
    "ignoreWhitelist": false
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `warningMessage` | Warning message sent to unassigned players | `"Join a squad..."` |
| `kickMessage` | Kick reason shown to the player | `"Unassigned - automatically removed"` |
| `frequencyOfWarnings` | Interval between warnings (ms) | `30000` |
| `unassignedTimer` | Time before kick (ms) | `360000` |
| `playerThreshold` | Minimum player count for auto-kick (-1 to disable) | `93` |
| `roundStartDelay` | Grace period after round start (ms) | `900000` |
| `ignoreAdmins` | Exempt admins from auto-kick | `false` |
| `ignoreWhitelist` | Exempt reserved slot players | `false` |

</details>

<details>
<summary><b>FogOfWar</b> - Set fog of war mode at round start</summary>

Automatically sets fog of war mode when a new game starts.

```json
{
  "plugin": "FogOfWar",
  "enabled": true,
  "options": {
    "mode": 1,
    "delay": 10000
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `mode` | Fog of war mode to set | `1` |
| `delay` | Delay after round start (ms) | `10000` |

</details>

<details>
<summary><b>TeamRandomizer</b> - Randomize team assignments via admin command</summary>

Provides an admin command to randomize team assignments.

```json
{
  "plugin": "TeamRandomizer",
  "enabled": true
}
```

</details>

### Entertainment & QoL Plugins

<details>
<summary><b>FirstBlood</b> - Announce the first kill of each round</summary>

```json
{
  "plugin": "FirstBlood",
  "enabled": true,
  "options": {
    "message": "{attacker} drew first blood against {victim}!"
  }
}
```

</details>

<details>
<summary><b>PlayerWelcome</b> - Welcome players when they join</summary>

```json
{
  "plugin": "PlayerWelcome",
  "enabled": true,
  "options": {
    "newPlayerMessage": "Welcome to the server, {player}!"
  }
}
```

</details>

<details>
<summary><b>RevengeTracker</b> - Track and announce revenge kills</summary>

```json
{
  "plugin": "RevengeTracker",
  "enabled": true
}
```

</details>

<details>
<summary><b>RoundStatsSummary</b> - Display round statistics at match end</summary>

```json
{
  "plugin": "RoundStatsSummary",
  "enabled": true
}
```

</details>

### Squad Management Plugins

<details>
<summary><b>SquadNameEnforcer</b> - Enforce squad naming conventions</summary>

```json
{
  "plugin": "SquadNameEnforcer",
  "enabled": true,
  "options": {
    "blockedWords": ["offensive", "words"],
    "warnMessage": "Please rename your squad appropriately"
  }
}
```

</details>

<details>
<summary><b>SquadLeaderChangeAlert</b> - Alert when squad leaders change</summary>

```json
{
  "plugin": "SquadLeaderChangeAlert",
  "enabled": true
}
```

</details>

<details>
<summary><b>OrphanSquadLogger</b> - Log squads that become leaderless</summary>

```json
{
  "plugin": "OrphanSquadLogger",
  "enabled": true
}
```

</details>

<details>
<summary><b>VehicleClaimTracker</b> - Track vehicle claims by squads</summary>

```json
{
  "plugin": "VehicleClaimTracker",
  "enabled": true
}
```

</details>

### Discord Plugins

> **Note:** All Discord plugins require a Discord connector to be configured. See [Connectors](#connectors).

<details>
<summary><b>DiscordChat</b> - Relay chat between in-game and Discord</summary>

```json
{
  "plugin": "DiscordChat",
  "enabled": true,
  "options": {
    "channelID": "123456789012345678",
    "ignoreChats": ["ChatSquad"],
    "color": 16766720
  },
  "connectors": { "discordClient": "discord" }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `channelID` | Discord channel ID for chat relay | **Required** |
| `ignoreChats` | Chat channels to ignore | `[]` |
| `color` | Default embed color | `0xffd700` (gold) |
| `chatColors` | Colors for specific chat channels | `{}` |

</details>

<details>
<summary><b>DiscordTeamkill</b> - Post teamkill alerts to Discord</summary>

```json
{
  "plugin": "DiscordTeamkill",
  "enabled": true,
  "options": {
    "channelID": "123456789012345678",
    "color": 16711680,
    "includeCBL": true
  },
  "connectors": { "discordClient": "discord" }
}
```

</details>

<details>
<summary><b>DiscordAdminRequest</b> - Forward admin requests to Discord</summary>

```json
{
  "plugin": "DiscordAdminRequest",
  "enabled": true,
  "options": {
    "channelID": "123456789012345678",
    "command": "admin",
    "pingGroups": ["987654321098765432"],
    "pingHere": false,
    "pingDelay": 60000,
    "color": 16761867
  },
  "connectors": { "discordClient": "discord" }
}
```

</details>

<details>
<summary><b>DiscordServerStatus</b> - Post server status updates</summary>

```json
{
  "plugin": "DiscordServerStatus",
  "enabled": true,
  "options": {
    "channelID": "123456789012345678",
    "updateInterval": 60000,
    "showNextLayer": true
  },
  "connectors": { "discordClient": "discord" }
}
```

</details>

<details>
<summary><b>DiscordAdminBroadcast</b> - Relay admin broadcasts to Discord</summary>

```json
{
  "plugin": "DiscordAdminBroadcast",
  "enabled": true,
  "options": {
    "channelID": "123456789012345678",
    "color": 16761867
  },
  "connectors": { "discordClient": "discord" }
}
```

</details>

<details>
<summary><b>DiscordAdminCamLogs</b> - Log admin camera usage</summary>

```json
{
  "plugin": "DiscordAdminCamLogs",
  "enabled": true,
  "options": {
    "channelID": "123456789012345678",
    "color": 16761867
  },
  "connectors": { "discordClient": "discord" }
}
```

</details>

<details>
<summary><b>DiscordKillFeed</b> - Post kill feed to Discord</summary>

```json
{
  "plugin": "DiscordKillFeed",
  "enabled": true,
  "options": {
    "channelID": "123456789012345678",
    "includeWounds": false,
    "includeTeamkillsOnly": false
  },
  "connectors": { "discordClient": "discord" }
}
```

</details>

<details>
<summary><b>DiscordRoundWinner</b> - Announce round winners</summary>

```json
{
  "plugin": "DiscordRoundWinner",
  "enabled": true,
  "options": {
    "channelID": "123456789012345678",
    "color": 16761867
  },
  "connectors": { "discordClient": "discord" }
}
```

</details>

<details>
<summary><b>DiscordSquadCreated</b> - Announce new squads</summary>

```json
{
  "plugin": "DiscordSquadCreated",
  "enabled": true,
  "options": {
    "channelID": "123456789012345678",
    "color": 3329330
  },
  "connectors": { "discordClient": "discord" }
}
```

</details>

### Advanced Plugins

<details>
<summary><b>CBLInfo</b> - Check players against Community Ban List</summary>

Alerts admins when players with Community Ban List (CBL) reputation join.

```json
{
  "plugin": "CBLInfo",
  "enabled": true,
  "options": {
    "channelID": "123456789012345678",
    "threshold": 1,
    "pingGroups": ["987654321098765432"],
    "pingHere": false,
    "color": 16729156
  },
  "connectors": { "discordClient": "discord" }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `channelID` | Discord channel ID for CBL alerts | **Required** |
| `threshold` | Minimum reputation points to trigger alert (0 = any record) | `1` |
| `pingGroups` | Discord role IDs to ping on alerts | `[]` |
| `pingHere` | Use @here ping on alerts | `false` |

</details>

<details>
<summary><b>DBLog</b> - Log events to a database</summary>

Logs server statistics and events to a database for analytics and stat tracking.

```json
{
  "plugin": "DBLog",
  "enabled": true,
  "options": {
    "database": "mysql",
    "serverID": 1
  }
}
```

</details>

<details>
<summary><b>SocketIOAPI</b> - Real-time API via Socket.IO</summary>

Provides a real-time API for external applications.

```json
{
  "plugin": "SocketIOAPI",
  "enabled": true,
  "options": {
    "port": 3000,
    "authentication": "your-secret-token"
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `port` | Port for the Socket.IO server | `3000` |
| `authentication` | Security token for API access | **Required** |

</details>

---

## Complete Configuration Example

<details>
<summary>Click to expand full config.json example</summary>

```json
{
  "servers": [
    {
      "id": 1,
      "name": "My Community Squad Server",
      "rcon": {
        "host": "game.example.com",
        "port": 21114,
        "password": "secure-rcon-password"
      },
      "logReader": {
        "mode": "sftp",
        "logDir": "/home/squad/SquadGame/Saved/Logs",
        "ftp": {
          "host": "game.example.com",
          "port": 22,
          "username": "squad",
          "password": "sftp-password"
        }
      },
      "adminLists": [
        { "type": "local", "source": "/etc/squad/Admins.cfg" },
        { "type": "remote", "source": "https://api.example.com/admins.txt" }
      ],
      "connectors": {
        "discord": {
          "type": "discord",
          "token": "your-discord-bot-token"
        }
      },
      "plugins": [
        {
          "plugin": "SeedingMode",
          "enabled": true,
          "options": {
            "seedingThreshold": 40,
            "seedingMessage": "🌱 Seeding Rules: Fight over middle objectives only!",
            "liveThreshold": 50,
            "liveMessage": "🎮 Server is LIVE! All rules apply!"
          }
        },
        {
          "plugin": "AutoTKWarn",
          "enabled": true,
          "options": {
            "attackerMessage": "⚠️ You teamkilled! Apologize in ALL chat immediately!"
          }
        },
        {
          "plugin": "AutoKickUnassigned",
          "enabled": true,
          "options": {
            "playerThreshold": 80,
            "unassignedTimer": 300000
          }
        },
        {
          "plugin": "IntervalledBroadcasts",
          "enabled": true,
          "options": {
            "broadcasts": [
              "📢 Welcome! Server rules: No intentional TK, respect admins.",
              "💬 Join our Discord: discord.gg/example",
              "🛡️ Need an admin? Use !admin in chat"
            ],
            "interval": 600000
          }
        },
        {
          "plugin": "ChatCommands",
          "enabled": true,
          "options": {
            "commands": [
              { "command": "rules", "type": "warn", "response": "1. No TK 2. Respect others 3. Follow admin instructions" },
              { "command": "discord", "type": "warn", "response": "Join us: discord.gg/example" }
            ]
          }
        },
        {
          "plugin": "DiscordChat",
          "enabled": true,
          "options": { "channelID": "111111111111111111" },
          "connectors": { "discordClient": "discord" }
        },
        {
          "plugin": "DiscordTeamkill",
          "enabled": true,
          "options": { "channelID": "222222222222222222" },
          "connectors": { "discordClient": "discord" }
        },
        {
          "plugin": "DiscordAdminRequest",
          "enabled": true,
          "options": {
            "channelID": "333333333333333333",
            "pingGroups": ["444444444444444444"]
          },
          "connectors": { "discordClient": "discord" }
        },
        {
          "plugin": "CBLInfo",
          "enabled": true,
          "options": {
            "channelID": "555555555555555555",
            "threshold": 3,
            "pingGroups": ["444444444444444444"]
          },
          "connectors": { "discordClient": "discord" }
        }
      ]
    }
  ]
}
```

</details>

---

## Creating Custom Plugins

Interested in creating your own plugin? SquadScript makes it easy with a type-safe plugin API.

<details>
<summary>Click to expand custom plugin guide</summary>

Create custom plugins by extending the `BasePlugin` class:

```typescript
import { BasePlugin } from '@squadscript/core';
import type { OptionsSpec, PluginMeta } from '@squadscript/types';

const optionsSpec = {
  greeting: {
    type: 'string',
    required: false,
    description: 'Greeting message for players',
    default: 'Welcome to the server!',
  },
} as const satisfies OptionsSpec;

export class MyCustomPlugin extends BasePlugin<typeof optionsSpec> {
  static readonly meta: PluginMeta = {
    name: 'MyCustomPlugin',
    description: 'A custom plugin example',
    version: '1.0.0',
    defaultEnabled: true,
  };

  static readonly optionsSpec = optionsSpec;

  async mount(): Promise<void> {
    this.on('PLAYER_CONNECTED', async (event) => {
      this.log.info(`Player connecting: ${event.player.eosID}`);
    });

    this.on('PLAYER_JOIN_SUCCEEDED', async (event) => {
      await this.rcon.warn(event.player.eosID, this.options.greeting);
      this.log.info(`Welcomed player: ${event.player.name}`);
    });
  }
}
```

### Plugin Lifecycle

1. **Constructor** - Plugin is instantiated with options
2. **`prepareToMount()`** - Validate options, setup connectors
3. **`mount()`** - Subscribe to events, start intervals
4. **`unmount()`** - Cleanup resources, clear intervals

### Available APIs in Plugins

```typescript
// Logging
this.log.info('Information message');
this.log.warn('Warning message');
this.log.error('Error message', new Error('details'));
this.log.debug('Debug message');
this.log.verbose('Verbose message');

// RCON Commands
await this.rcon.warn(eosID, 'Message');
await this.rcon.kick(eosID, 'Reason');
await this.rcon.ban(steamID, '1d', 'Reason');  // (target, duration, reason)
await this.rcon.broadcast('Server-wide message');
await this.rcon.execute('RawCommand');

// Server State
const players = this.server.players;
const squads = this.server.squads;
const currentLayer = this.server.currentLayer;

// Event Subscriptions
this.on('EVENT_NAME', async (event) => { /* handler */ });

// Timers (auto-cleanup on unmount)
this.setTimeout(() => { /* code */ }, delay);
this.setInterval(() => { /* code */ }, interval);

// Connectors
const discord = this.getConnector<DiscordConnector>('discord');
```

</details>

---

## Troubleshooting

<details>
<summary><b>RCON Connection Issues</b></summary>

1. **Verify RCON is enabled** in your server's `Server.cfg`
2. **Check firewall rules** allow the RCON port (default: 21114)
3. **Verify credentials** are correct in your config
4. **Check server is running** before starting SquadScript

</details>

<details>
<summary><b>Log Reader Issues</b></summary>

**Local tail mode:**
- Ensure the log directory path is correct
- Verify file permissions allow reading

**FTP/SFTP mode:**
- Test connection with an FTP client first
- Check firewall allows outbound connections
- Verify credentials and paths

</details>

<details>
<summary><b>Plugin Not Loading</b></summary>

1. Check plugin name is spelled correctly
2. Verify `enabled: true` in the config
3. Check for required options
4. Review logs for error messages

</details>

<details>
<summary><b>Discord Bot Not Working</b></summary>

1. Verify bot token is valid
2. Ensure bot has proper permissions in the server
3. Check channel IDs are correct (right-click channel → Copy ID)
4. Verify the bot is in the correct guild

</details>

<details>
<summary><b>Common Errors</b></summary>

| Error | Solution |
|-------|----------|
| `RCON connection refused` | Check host, port, and firewall |
| `Authentication failed` | Verify RCON password |
| `Log file not found` | Check log directory path |
| `Discord connector not found` | Configure Discord connector before Discord plugins |
| `Permission denied` | Check file permissions for log reader |
| `Config cannot be parsed` | Validate JSON syntax with a JSON checker |

</details>

---

## Statement on Accuracy

Some information SquadScript collects from Squad servers was never intended or designed to be collected. As a result, it is impossible for any framework to collect the same information with 100% accuracy. SquadScript aims to get as close as possible to that figure, however, it acknowledges that this is not possible in some specific scenarios.

**Known limitations:**
- **Real-time data** - Server and player information is updated periodically (default: every 30 seconds). Some information may be slightly out of date.
- **Restarts during active games** - If SquadScript is started during an active game, some player state information may be incomplete.
- **Duplicate player names** - If multiple players have the same name, SquadScript may not be able to uniquely identify them in some log events.

---

## Project Structure

```
SquadScript/
├── packages/
│   ├── config/       # Configuration schemas and loaders
│   ├── log-parser/   # Squad log file parser
│   ├── logger/       # Logging utilities
│   ├── rcon/         # RCON client implementation
│   └── types/        # Shared TypeScript types
├── projects/
│   ├── core/         # Main SquadServer class and plugin system
│   └── plugins/      # Official plugin collection
├── config.json       # Your server configuration (create this)
└── package.json      # Workspace root
```

## Development

```bash
# Run tests
bun test

# Type check
bun run check-types

# Lint
bun run lint

# Build all packages
bun run build
```

---

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a pull request.

## Support

- **Issues**: [GitHub Issues](https://github.com/CalmProton/SquadScript/issues)
- **Discussions**: [GitHub Discussions](https://github.com/CalmProton/SquadScript/discussions)

---

<div align="center">

Built with ❤️ for the Squad community

</div>