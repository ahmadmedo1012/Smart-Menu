# round87-D6: was node:22 + corepack pnpm@latest — package.json engines
# requires node >=24 (.nvmrc: 24) and an unpinned pnpm@latest resolves to
# whatever npm serves at build time (outside any lockfile policy).
# COREPACK_ENABLE_UNSAFE_VERSIONS lifts corepack's known-good-version gate so
# the EXACT pinned pnpm (packageManager: pnpm@11.9.0) always resolves.
FROM node:24-alpine AS base
ENV COREPACK_ENABLE_UNSAFE_VERSIONS=1
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

# Install deps (using pnpm, matching project's actual package manager)
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# Production runner (round87-D6: node 24 here too — the standalone server must
# run on the same major as the build)
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 app && adduser --system --uid 1001 app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER app
EXPOSE 3000
ENV PORT=3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
