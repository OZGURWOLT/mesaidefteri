#!/bin/bash
# Database Test Runner for Docker Environment
# Ubuntu 22.04 Production Environment Simulation

set -e

echo "=========================================="
echo "Database Tests - Docker Environment"
echo "Ubuntu 22.04 Production Simulation"
echo "=========================================="
echo ""

# Check if running in Docker
if [ -f /.dockerenv ]; then
    echo "🐳 Running inside Docker container"
else
    echo "⚠️  WARNING: Not running inside Docker"
    echo "   This script is designed for Docker environments"
fi

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL is not set"
    echo "   Please set DATABASE_URL environment variable"
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Check if we can connect to database
echo "🔍 Testing database connection..."
timeout 5 psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful"
else
    echo "❌ ERROR: Cannot connect to database"
    echo "   Please check DATABASE_URL and database server status"
    exit 1
fi

echo ""

# Run Node.js tests
echo "🚀 Running Node.js database tests..."
echo ""

# Use npm run if available, otherwise direct ts-node
if npm run db:test 2>/dev/null; then
    EXIT_CODE=$?
else
    npx ts-node scripts/test-database.ts
    EXIT_CODE=$?
fi

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ All database tests passed"
else
    echo "❌ Database tests failed"
fi

exit $EXIT_CODE
