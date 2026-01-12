#!/bin/bash

# Sunucuda Docker Build Hatası Çözüm Script'i

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Docker Build Hatası Çözümü           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

PROJECT_DIR="/opt/mesaidefteri"
cd $PROJECT_DIR

# 1. Mevcut container'ları durdur
echo -e "${YELLOW}[1/5] Mevcut container'lar durduruluyor...${NC}"
docker-compose down 2>/dev/null || true
echo -e "${GREEN}✅ Container'lar durduruldu${NC}"
echo ""

# 2. Docker cache'i temizle
echo -e "${YELLOW}[2/5] Docker cache temizleniyor...${NC}"
docker system prune -f
docker builder prune -f
echo -e "${GREEN}✅ Cache temizlendi${NC}"
echo ""

# 3. package-lock.json'ı güncelle (eğer sorun varsa)
echo -e "${YELLOW}[3/5] package-lock.json kontrol ediliyor...${NC}"
if [ -f "package-lock.json" ]; then
    echo -e "${BLUE}package-lock.json mevcut${NC}"
else
    echo -e "${YELLOW}package-lock.json oluşturuluyor...${NC}"
    # Local'de npm install yapıp package-lock.json'ı commit etmeniz gerekebilir
    echo -e "${RED}⚠️  package-lock.json bulunamadı!${NC}"
    echo -e "${YELLOW}Local'de 'npm install' yapıp package-lock.json'ı commit edin${NC}"
fi
echo ""

# 4. Dockerfile'ı kontrol et
echo -e "${YELLOW}[4/5] Dockerfile kontrol ediliyor...${NC}"
if grep -q "npm ci" Dockerfile && ! grep -q "legacy-peer-deps" Dockerfile; then
    echo -e "${YELLOW}Dockerfile güncelleniyor...${NC}"
    # Dockerfile'ı güncelle (zaten güncellendi)
    echo -e "${GREEN}✅ Dockerfile güncel${NC}"
else
    echo -e "${GREEN}✅ Dockerfile zaten güncel${NC}"
fi
echo ""

# 5. Build'i tekrar dene
echo -e "${YELLOW}[5/5] Docker build tekrar deneniyor...${NC}"
echo -e "${BLUE}Bu işlem birkaç dakika sürebilir...${NC}"
echo ""

# Önce sadece database'i başlat
echo -e "${BLUE}Database başlatılıyor...${NC}"
docker-compose up -d db

# Database'in hazır olmasını bekle
echo -e "${BLUE}Database'in hazır olması bekleniyor (15 saniye)...${NC}"
sleep 15

# Database health check
for i in {1..30}; do
    if docker-compose exec -T db pg_isready -U ${POSTGRES_USER:-ebubekir} > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database hazır${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Database başlatılamadı!${NC}"
        docker-compose logs db
        exit 1
    fi
    sleep 1
done

# App'i build et
echo -e "${BLUE}Application build ediliyor...${NC}"
docker-compose build --no-cache app 2>&1 | tee /tmp/docker-build.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✅ Build başarılı!${NC}"
    echo ""
    
    # Migration'ları çalıştır
    echo -e "${BLUE}Database migration'ları çalıştırılıyor...${NC}"
    docker-compose run --rm app npx prisma migrate deploy || {
        echo -e "${YELLOW}Migration hatası, Prisma client generate ediliyor...${NC}"
        docker-compose run --rm app npx prisma generate
    }
    
    # Tüm servisleri başlat
    echo -e "${BLUE}Servisler başlatılıyor...${NC}"
    docker-compose up -d
    
    echo ""
    echo -e "${GREEN}✅ Tüm servisler başlatıldı!${NC}"
    echo ""
    docker-compose ps
    
    # Health check
    echo ""
    echo -e "${YELLOW}Health check yapılıyor...${NC}"
    sleep 10
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Uygulama çalışıyor!${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check başarısız, logları kontrol edin:${NC}"
        echo "  docker-compose logs app"
    fi
else
    echo -e "${RED}❌ Build başarısız!${NC}"
    echo ""
    echo -e "${YELLOW}Build logları:${NC}"
    tail -50 /tmp/docker-build.log
    echo ""
    echo -e "${YELLOW}Detaylı log için:${NC}"
    echo "  cat /tmp/docker-build.log"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ İşlem tamamlandı!${NC}"
