#!/bin/bash

# Mesaidefteri Deployment Script
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.prod.yml"

echo "🚀 Mesaidefteri Deployment Script"
echo "Environment: $ENVIRONMENT"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please copy .env.example to .env and fill in the values."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose not found!${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Building Docker images...${NC}"
docker-compose -f $COMPOSE_FILE build --no-cache

echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f $COMPOSE_FILE down

echo -e "${YELLOW}🗄️  Starting database...${NC}"
docker-compose -f $COMPOSE_FILE up -d db

echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
sleep 10

# Check database health
for i in {1..30}; do
    if docker-compose -f $COMPOSE_FILE exec -T db pg_isready -U ${POSTGRES_USER:-ebubekir} > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Database failed to start!${NC}"
        exit 1
    fi
    sleep 1
done

echo -e "${YELLOW}🔄 Running database migrations...${NC}"
docker-compose -f $COMPOSE_FILE run --rm app npx prisma migrate deploy || {
    echo -e "${YELLOW}⚠️  Migration failed, trying to generate Prisma client...${NC}"
    docker-compose -f $COMPOSE_FILE run --rm app npx prisma generate
}

echo -e "${YELLOW}🚀 Starting all services...${NC}"
docker-compose -f $COMPOSE_FILE up -d

echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 15

# Health check
echo -e "${YELLOW}🏥 Checking service health...${NC}"
for i in {1..10}; do
    if curl -f http://localhost/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Application is healthy!${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ Health check failed!${NC}"
        echo "Checking logs..."
        docker-compose -f $COMPOSE_FILE logs --tail=50 app
        exit 1
    fi
    sleep 2
done

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "📊 Container Status:"
docker-compose -f $COMPOSE_FILE ps

echo ""
echo "📝 Useful commands:"
echo "  View logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "  Stop all: docker-compose -f $COMPOSE_FILE down"
echo "  Restart: docker-compose -f $COMPOSE_FILE restart"
echo "  Health check: curl http://localhost/api/health"
