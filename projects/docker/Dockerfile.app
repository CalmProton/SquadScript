# =============================================================================
# Dockerfile.app — SquadScript App (Nuxt dashboard)
# =============================================================================
# Multi-stage build for the @squadscript/app Nuxt application.
# Builds a static/SSR Nuxt app served by the Nitro server.
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1 — Install & build
# ---------------------------------------------------------------------------
FROM oven/bun:1 AS build

WORKDIR /app

# Copy workspace root manifests first (better layer caching)
COPY package.json bun.lock turbo.json ./

# Copy ALL workspace package manifests so bun can resolve the full workspace graph
COPY packages/types/package.json        packages/types/
COPY packages/logger/package.json       packages/logger/
COPY packages/config/package.json       packages/config/
COPY packages/rcon/package.json         packages/rcon/
COPY packages/log-parser/package.json   packages/log-parser/
COPY projects/server/package.json       projects/server/
COPY projects/plugins/package.json      projects/plugins/
COPY projects/app/package.json          projects/app/

RUN bun install --frozen-lockfile --ignore-scripts

# Copy app source
COPY projects/app/ projects/app/
COPY biome.json tsconfig*.json ./

# Build the Nuxt app
RUN cd projects/app && bun run build

# ---------------------------------------------------------------------------
# Stage 2 — Production image
# ---------------------------------------------------------------------------
FROM oven/bun:1-slim AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy the Nuxt build output (.output contains the Nitro server bundle)
COPY --from=build /app/projects/app/.output .output/

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

EXPOSE 3000

CMD ["bun", "run", ".output/server/index.mjs"]
