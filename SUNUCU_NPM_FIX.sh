#!/bin/bash

# NPM Install Hatası Düzeltme Script'i

set -e

PROJECT_DIR="/opt/mesaidefteri"
cd $PROJECT_DIR

echo "🔧 NPM install hatası düzeltiliyor..."
echo ""

# 1. Güncellemeleri çek
echo "📥 Güncellemeler çekiliyor..."
git pull origin main || echo "⚠️  Git pull başarısız"

# 2. package-lock.json'ı geçici olarak kaldır (eğer sorun çıkarıyorsa)
if [ -f "package-lock.json" ]; then
    echo "📦 package-lock.json yedekleniyor..."
    cp package-lock.json package-lock.json.backup
fi

# 3. Docker cache temizle
echo "🧹 Docker cache temizleniyor..."
docker system prune -f
docker builder prune -f

# 4. Build'i dene
echo "🔨 Build ediliyor (detaylı log)..."
echo ""

docker-compose build --no-cache --progress=plain app 2>&1 | tee /tmp/build.log

BUILD_EXIT_CODE=${PIPESTATUS[0]}

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Build başarılı!"
    
    # Migration
    echo "🔄 Migration'lar..."
    docker-compose run --rm app npx prisma migrate deploy || docker-compose run --rm app npx prisma generate
    
    # App başlat
    docker-compose up -d app
    
    echo ""
    echo "✅ Tamamlandı!"
    docker-compose ps
else
    echo ""
    echo "❌ Build başarısız!"
    echo ""
    echo "📋 Hata detayları:"
    grep -A 20 -B 5 "error\|Error\|ERROR\|failed\|Failed" /tmp/build.log | tail -50
    echo ""
    echo "📝 Tüm log: cat /tmp/build.log"
    exit 1
fi
