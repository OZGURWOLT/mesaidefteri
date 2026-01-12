#!/bin/bash

# Detaylı Build Script'i - Hata ayıklama için

set -e

PROJECT_DIR="/opt/mesaidefteri"
cd $PROJECT_DIR

echo "🔨 Detaylı build başlatılıyor..."
echo ""

# Güncellemeler
git pull origin main 2>/dev/null || echo "⚠️  Git pull atlandı"

# Cache temizle
echo "🧹 Cache temizleniyor..."
docker system prune -f
docker builder prune -f

# Build (tüm logları göster)
echo "🔨 Build ediliyor (tüm loglar görünecek)..."
echo ""

docker-compose build --no-cache --progress=plain app 2>&1 | tee /tmp/build-full.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo ""
    echo "✅ Build başarılı!"
else
    echo ""
    echo "❌ Build başarısız!"
    echo ""
    echo "🔍 Hata analizi:"
    echo ""
    
    # NPM hatalarını göster
    echo "📦 NPM hataları:"
    grep -i "npm.*error\|npm.*failed\|ERR!" /tmp/build-full.log | tail -20
    
    echo ""
    echo "📋 Son 100 satır:"
    tail -100 /tmp/build-full.log
    
    echo ""
    echo "📝 Tüm log dosyası: /tmp/build-full.log"
    exit 1
fi
