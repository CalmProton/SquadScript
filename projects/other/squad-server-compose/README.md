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

After first startup, configuration files will be created in `./data/SquadGame/ServerConfig/`:

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
4. Add a **Storage** mount: `./data` → `/home/steam/squad-dedicated/`
5. Deploy

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

Create a separate directory with modified ports:

```yaml
# docker-compose.instance2.yml
services:
  squad-server-2:
    image: cm2network/squad:latest
    container_name: squad-dedicated-2
    stdin_open: true
    tty: true
    restart: unless-stopped
    network_mode: host
    volumes:
      - ./data2:/home/steam/squad-dedicated/
    environment:
      - PORT=7789
      - QUERYPORT=27167
      - RCONPORT=21115
      - beaconport=15001
      - FIXEDMAXPLAYERS=100
```

Remember to also update `Rcon.cfg` in `./data2/SquadGame/ServerConfig/` with the new RCON port.

## Troubleshooting

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
