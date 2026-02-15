# SquadScript — Docker Deployment

Run a [Squad dedicated game server](https://hub.docker.com/r/cm2network/squad) alongside the SquadScript app and server using Docker Compose.

## Services

| Service               | Image / Build           | Description                                                       |
| --------------------- | ----------------------- | ----------------------------------------------------------------- |
| `squad`               | `cm2network/squad`      | Squad dedicated game server with automatic updates via SteamCMD   |
| `squadscript-server`  | `Dockerfile.server`     | Core SquadScript orchestrator — RCON, log parser, plugin engine   |
| `squadscript-app`     | `Dockerfile.app`        | Nuxt admin dashboard for server management                        |

## Quick Start

```bash
cd projects/docker

# 1. Copy and edit the environment file
cp .env.example .env

# 2. Copy and edit the SquadScript config (set your RCON password, plugins, etc.)
cp config.example.json config.json

# 3. Start all services
docker compose up -d
```

The dashboard will be available at **http://localhost:3000** (or the port you set in `APP_PORT`).

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and adjust values.

#### Squad Game Server

| Variable              | Default                   | Description                                           |
| --------------------- | ------------------------- | ----------------------------------------------------- |
| `SQUAD_PORT`          | `7787`                    | Game port                                             |
| `SQUAD_QUERYPORT`     | `27165`                   | Steam query port                                      |
| `SQUAD_BEACONPORT`    | `15000`                   | Beacon port                                           |
| `SQUAD_RCONPORT`      | `21114`                   | RCON port (must match `config.json` → `rcon.port`)    |
| `SQUAD_MAXPLAYERS`    | `80`                      | Maximum player count                                  |
| `SQUAD_MAXTICKRATE`   | `50`                      | Server tick rate                                      |
| `SQUAD_MODS`          | `()`                      | Workshop mod IDs, e.g. `(13371337 12341234)`          |
| `SQUAD_SERVER_NAME`   | `Squad Dedicated Server`  | Server name shown in the server browser               |
| `SQUAD_MULTIHOME`     | *(empty)*                 | Bind IP when host has multiple addresses              |

#### SquadScript App

| Variable              | Default                           | Description                      |
| --------------------- | --------------------------------- | -------------------------------- |
| `APP_PORT`            | `3000`                            | Dashboard HTTP port              |
| `APP_ADMIN_USERNAME`  | `admin`                           | Dashboard login username         |
| `APP_ADMIN_PASSWORD`  | `admin`                           | Dashboard login password         |
| `APP_SESSION_PASSWORD`| `change-me-to-a-random-secret-min-32-chars` | Session password for `nuxt-auth-utils` (min 32 chars) |

#### SquadScript Server

| Variable              | Default   | Description                                          |
| --------------------- | --------- | ---------------------------------------------------- |
| `LOG_LEVEL`           | `info`    | Log level (`debug`, `info`, `warn`, `error`)         |
| `SQUADSCRIPT_RCON_HOST` | `127.0.0.1` | RCON host for SquadScript connection                |
| `SQUADSCRIPT_RCON_PORT` | `21114` | RCON port for SquadScript connection                   |
| `SQUADSCRIPT_RCON_PASSWORD` | `CHANGE_ME` | RCON password for SquadScript connection (must match Squad `Server.cfg`) |
| `SQUADSCRIPT_LOG_DIR` | `/home/steam/squad-dedicated/SquadGame/Saved/Logs` | Squad log directory path |
| `SQUADSCRIPT_HEALTH_PORT` | `3002` | Internal HTTP health endpoint start port (auto-falls back to next ports if busy) |
| `SQUADSCRIPT_RETRY_MS`    | `5000` | Retry delay (ms) when startup dependencies are not ready |

### SquadScript Config (`config.json`)

Copy `config.example.json` to `config.json` and set at minimum:

- **`rcon.password`** — the RCON password configured in your Squad server's `Server.cfg`.
- **`logReader.logDir`** — path to Squad log files inside the container. The default
  `/home/steam/squad-dedicated/SquadGame/Saved/Logs` matches the bind-mounted volume.

See the [config schema](../../packages/config/src/schemas/server.ts) for all available options
including plugins, admin lists, and connectors.

## Squad Server Configuration

The Squad server config files are stored in the `squad-data` volume. To edit them:

```bash
docker exec -it squadscript-squad nano /home/steam/squad-dedicated/SquadGame/ServerConfig/Server.cfg
```

Make sure the `RCONPORT` environment variable and the RCON port in `Server.cfg` match the value in
your `config.json`.

> **Tip:** The container automatically updates the game on startup. Simply restart it after a game
> update: `docker compose restart squad`

### Mods

Set the `SQUAD_MODS` variable in `.env` as a space-separated list of Workshop IDs wrapped in
parentheses:

```env
SQUAD_MODS=(13371337 12341234 1111111)
```

You can find Workshop mod IDs from the Steam Workshop URL or by looking up the numeric folder name
at `<steam_folder>/steamapps/workshop/content/393380`.

## Running Multiple Squad Server Instances

To run additional Squad servers, duplicate the `squad` service with different port variables:

```yaml
squad-2:
  image: cm2network/squad
  container_name: squadscript-squad-2
  restart: unless-stopped
  network_mode: host
  volumes:
    - squad-data-2:/home/steam/squad-dedicated/
  environment:
    - PORT=7788
    - QUERYPORT=27166
    - BEACONPORT=15001
    - RCONPORT=21115
    - FIXEDMAXPLAYERS=80
    - SERVER_NAME=Squad Server 2
```

Then add a matching entry in `config.json` under the `servers` array with the corresponding RCON
port.

## Data Persistence

The `squad-data` Docker volume holds all Squad server files (configs, logs, mods). It persists
across container restarts and recreations. To use a host directory instead:

```yaml
volumes:
  - /path/on/host/squad-data:/home/steam/squad-dedicated/
```

Make sure the directory is writable by the unprivileged container user:

```bash
mkdir -p /path/on/host/squad-data
chmod 777 /path/on/host/squad-data
```

## Useful Commands

```bash
# Start all services in the background
docker compose up -d

# View logs (follow mode)
docker compose logs -f

# View logs for a specific service
docker compose logs -f squad

# Restart after a game update
docker compose restart squad

# Rebuild SquadScript images after a code update
docker compose build && docker compose up -d

# Stop everything
docker compose down

# Stop and remove volumes (⚠️ deletes server data)
docker compose down -v
```
