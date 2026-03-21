# SADAD Shopify Integration — Express Server
# Built by Louis Innovations (www.louis-innovations.com)

# ---------------------------------------------------------------------------
# Stage 1: Build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json* ./

# Copy local SDK dependency before installing
COPY ../sadad-js-sdk /sadad-js-sdk

# Install all dependencies (including devDependencies for TypeScript)
RUN npm ci

# Copy source files
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: Production image
# ---------------------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy only production artifacts
COPY package.json package-lock.json* ./

# Copy local SDK
COPY --from=builder /sadad-js-sdk /sadad-js-sdk

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output and static assets
COPY --from=builder /app/dist ./dist
COPY templates ./templates
COPY config ./config

# Non-root user for security
RUN addgroup -S sadad && adduser -S sadad -G sadad
USER sadad

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
