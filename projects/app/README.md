# SquadScript Admin Dashboard

Admin dashboard for SquadScript RCON and server management.

## Features

- **Dashboard**: Server status overview, player count, current map, uptime
- **Players**: View online players, kick, ban, warn, send messages, add flags
- **Logs**: View server logs with filtering by type (chat, kills, admin actions, server events)
- **Plugins**: Enable/disable and configure plugins
- **RCON Console**: Execute RCON commands directly
- **Settings**: Language selection (English, Russian, Ukrainian), theme preferences

## Tech Stack

- **Framework**: [Nuxt 4](https://nuxt.com) (CSR/SPA mode)
- **UI**: [shadcn-vue](https://www.shadcn-vue.com/) with [Tailwind CSS v4](https://tailwindcss.com)
- **Authentication**: [nuxt-auth-utils](https://nuxt.com/modules/auth-utils)
- **i18n**: [nuxt-i18n-micro](https://nuxt.com/modules/nuxt-i18n-micro)

## Setup

1. Install dependencies:
   ```bash
   bun install
   ```

2. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

3. Configure environment variables:
   ```env
   # Session secret (required, minimum 32 characters)
   NUXT_SESSION_PASSWORD=your-super-secret-session-password-min-32-chars

   # Admin credentials
   NUXT_ADMIN_USERNAME=admin
   NUXT_ADMIN_PASSWORD=your-secure-password
   ```

4. Run development server:
   ```bash
   bun run dev
   ```

5. Open http://localhost:3000 in your browser

## Build

```bash
# Build for production (static site)
bun run generate

# Build for server deployment
bun run build

# Preview production build
bun run preview
```

## Project Structure

```
projects/app/
├── app/
│   ├── assets/css/      # Tailwind CSS
│   ├── components/ui/   # shadcn-vue components
│   ├── layouts/         # Default and auth layouts
│   ├── middleware/      # Auth middleware
│   └── pages/           # Application pages
├── i18n/locales/        # Translation files (en, ru, uk)
├── lib/                 # Utility functions
├── server/api/auth/     # Authentication endpoints
└── nuxt.config.ts       # Nuxt configuration
```

## Adding shadcn Components

```bash
bunx shadcn-vue@latest add <component-name>
```

## Languages

- English (en) - default
- Russian (ru)
- Ukrainian (uk)

