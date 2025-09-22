# Multi-stage production-optimized Dockerfile
FROM node:18-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

# Security: Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Builder stage
FROM base AS builder
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm prisma generate
RUN pnpm build

# Remove dev dependencies and clean up
RUN pnpm prune --prod
RUN rm -rf .git

# Production stage - optimized for size
FROM node:18-alpine AS production

# Install production tools
RUN apk add --no-cache dumb-init curl
RUN npm install -g pm2

# Create app directory
WORKDIR /app

# Copy user configuration
COPY --from=base /etc/passwd /etc/passwd
COPY --from=base /etc/group /etc/group

# Copy production dependencies
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/generated ./generated
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Copy config files
COPY --chown=nestjs:nodejs ecosystem.config.js package.json ./

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R nestjs:nodejs logs

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 4545

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4545/v1/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
