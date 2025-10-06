# Multi-stage production-optimized Dockerfile
FROM node:18-alpine AS base

# Set environment variables for better performance
ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Install system dependencies and pnpm
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    ca-certificates \
    tzdata \
    && npm install -g pnpm@latest

# Security: Create non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nestjs

WORKDIR /app

# Dependencies stage
FROM base AS deps

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --prefer-offline

# Builder stage
FROM base AS builder

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including dev)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

# Copy source code
COPY . .

# Generate Prisma client and build application
RUN pnpm prisma generate \
    && pnpm build

# Clean up unnecessary files
RUN rm -rf \
    .git \
    .github \
    .vscode \
    .env.example \
    README.md \
    *.md \
    test \
    coverage \
    .nyc_output

# Production stage - optimized for size
FROM node:18-alpine AS production

# Set production environment
ENV NODE_ENV=production
ENV PORT=4545
ENV TZ=UTC

# Install production system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    tzdata \
    && npm install -g pm2@latest \
    && npm cache clean --force

# Create app directory
WORKDIR /app

# Copy user configuration from base stage
COPY --from=base /etc/passwd /etc/passwd
COPY --from=base /etc/group /etc/group

# Copy production dependencies
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application and necessary files
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/generated ./generated
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Copy configuration files
COPY --chown=nestjs:nodejs ecosystem.config.js ./

# Create necessary directories with proper permissions
RUN mkdir -p logs tmp uploads \
    && chown -R nestjs:nodejs logs tmp uploads \
    && chmod 755 logs tmp uploads

# Create a startup script for database migrations
COPY --chown=nestjs:nodejs <<EOF /app/start.sh
#!/bin/sh
set -e

echo "🚀 Starting Erazor Server..."

# Run database migrations if needed
if [ "\$RUN_MIGRATIONS" = "true" ]; then
    echo "📦 Running database migrations..."
    npx prisma migrate deploy
fi

# Start the application with PM2
echo "🔥 Starting application with PM2..."
exec pm2-runtime start ecosystem.config.js
EOF

RUN chmod +x /app/start.sh

# Switch to non-root user
USER nestjs

# Expose application port
EXPOSE 4545

# Add labels for better container management
LABEL maintainer="erazor-team"
LABEL version="1.0.0"
LABEL description="Erazor Background Removal SaaS API"

# Health check with better configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:4545/v1/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start with custom script
CMD ["/app/start.sh"]
