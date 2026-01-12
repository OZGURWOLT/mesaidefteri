#!/bin/bash

# App Container Build ve Başlatma Script'i

set -e

PROJECT_DIR="/opt/mesaidefteri"
cd $PROJECT_DIR

echo "🔨 App container build ediliyor..."
echo ""

# Database'in çalıştığını kontrol et
if ! docker-compose ps db | grep -q "Up"; then
    echo "⚠️  Database çalışmıyor, başlatılıyor..."
    docker-compose up -d db
    sleep 10
fi

echo "✅ Database çalışıyor"
echo ""

# Database hazır olana kadar bekle
echo "⏳ Database'in hazır olması bekleniyor..."
for i in {1..30}; do
    if docker-compose exec -T db pg_isready -U ${POSTGRES_USER:-ebubekir} > /dev/null 2>&1; then
        echo "✅ Database hazır"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Database hazır olmadı!"
        exit 1
    fi
    sleep 1
done

echo ""

# Migration'ları çalıştır
echo "🔄 Database migration'ları çalıştırılıyor..."
docker-compose run --rm app npx prisma migrate deploy || {
    echo "⚠️  Migration hatası, Prisma client generate ediliyor..."
    docker-compose run --rm app npx prisma generate
}

echo ""

# App'i build et
echo "🔨 App container build ediliyor (bu biraz zaman alabilir)..."
docker-compose build --no-cache app

echo ""

# App'i başlat
echo "🚀 App container başlatılıyor..."
docker-compose up -d app

echo ""

# Bekle
sleep 10

# Kontrol
echo "📊 Container durumu:"
docker-compose ps

echo ""
echo "📝 Logları görüntülemek için:"
echo "  docker-compose logs -f app"

echo ""
echo "🏥 Health check:"
sleep 5
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Uygulama çalışıyor!"
else
    echo "⚠️  Health check başarısız, logları kontrol edin:"
    echo "  docker-compose logs app"
fi
