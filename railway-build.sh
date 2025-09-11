#!/bin/bash

# Railway build script
echo "Starting Railway build process..."

# Install dependencies
pnpm install --frozen-lockfile

# Generate Prisma client
pnpm prisma generate

# Build the application
pnpm build

echo "Build process completed successfully!"
