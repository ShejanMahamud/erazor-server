#!/bin/bash

# Railway start script
echo "Starting Railway application..."

# Run database migrations
pnpm prisma migrate deploy

# Start the application
node dist/main.js
