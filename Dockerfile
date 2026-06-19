FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
# Copy generated Prisma client
COPY --from=builder /app/src/generated ./src/generated
# Copy all node_modules needed at runtime (pg + prisma deps)
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/pg ./node_modules/pg
COPY --from=builder /app/node_modules/pg-cloudflare ./node_modules/pg-cloudflare
COPY --from=builder /app/node_modules/pg-connection-string ./node_modules/pg-connection-string
COPY --from=builder /app/node_modules/pg-int8 ./node_modules/pg-int8
COPY --from=builder /app/node_modules/pg-pool ./node_modules/pg-pool
COPY --from=builder /app/node_modules/pg-protocol ./node_modules/pg-protocol
COPY --from=builder /app/node_modules/pg-types ./node_modules/pg-types
COPY --from=builder /app/node_modules/pgpass ./node_modules/pgpass
COPY --from=builder /app/node_modules/packet-reader ./node_modules/packet-reader
COPY --from=builder /app/node_modules/postgres-array ./node_modules/postgres-array
COPY --from=builder /app/node_modules/postgres-bytea ./node_modules/postgres-bytea
COPY --from=builder /app/node_modules/postgres-date ./node_modules/postgres-date
COPY --from=builder /app/node_modules/postgres-interval ./node_modules/postgres-interval
COPY --from=builder /app/node_modules/postgres-range ./node_modules/postgres-range
COPY --from=builder /app/node_modules/xtend ./node_modules/xtend
# Copy sharp (used by next/image in production)
COPY --from=builder /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder /app/node_modules/detect-libc ./node_modules/detect-libc
COPY --from=builder /app/node_modules/color ./node_modules/color
COPY --from=builder /app/node_modules/color-string ./node_modules/color-string
COPY --from=builder /app/node_modules/color-name ./node_modules/color-name
COPY --from=builder /app/node_modules/color-convert ./node_modules/color-convert
COPY --from=builder /app/node_modules/semver ./node_modules/semver
COPY --from=builder /app/node_modules/tunnel-agent ./node_modules/tunnel-agent
COPY --from=builder /app/node_modules/is-arrayish ./node_modules/is-arrayish
COPY --from=builder /app/node_modules/simple-swizzle ./node_modules/simple-swizzle
COPY --from=builder /app/node_modules/node-addon-api ./node_modules/node-addon-api
COPY --from=builder /app/node_modules/prebuild-install ./node_modules/prebuild-install
COPY --from=builder /app/node_modules/rc ./node_modules/rc
COPY --from=builder /app/node_modules/minimist ./node_modules/minimist
COPY --from=builder /app/node_modules/strip-json-comments ./node_modules/strip-json-comments
COPY --from=builder /app/node_modules/decompress-response ./node_modules/decompress-response
COPY --from=builder /app/node_modules/mimic-response ./node_modules/mimic-response
COPY --from=builder /app/node_modules/simple-get ./node_modules/simple-get
COPY --from=builder /app/node_modules/napi-build-utils ./node_modules/napi-build-utils
COPY --from=builder /app/node_modules/expand-template ./node_modules/expand-template
COPY --from=builder /app/node_modules/github-from-package ./node_modules/github-from-package

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
