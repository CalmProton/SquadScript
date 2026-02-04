# Squad Dedicated Server - Docker Compose

A simple Docker Compose setup for running a Squad dedicated game server.

## Quick Start

### 1. Clone/Download

```bash
git clone <repo-url>
cd squad-server-compose
```

### 2. Start the Server

```bash
docker compose up -d
```

The server will automatically download and validate game files on first run.

### 3. Configure

Configuration files are stored in the `squad-data` Docker volume at `SquadGame/ServerConfig/`.

**To edit configs:**

```bash
# Find where Docker stores the volume
docker volume inspect squad-data

# Or copy configs out, edit, and copy back
docker cp squad-dedicated:/home/steam/squad-dedicated/SquadGame/ServerConfig ./config-backup
# Edit files in ./config-backup
docker cp ./config-backup/. squad-dedicated:/home/steam/squad-dedicated/SquadGame/ServerConfig/
docker compose restart
```

**Alternative: Use bind mount after first successful run**

After the server downloads game files once, you can switch to bind mounts for easier config editing:

```bash
# Stop the server
docker compose down

# Copy data from volume to local folder
docker run --rm -v squad-data:/data -v $(pwd)/data:/backup alpine cp -a /data/. /backup/

# Update docker-compose.yml to use bind mount:
# volumes:
#   - ./data:/home/steam/squad-dedicated/

# Start again
docker compose up -d
```

| File | Purpose |
|------|---------|
| `Server.cfg` | Server name, passwords, welcome messages |
| `Admins.cfg` | Admin SteamIDs and permissions |
| `Rcon.cfg` | RCON password and port |
| `LayerRotation.cfg` | Map rotation |
| `Bans.cfg` | Banned players |
| `License.cfg` | Server license key (for official listing) |

Edit these files, then restart:

```bash
docker compose restart
```

## Ports

Ensure these ports are open in your firewall:

| Port | Protocol | Purpose |
|------|----------|---------|
| 7787 | UDP | Game port |
| 7788 | UDP | Game port +1 |
| 15000 | UDP/TCP | Beacon port |
| 27165 | UDP/TCP | Steam query |
| 27166 | UDP/TCP | Steam query +1 |
| 21114 | TCP | RCON |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 7787 | Game port |
| `QUERYPORT` | 27165 | Steam query port |
| `RCONPORT` | 21114 | RCON port |
| `beaconport` | 15000 | Beacon port |
| `FIXEDMAXPLAYERS` | 100 | Max player count |
| `BETA` | - | Beta branch name |
| `BETAPASSWORD` | - | Beta password |

## Coolify Deployment

This compose file is compatible with [Coolify](https://coolify.io/).

### Setup in Coolify

1. In Coolify dashboard, create a new **Docker Compose** resource
2. Point to this repository or paste the `docker-compose.yml` contents
3. Enable **Network Mode: Host** in advanced settings (required for game servers)
4. Deploy - the named volume `squad-data` will be created automatically
5. Wait for first startup to complete (~15-30 min for initial download)

### Editing Configs in Coolify

Use Coolify's terminal or SSH to edit configs:

```bash
# Access the container
docker exec -it squad-dedicated bash

# Edit config inside container
nano /home/steam/squad-dedicated/SquadGame/ServerConfig/Server.cfg

# Or from host, copy out and edit
docker cp squad-dedicated:/home/steam/squad-dedicated/SquadGame/ServerConfig ./config
```

### Important Notes for Coolify

- The server requires `network_mode: host` - Coolify's default proxy won't work for game traffic
- Use a VPS with direct port access (not behind Cloudflare tunnels)
- Minimum recommended specs: 4 CPU cores, 8GB RAM, 50GB storage

## Commands

```bash
# View logs
docker compose logs -f

# Stop server
docker compose down

# Update server (pulls latest image + validates files)
docker compose pull && docker compose up -d

# Access container shell
docker compose exec squad-server bash
```

## Multiple Instances

Create a separate compose file with different ports and volume:

```yaml
# docker-compose.instance2.yml
volumes:
  squad-data-2:

services:
  squad-server-2:
    image: cm2network/squad:latest
    container_name: squad-dedicated-2
    stdin_open: true
    tty: true
    restart: unless-stopped
    network_mode: host
    volumes:
      - squad-data-2:/home/steam/squad-dedicated/
    environment:
      - PORT=7789
      - QUERYPORT=27167
      - RCONPORT=21115
      - beaconport=15001
      - FIXEDMAXPLAYERS=100
```

Remember to also update `Rcon.cfg` inside the container with the new RCON port.

## Troubleshooting

### Server restart loop / "SquadGameServer.sh: No such file or directory"
This happens when using an empty bind mount (`./data:/home/steam/squad-dedicated/`) on first run. The empty folder shadows the container's install directory before game files download. **Solution**: Use named volumes (default in this compose) or let the server download files first before adding bind mounts.

### First startup takes very long
Normal - the server downloads ~30GB of game files on first run. Watch progress with `docker compose logs -f`. Subsequent starts are fast.

### Server not appearing in browser
- Servers appear in "Custom Browser" until licensed
- Check firewall rules for all required ports
- Verify `network_mode: host` is enabled

### Connection issues
- NAT Loopback required if hosting and playing on same network
- Don't run Steam client while server is starting
- Check if ports are already in use: `netstat -tulpn | grep 7787`

### Performance issues
- Ensure adequate RAM (8GB+ recommended)
- Consider CPU affinity for multiple instances
- Check disk I/O - SSD recommended

## Resources

- [Official Squad Wiki - Server Installation](https://squad.fandom.com/wiki/Server_Installation)
- [Official Squad Wiki - Server Configuration](https://squad.fandom.com/wiki/Server_Configuration)
- [Squad Hosting Discord](https://discord.gg/squadhosting)
- [Docker Image (cm2network/squad)](https://hub.docker.com/r/cm2network/squad/)

## License

MIT
