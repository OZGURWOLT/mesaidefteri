#!/bin/bash
# Database Test Runner Script
# Ubuntu 22.04 Production Environment Simulation

set -e

echo "=========================================="
echo "Database Connection & Performance Tests"
echo "Ubuntu 22.04 Production Environment"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  WARNING: DATABASE_URL is not set"
    echo "   Using default connection string"
    export DATABASE_URL="postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public"
fi

# Check if .env file exists
if [ -f .env ]; then
    echo "📄 Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ ERROR: Node.js is not installed"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if ts-node is available
if ! command -v ts-node &> /dev/null; then
    echo "📦 Installing ts-node..."
    npm install -g ts-node typescript
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run Prisma generate if needed
if [ ! -d "node_modules/.prisma" ]; then
    echo "🔧 Generating Prisma client..."
    npx prisma generate
fi

# Run the test script
echo ""
echo "🚀 Running database tests..."
echo ""

npx ts-node scripts/test-database.ts

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ All tests completed"
else
    echo "❌ Tests failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE
