# syntax=docker/dockerfile:1

# ── deps: install node_modules from a clean lockfile ───────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ── builder: produce the Next.js standalone output ─────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# proxy.ts requires these at request time; provide build-time placeholders so the
# production build never fails on a missing env var. Real values are injected at deploy.
ARG BACKEND_URL=http://placeholder
ARG APP_API_TOKEN=placeholder
ENV BACKEND_URL=$BACKEND_URL \
    APP_API_TOKEN=$APP_API_TOKEN \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── runner: minimal runtime image ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
