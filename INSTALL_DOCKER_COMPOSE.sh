#!/bin/bash

# Docker Compose Kurulum Script'i
# Ubuntu Server için

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Docker Compose Kurulumu              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Docker Compose kurulumu kontrolü
if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✅ Docker Compose zaten kurulu${NC}"
    docker-compose --version
    exit 0
fi

# Docker kurulumu kontrolü
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker kurulu değil, önce Docker kuruluyor...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${GREEN}✅ Docker kuruldu${NC}"
    echo -e "${YELLOW}⚠️  Docker grubuna eklendiniz. Yeni oturum için: newgrp docker${NC}"
else
    echo -e "${GREEN}✅ Docker zaten kurulu${NC}"
fi

echo ""

# Docker Compose kurulumu (en son versiyon)
echo -e "${YELLOW}Docker Compose kuruluyor...${NC}"

# En son versiyonu indir
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
echo -e "${BLUE}Kurulacak versiyon: $DOCKER_COMPOSE_VERSION${NC}"

# Docker Compose'u indir ve kur
sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Çalıştırılabilir yap
sudo chmod +x /usr/local/bin/docker-compose

# Alternatif: Eğer yukarıdaki başarısız olursa, apt ile kur
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Alternatif yöntem deneniyor (apt)...${NC}"
    sudo apt update
    sudo apt install docker-compose -y
fi

# Kurulum kontrolü
if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✅ Docker Compose başarıyla kuruldu!${NC}"
    docker-compose --version
else
    echo -e "${RED}❌ Docker Compose kurulumu başarısız!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Kurulum tamamlandı!${NC}"
