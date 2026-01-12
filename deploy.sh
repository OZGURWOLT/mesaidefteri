#!/bin/bash

# Git-based Deployment Script
# Local'de geliştirme yapıp Git ile server'a deploy eder

set -e

ENVIRONMENT=${1:-production}
SSH_HOST=${2:-mesaidefteri-prod}
REMOTE_PATH="/opt/mesaidefteri"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Mesaidefteri Git Deployment${NC}"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "SSH Host: ${YELLOW}$SSH_HOST${NC}"
echo ""

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Uncommitted changes detected${NC}"
    read -p "Do you want to commit and push? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}📝 Committing changes...${NC}"
        git add .
        read -p "Commit message: " COMMIT_MSG
        git commit -m "${COMMIT_MSG:-Deployment commit}"
    else
        echo -e "${RED}❌ Deployment cancelled${NC}"
        exit 1
    fi
fi

# Push to GitHub
echo -e "${YELLOW}📤 Pushing to GitHub...${NC}"
git push origin main || {
    echo -e "${RED}❌ Git push failed!${NC}"
    exit 1
}
echo -e "${GREEN}✅ Pushed to GitHub${NC}"
echo ""

# Check SSH connection
echo -e "${YELLOW}🔍 Checking SSH connection...${NC}"
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes $SSH_HOST exit 2>/dev/null; then
    echo -e "${RED}❌ Cannot connect to $SSH_HOST${NC}"
    echo "Please check your SSH configuration"
    exit 1
fi
echo -e "${GREEN}✅ SSH connection OK${NC}"
echo ""

# Deploy on server
echo -e "${YELLOW}🚀 Deploying on server...${NC}"
ssh $SSH_HOST << EOF
  set -e
  cd $REMOTE_PATH || { echo "Directory $REMOTE_PATH not found!"; exit 1; }
  
  echo "📥 Pulling latest changes..."
  git pull origin main || { echo "Git pull failed!"; exit 1; }
  
  echo "🔨 Building Docker image..."
  docker-compose build || { echo "Docker build failed!"; exit 1; }
  
  echo "🛑 Stopping existing containers..."
  docker-compose down || true
  
  echo "🚀 Starting new containers..."
  docker-compose up -d || { echo "Docker compose up failed!"; exit 1; }
  
  echo "🧹 Cleaning up..."
  docker system prune -f
  
  echo "✅ Deployment completed!"
  echo ""
  echo "📊 Container Status:"
  docker-compose ps
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    echo ""
    echo "📝 Useful commands:"
    echo "  View logs: ssh $SSH_HOST 'cd $REMOTE_PATH && docker-compose logs -f'"
    echo "  Restart: ssh $SSH_HOST 'cd $REMOTE_PATH && docker-compose restart'"
    echo "  Health check: curl http://your-server-ip/api/health"
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi
