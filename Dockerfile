# syntax=docker/dockerfile:1
# ews-astrolink — EWS Notification Service admin console (Next.js 16, pnpm).
# Build:  docker compose up -d --build      (from this folder)
# Image serves Next standalone on :3000 under basePath /apps/ews-astrolink;
# docker-compose.yml publishes it at 127.0.0.1:4001 (no nginx gateway).

# ---- deps: install with the exact lockfile ---------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@10
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build: next build (needs network for next/font/google) ----------------
FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@10
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# basePath every <Link> and /_next asset is served under.
ARG BASE_PATH=/apps/ews-astrolink
ENV BASE_PATH=$BASE_PATH \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---- runner: standalone server only ----------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=build --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nextjs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
