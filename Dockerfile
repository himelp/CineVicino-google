# Multi-stage Dockerfile for CineVicino production deployment
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
# NOTE: intentionally removes package-lock.json before installing, then uses npm
# install (not npm ci). package-lock.json is not guaranteed to have been generated
# on an ARM64/musl machine, and its resolved optional-dependency entries for rollup's
# native binary get honored by npm even under plain `npm install` if the lockfile
# file is still present on disk — only removing the lockfile file itself forces a
# fresh per-platform resolution. This has broken ARM64 production builds four times
# now (twice after "fixing" it with npm ci -> npm install alone, without also
# removing the lockfile). Do not simplify this to `npm ci` or to `npm install` alone
# ever again — both the removal and npm install are required together.
RUN rm -f package-lock.json && npm install

# Copy source files
COPY . .

# Build Vite client & bundle Node backend with esbuild
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
# NOTE: Deliberately mirrors the builder stage fix above. A committed lockfile
# can silently drift out of sync with package.json (e.g. when dependencies are added),
# and npm ci's strictness turns that drift into a hard production build failure instead
# of a self-healing install. Removing the lockfile and running npm install --omit=dev
# ensures resilient production builds on the runner stage.
RUN rm -f package-lock.json && npm install --omit=dev

# Copy build artifacts and data
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/data ./data
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/tsconfig.json ./

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
