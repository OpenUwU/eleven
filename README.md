# Eleven

[![CI](https://github.com/openUwU/eleven/actions/workflows/ci.yml/badge.svg)](https://github.com/openUwU/eleven/actions/workflows/ci.yml)
[![Release](https://github.com/openUwU/eleven/actions/workflows/release.yml/badge.svg)](https://github.com/openUwU/eleven/actions/workflows/release.yml)

A feature-rich, high-performance Discord music bot built with **TypeScript**, **discord.js v14**, **Shoukaku** (Lavalink), **PostgreSQL**, and **Redis**.

Featuring hybrid sharding, audio filters, custom playlist management, autoplay, 24/7 mode, and Spotify integration.

---

## Features

- **Stable Audio Streaming**: Powered by [Lavalink](https://github.com/lavalink-devs/Lavalink) and [Shoukaku](https://github.com/shipgirlproject/Shoukaku).
- **Scalable Architecture**: Multi-cluster hybrid sharding via [discord-hybrid-sharding](https://github.com/Deividas/discord-hybrid-sharding).
- **Audio Filters**: Bassboost, nightcore, vaporwave, 8D, tremolo, and custom equalizer settings.
- **Queue Management**: Autoplay, fairplay queue mode, duplicate removal, track seeking, loop, and shuffle.
- **Database & Cache**: PostgreSQL for user/server data, playlists, and settings; Redis for fast caching.
- **Personal Library**: Custom playlists, track favorites, listening history, and AI playlist generator.
- **Integrations**: Spotify playlist support, Top.gg vote webhooks, and premium tier handling.
- **Server Customization**: 24/7 voice channel mode, default volume, fairplay roles, and guild-level configs.

---

## Prerequisites

Before running the bot, ensure you have:

- [Node.js](https://nodejs.org/) `>= 20.0.0`
- [PostgreSQL](https://www.postgresql.org/) 16+
- [Redis](https://redis.io/) 7+
- A running [Lavalink v4](https://github.com/lavalink-devs/Lavalink) node
- A [Discord Bot Application](https://discord.com/developers/applications) with bot token & client ID

> Using the [Docker setup](#docker-setup) below? Postgres and Redis are provided by Compose — you only need Node.js locally if you're running outside Docker. A Lavalink node is required either way; Compose doesn't run one for you.

---

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/openUwU/eleven.git
cd eleven
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
| :--- | :--- |
| `DISCORD_TOKEN` | Discord Bot Token from Developer Portal |
| `DISCORD_CLIENT_ID` | Discord Bot Application Client ID |
| `SUPPORT_LINK` | Discord invite link to your support server (`https://discord.com/invite/Ez4gCJQDxB`) |
| `NODE_ENV` | `development` or `production` |
| `POSTGRES_URL` | PostgreSQL connection string (`postgres://user:pass@host:5432/db`) |
| `REDIS_URL` | Redis connection URL (`redis://host:6379`) |
| `LAVALINK_HOST` | Lavalink server host / IP |
| `LAVALINK_PORT` | Lavalink server port (e.g. `2333`) |
| `LAVALINK_AUTH` | Lavalink node password |
| `LAVALINK_SECURE` | Set to `true` if Lavalink uses SSL/WSS, otherwise `false` |
| `LAVALINK_NODE_NAME` | Name/identifier for Lavalink node (default: `Main`) |
| `WEBHOOK_PORT` | Port for internal webhook server (e.g. `6969`) |
| `TOPGG_WEBHOOK_SECRET` | Secret key for Top.gg vote webhooks |
| `PREMIUM_WEBHOOK_SECRET`| Secret key for premium webhooks |
| `backupWebhook` | Discord webhook URL for database backup notifications |
| `VOTE_ENABLED` | Set to `true` to enable vote checks from top.gg |

### Emoji Server

To display the bot's custom emojis:

1. [Join the Emoji Server](https://discord.gg/Mpkup6xwNh).
2. Run `ax invite <client_id>` in the server, replacing `<client_id>` with your bot's client ID.
3. Click the invite link provided by the bot.
4. Add your bot to the Emoji Server.

### 3. Run Database Migrations

Apply pending SQL schema migrations to your PostgreSQL database:

```bash
npm run migrate
```

Optional preview without applying:
```bash
npm run migrate -- --dry
```

### 4. Run the Bot

#### Development Mode:
```bash
npm run dev
```

#### Production Mode:
```bash
npm run build
npm run start
```

---

## Docker Setup

You can run the entire stack (PostgreSQL, Redis, migrations, the bot, and Portainer for management) with Docker Compose — no local Node/Postgres/Redis install needed, just Docker.

1. Fill in `.env` with your database credentials and bot config (same variables as above).
2. Start everything:

```bash
docker compose up -d
```

This spins up:

| Service | What it does |
| :--- | :--- |
| `pg` | PostgreSQL 16, with a persisted volume |
| `redis` | Redis 7, password-protected |
| `migrate` | Runs `npm run migrate` once against `pg`, then exits |
| `eleven` | Installs deps and runs the bot itself, on port `6969` |

Note: `eleven` and `migrate` bind-mount the repo and run `npm install && npm run build && npm run start` on container start rather than baking a prebuilt image — so the first boot takes a little longer while it installs, and container restarts re-run install/build against whatever is in your working tree.

---

## Pterodactyl Guide

This guide explains how to host Eleven on a Pterodactyl panel.

### 1. Download the Latest Release

Download the latest release directly:
```
https://github.com/OpenUwU/eleven/releases/latest/download/eleven.zip
```

### 2. Get a Pterodactyl Server

Obtain a Pterodactyl server from:
- **AeroX Discord**: [discord.gg/aerox](https://discord.gg/aerox)
- Or any other Pterodactyl hosting provider

### 3. Configure Server Settings

- **Software**: Node.js
- **Node.js Version**: 24
- **Startup File**: `dist/index.js`

### 4. Upload Files

1. Go to the **Files** tab in your Pterodactyl panel
2. Upload the zip file you downloaded from GitHub releases
3. Extract the zip file

### 5. Move Files to Correct Directory

After extracting, follow these steps to move the files to the correct directory:

- Open the current folder (the extracted folder)
- Select **all files** inside it
- Click **Move** (it may either say **Move** or appear as a **capital "I" icon**)
- In the popup path field, enter: `../`
- Click **Move** to confirm
- After the files are moved, **restart your server**

### 6. Configure Environment Variables

1. Rename `.env.example` to `.env`
2. Fill in the required environment variables with your values:

| Variable | Description |
| :--- | :--- |
| `DISCORD_TOKEN` | Discord Bot Token from Developer Portal |
| `DISCORD_CLIENT_ID` | Discord Bot Application Client ID |
| `SUPPORT_LINK` | Discord invite link to your support server |
| `NODE_ENV` | `development` or `production` |
| `POSTGRES_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection URL |
| `LAVALINK_HOST` | Lavalink server host / IP |
| `LAVALINK_PORT` | Lavalink server port |
| `LAVALINK_AUTH` | Lavalink node password |
| `LAVALINK_SECURE` | Set to `true` if Lavalink uses SSL/WSS |
| `LAVALINK_NODE_NAME` | Name/identifier for Lavalink node |
| `WEBHOOK_PORT` | Port for internal webhook server |
| `TOPGG_WEBHOOK_SECRET` | Secret key for Top.gg vote webhooks |
| `PREMIUM_WEBHOOK_SECRET`| Secret key for premium webhooks |
| `backupWebhook` | Discord webhook URL for database backup notifications |
| `VOTE_ENABLED` | Set to `true` to enable vote checks from top.gg |

### 7. Start the Server

After completing the above steps, start your Pterodactyl server. The bot should now be running.

---

## Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the bot in development mode with `tsx` |
| `npm run build` | Compiles TypeScript source to `dist/` |
| `npm run start` | Runs the compiled bot from `dist/index.js` |
| `npm run migrate` | Executes all pending database schema migrations |
| `npm run typecheck` | Validates TypeScript types without emitting code |
| `npm run lint` | Runs Biome linter on `./src` |
| `npm run format` | Auto-formats code using Biome |

---

## Common Commands

| Category | Commands |
| :--- | :--- |
| **Music** | `/play`, `/pause`, `/resume`, `/skip`, `/previous`, `/queue`, `/nowplaying`, `/seek`, `/volume`, `/shuffle`, `/loop`, `/filter`, `/stop`, `/clearqueue` |
| **Library** | `/favourite`, `/favourites`, `/history`, `/playlistcreate`, `/playlistadd`, `/playlisttracks`, `/playlistlist`, `/playlistai` |
| **Config** | `/config`, `/twentyfour_seven`, `/defaultvolume`, `/defaultautoplay`, `/defaultfairplay`, `/fairplayrole` |
| **General** | `/help`, `/botinfo`, `/ping`, `/support`, `/invite`, `/vote`, `/links`, `/documentation` |

---

## Support & Resources

- **Support Server**: Join our Discord for support, updates, and help: [Discord Support Server](https://discord.com/invite/Ez4gCJQDxB)
- **Documentation**: [https://ele1.mintlify.app/](https://ele1.mintlify.app/)
- **Vote on Top.gg**: [Top.gg Bot Page](https://top.gg/bot/1277525844319014955/vote)
- **Legal**: [Privacy Policy](https://ele1.mintlify.site/legal/privacy) - [Terms of Service](https://ele1.mintlify.site/legal/terms)

---

## License & Attribution

This project is licensed under the **OpenUwU Source-Available License (OUSL) v1**. See the [LICENSE](LICENSE) file for details.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Reporting Bugs

Bugs are tracked as [GitHub issues](https://github.com/openUwU/eleven/issues) — use the bug report template so we get the repro steps and version up front.

## Contributors 

<a href="https://github.com/openUwU/eleven/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=openUwU/eleven" />
</a>

### Credits
- **Created by**: [@mooncarli](https://github.com/mooncarli), [@bre4d777](https://github.com/bre4d777), [@dev-prayag](https://github.com/dev-prayag), and [OpenUwU](https://github.com/openUwU) Contributors.

### Acknowledgements
- **[NodeLink](https://github.com/PerformanC/NodeLink)**: For the lyrics fetching implementation ported into the `/lyrics` command.