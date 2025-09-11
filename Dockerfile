# Use Node.js LTS version
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Build the application
RUN pnpm build

# Production stage
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Install pnpm and PM2
RUN npm install -g pnpm pm2

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma

# Copy PM2 ecosystem config
COPY ecosystem.config.js ./

# Create logs directory
RUN mkdir -p logs

# Expose port (Railway will inject PORT environment variable)
EXPOSE 4545

# Start the application with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
