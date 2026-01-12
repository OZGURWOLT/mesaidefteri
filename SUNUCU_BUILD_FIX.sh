#!/bin/bash

# Build Hatası Düzeltme Script'i

set -e

PROJECT_DIR="/opt/mesaidefteri"
cd $PROJECT_DIR

echo "🔧 Build hatası düzeltiliyor..."
echo ""

# 1. Güncellemeleri çek
echo "📥 Güncellemeler çekiliyor..."
git pull origin main || echo "⚠️  Git pull başarısız, devam ediliyor..."

# 2. Docker cache temizle
echo "🧹 Docker cache temizleniyor..."
docker system prune -f
docker builder prune -f

# 3. Mevcut container'ları durdur
echo "🛑 Mevcut container'lar durduruluyor..."
docker-compose down app 2>/dev/null || true

# 4. Build'i tekrar dene
echo "🔨 App build ediliyor (bu 5-10 dakika sürebilir)..."
echo ""

# Build loglarını göster
docker-compose build --no-cache --progress=plain app 2>&1 | tee /tmp/build.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo ""
    echo "✅ Build başarılı!"
    echo ""
    
    # Migration
    echo "🔄 Migration'lar çalıştırılıyor..."
    docker-compose run --rm app npx prisma migrate deploy || {
        echo "⚠️  Migration hatası, Prisma generate ediliyor..."
        docker-compose run --rm app npx prisma generate
    }
    
    # App'i başlat
    echo "🚀 App başlatılıyor..."
    docker-compose up -d app
    
    sleep 10
    
    echo ""
    echo "📊 Container durumu:"
    docker-compose ps
    
    echo ""
    echo "🏥 Health check:"
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✅ Uygulama çalışıyor!"
    else
        echo "⚠️  Health check başarısız, logları kontrol edin:"
        echo "  docker-compose logs app"
    fi
else
    echo ""
    echo "❌ Build başarısız!"
    echo ""
    echo "📋 Son 50 satır log:"
    tail -50 /tmp/build.log
    echo ""
    echo "📝 Tüm log için:"
    echo "  cat /tmp/build.log"
    exit 1
fi
