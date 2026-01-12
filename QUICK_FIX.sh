#!/bin/bash

# Hızlı Düzeltme Script'i
# docker-compose.yml bulunamadı hatası için

set -e

PROJECT_DIR="/opt/mesaidefteri"

echo "🔍 Proje klasörü kontrol ediliyor..."
cd $PROJECT_DIR || {
    echo "❌ /opt/mesaidefteri klasörü bulunamadı!"
    echo "Önce projeyi clone edin:"
    echo "  sudo mkdir -p /opt/mesaidefteri"
    echo "  cd /opt/mesaidefteri"
    echo "  sudo git clone https://github.com/OZGURWOLT/mesaidefteri.git ."
    exit 1
}

echo "✅ Klasör: $(pwd)"
echo ""

echo "📁 Dosyalar kontrol ediliyor..."
if [ ! -f "docker-compose.yml" ]; then
    echo "⚠️  docker-compose.yml bulunamadı!"
    echo "📥 Repository'den çekiliyor..."
    git pull origin main || {
        echo "❌ Git pull başarısız! Repository'yi clone edin:"
        echo "  git clone https://github.com/OZGURWOLT/mesaidefteri.git ."
        exit 1
    }
fi

if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml hala bulunamadı!"
    echo "📝 Manuel oluşturuluyor..."
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    container_name: mesaidefteri-app
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public
    depends_on:
      - db

  db:
    container_name: mesaidefteri-db
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:
EOF
    echo "✅ docker-compose.yml oluşturuldu"
else
    echo "✅ docker-compose.yml mevcut"
fi

echo ""
echo "📋 Dosya listesi:"
ls -la docker-compose.yml Dockerfile .env 2>/dev/null || echo "⚠️  Bazı dosyalar eksik"

echo ""
echo "✅ Hazır! Şimdi çalıştırabilirsiniz:"
echo "  docker-compose up -d db"
