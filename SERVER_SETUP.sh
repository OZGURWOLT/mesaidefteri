#!/bin/bash

# Mesaidefteri Sunucu Kurulum Script'i
# Ubuntu Server için tüm kurulum adımları

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Mesaidefteri Sunucu Kurulumu         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# 1. Sistem Güncellemeleri
echo -e "${YELLOW}[1/10] Sistem güncellemeleri yapılıyor...${NC}"
sudo apt update && sudo apt upgrade -y
echo -e "${GREEN}✅ Sistem güncellemeleri tamamlandı${NC}"
echo ""

# 2. Docker Kurulumu
echo -e "${YELLOW}[2/10] Docker kurulumu kontrol ediliyor...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker kuruluyor...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${GREEN}✅ Docker kuruldu${NC}"
else
    echo -e "${GREEN}✅ Docker zaten kurulu${NC}"
fi
echo ""

# 3. Docker Compose Kurulumu
echo -e "${YELLOW}[3/10] Docker Compose kurulumu kontrol ediliyor...${NC}"
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Docker Compose kuruluyor...${NC}"
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose kuruldu${NC}"
else
    echo -e "${GREEN}✅ Docker Compose zaten kurulu${NC}"
fi
echo ""

# 4. Git Kurulumu
echo -e "${YELLOW}[4/10] Git kurulumu kontrol ediliyor...${NC}"
if ! command -v git &> /dev/null; then
    sudo apt install git -y
    echo -e "${GREEN}✅ Git kuruldu${NC}"
else
    echo -e "${GREEN}✅ Git zaten kurulu${NC}"
fi
echo ""

# 5. Proje Klasörü Oluşturma
echo -e "${YELLOW}[5/10] Proje klasörü oluşturuluyor...${NC}"
PROJECT_DIR="/opt/mesaidefteri"
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR
cd $PROJECT_DIR
echo -e "${GREEN}✅ Proje klasörü hazır: $PROJECT_DIR${NC}"
echo ""

# 6. Git Repository Clone
echo -e "${YELLOW}[6/10] Git repository clone ediliyor...${NC}"
if [ -d ".git" ]; then
    echo -e "${YELLOW}Repository zaten var, pull yapılıyor...${NC}"
    git pull origin main
else
    git clone https://github.com/OZGURWOLT/mesaidefteri.git .
fi
echo -e "${GREEN}✅ Repository hazır${NC}"
echo ""

# 7. .env Dosyası Oluşturma
echo -e "${YELLOW}[7/10] .env dosyası oluşturuluyor...${NC}"
if [ ! -f ".env" ]; then
    cp env.example .env
    echo -e "${GREEN}✅ .env dosyası oluşturuldu${NC}"
    echo -e "${RED}⚠️  ÖNEMLİ: .env dosyasını düzenleyip tüm değişkenleri doldurun!${NC}"
    echo ""
    echo -e "${YELLOW}Düzenlemek için:${NC}"
    echo "  nano .env"
    echo ""
    read -p ".env dosyasını şimdi düzenlemek ister misiniz? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        nano .env
    fi
else
    echo -e "${GREEN}✅ .env dosyası zaten var${NC}"
fi
echo ""

# 8. .env Dosyası Kontrolü
echo -e "${YELLOW}[8/10] .env dosyası kontrol ediliyor...${NC}"
if grep -q "your_secure_password_here" .env || grep -q "your_netgsm" .env; then
    echo -e "${RED}⚠️  UYARI: .env dosyasında placeholder değerler var!${NC}"
    echo -e "${YELLOW}Lütfen .env dosyasını düzenleyin:${NC}"
    echo "  nano .env"
    echo ""
    read -p "Devam etmek istiyor musunuz? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Kurulum iptal edildi${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✅ .env dosyası kontrol edildi${NC}"
echo ""

# 9. Docker Servislerini Başlatma
echo -e "${YELLOW}[9/10] Docker servisleri başlatılıyor...${NC}"

# Önce sadece database'i başlat
echo -e "${BLUE}Database başlatılıyor...${NC}"
docker-compose up -d db

# Database'in hazır olmasını bekle
echo -e "${BLUE}Database'in hazır olması bekleniyor...${NC}"
sleep 10

# Database health check
for i in {1..30}; do
    if docker-compose exec -T db pg_isready -U ${POSTGRES_USER:-ebubekir} > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database hazır${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Database başlatılamadı!${NC}"
        exit 1
    fi
    sleep 1
done

# Prisma migration
echo -e "${BLUE}Database migration'ları çalıştırılıyor...${NC}"
docker-compose run --rm app npx prisma migrate deploy || {
    echo -e "${YELLOW}Migration hatası, Prisma client generate ediliyor...${NC}"
    docker-compose run --rm app npx prisma generate
}

# Tüm servisleri başlat
echo -e "${BLUE}Tüm servisler başlatılıyor...${NC}"
docker-compose build
docker-compose up -d

echo -e "${GREEN}✅ Docker servisleri başlatıldı${NC}"
echo ""

# 10. Servis Durumu Kontrolü
echo -e "${YELLOW}[10/10] Servis durumu kontrol ediliyor...${NC}"
sleep 5
docker-compose ps
echo ""

# Health Check
echo -e "${YELLOW}Health check yapılıyor...${NC}"
sleep 10
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Uygulama çalışıyor!${NC}"
else
    echo -e "${YELLOW}⚠️  Health check başarısız, logları kontrol edin:${NC}"
    echo "  docker-compose logs app"
fi
echo ""

# Özet
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Kurulum Tamamlandı!                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📊 Proje Konumu:${NC} $PROJECT_DIR"
echo -e "${GREEN}🌐 Uygulama URL:${NC} http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo -e "${YELLOW}📝 Yararlı Komutlar:${NC}"
echo "  # Logları görüntüle"
echo "  docker-compose logs -f"
echo ""
echo "  # Servisleri yeniden başlat"
echo "  docker-compose restart"
echo ""
echo "  # Servisleri durdur"
echo "  docker-compose down"
echo ""
echo "  # Servisleri güncelle"
echo "  git pull origin main"
echo "  docker-compose build"
echo "  docker-compose up -d"
echo ""
echo -e "${GREEN}✅ Kurulum tamamlandı!${NC}"
