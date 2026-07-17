# syntax=docker/dockerfile:1

# ── deps: install node_modules from a clean lockfile ───────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache git

COPY package.json package-lock.json ./
# Railway's builder only supports --mount=type=cache, not type=secret,
# so GH_PAT comes in as a build ARG instead. Falls back to plain HTTPS
# if unset (public repo).
ARG GH_PAT
RUN if [ -n "$GH_PAT" ]; then \
      git config --global url."https://x-access-token:${GH_PAT}@github.com/".insteadOf "https://github.com/"; \
      git config --global url."https://x-access-token:${GH_PAT}@github.com/".insteadOf "git@github.com:"; \
      git config --global url."https://x-access-token:${GH_PAT}@github.com/".insteadOf "ssh://git@github.com/"; \
    else \
      git config --global url."https://github.com/".insteadOf "git@github.com:"; \
      git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"; \
    fi && \
    npm ci && \
    rm -f ~/.gitconfig

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
