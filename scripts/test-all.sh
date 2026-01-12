#!/bin/bash
# Comprehensive Test Runner - Database + Application
# Ubuntu 22.04 Production Environment Simulation

set -e

echo "=========================================="
echo "Comprehensive Test Suite"
echo "Database + Application Tests"
echo "Ubuntu 22.04 Production Environment"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  WARNING: DATABASE_URL is not set"
    if [ -f .env ]; then
        echo "📄 Loading environment variables from .env file..."
        export $(cat .env | grep -v '^#' | xargs)
    fi
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ ERROR: Node.js is not installed"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

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

# Run database tests
echo ""
echo "=========================================="
echo "DATABASE TESTS"
echo "=========================================="
echo ""

npm run db:test
DB_EXIT_CODE=$?

echo ""
echo "=========================================="
echo "APPLICATION TESTS"
echo "=========================================="
echo ""

npx tsx scripts/test-application.ts
APP_EXIT_CODE=$?

echo ""
echo "=========================================="
echo "FINAL SUMMARY"
echo "=========================================="
echo ""

if [ $DB_EXIT_CODE -eq 0 ] && [ $APP_EXIT_CODE -eq 0 ]; then
    echo "✅ All tests passed"
    exit 0
else
    echo "❌ Some tests failed"
    echo "   Database tests: $([ $DB_EXIT_CODE -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
    echo "   Application tests: $([ $APP_EXIT_CODE -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
    exit 1
fi
