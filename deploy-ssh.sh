#!/bin/bash

# SSH Deployment Script for Mesaidefteri
# Usage: ./deploy-ssh.sh [environment] [ssh-host]

set -e

ENVIRONMENT=${1:-production}
SSH_HOST=${2:-mesaidefteri-prod}
REMOTE_PATH="/opt/mesaidefteri"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Mesaidefteri SSH Deployment${NC}"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "SSH Host: ${YELLOW}$SSH_HOST${NC}"
echo ""

# Check if SSH host is reachable
echo -e "${YELLOW}🔍 Checking SSH connection...${NC}"
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes $SSH_HOST exit 2>/dev/null; then
    echo -e "${RED}❌ Cannot connect to $SSH_HOST${NC}"
    echo "Please check your SSH configuration in ~/.ssh/config"
    exit 1
fi
echo -e "${GREEN}✅ SSH connection OK${NC}"
echo ""

# Build locally
echo -e "${YELLOW}📦 Building Docker image locally...${NC}"
docker build -t mesaidefteri:latest . || {
    echo -e "${RED}❌ Docker build failed!${NC}"
    exit 1
}
echo -e "${GREEN}✅ Build completed${NC}"
echo ""

# Save image to tar
echo -e "${YELLOW}💾 Saving image to tar...${NC}"
docker save mesaidefteri:latest | gzip > mesaidefteri-latest.tar.gz
IMAGE_SIZE=$(du -h mesaidefteri-latest.tar.gz | cut -f1)
echo -e "${GREEN}✅ Image saved (${IMAGE_SIZE})${NC}"
echo ""

# Copy to server
echo -e "${YELLOW}📤 Uploading to server...${NC}"
scp mesaidefteri-latest.tar.gz $SSH_HOST:/tmp/ || {
    echo -e "${RED}❌ Upload failed!${NC}"
    rm -f mesaidefteri-latest.tar.gz
    exit 1
}
echo -e "${GREEN}✅ Upload completed${NC}"
echo ""

# Deploy on server
echo -e "${YELLOW}🚀 Deploying on server...${NC}"
ssh $SSH_HOST << EOF
  set -e
  cd $REMOTE_PATH || { echo "Directory $REMOTE_PATH not found!"; exit 1; }
  
  echo "Loading Docker image..."
  docker load < /tmp/mesaidefteri-latest.tar.gz
  
  echo "Stopping existing containers..."
  docker-compose down || true
  
  echo "Starting new containers..."
  docker-compose up -d
  
  echo "Cleaning up..."
  docker system prune -f
  rm -f /tmp/mesaidefteri-latest.tar.gz
  
  echo "Checking container status..."
  docker-compose ps
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    echo ""
    echo "📊 Container Status:"
    ssh $SSH_HOST "cd $REMOTE_PATH && docker-compose ps"
    echo ""
    echo "📝 Useful commands:"
    echo "  View logs: ssh $SSH_HOST 'cd $REMOTE_PATH && docker-compose logs -f'"
    echo "  Restart: ssh $SSH_HOST 'cd $REMOTE_PATH && docker-compose restart'"
    echo "  Health check: curl http://your-server-ip/api/health"
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi

# Cleanup local tar
rm -f mesaidefteri-latest.tar.gz
