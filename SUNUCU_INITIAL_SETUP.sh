#!/bin/bash

# Sunucuda İlk Kurulum Script'i
# Boş klasör için repository clone ve kurulum

set -e

PROJECT_DIR="/opt/mesaidefteri"

echo "🚀 Mesaidefteri İlk Kurulum"
echo ""

cd $PROJECT_DIR

# Klasör boş mu kontrol et
if [ "$(ls -A $PROJECT_DIR)" ]; then
    echo "⚠️  Klasör boş değil, mevcut dosyalar:"
    ls -la
    read -p "Devam etmek istiyor musunuz? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Git kurulumu kontrolü
if ! command -v git &> /dev/null; then
    echo "📦 Git kuruluyor..."
    apt update
    apt install git -y
fi

# Repository clone
echo "📥 Repository clone ediliyor..."
git clone https://github.com/OZGURWOLT/mesaidefteri.git .

# İzinleri düzenle
echo "🔐 İzinler düzenleniyor..."
chown -R $USER:$USER .

# Dosyaları kontrol et
echo ""
echo "📁 Dosyalar kontrol ediliyor..."
if [ -f "docker-compose.yml" ]; then
    echo "✅ docker-compose.yml mevcut"
else
    echo "❌ docker-compose.yml bulunamadı!"
    exit 1
fi

if [ -f "Dockerfile" ]; then
    echo "✅ Dockerfile mevcut"
else
    echo "❌ Dockerfile bulunamadı!"
    exit 1
fi

echo ""
echo "✅ Repository başarıyla clone edildi!"
echo ""
echo "📝 Sonraki adımlar:"
echo "  1. .env dosyası oluşturun: cp env.example .env"
echo "  2. .env dosyasını düzenleyin: nano .env"
echo "  3. Docker Compose'u kurun (eğer yoksa)"
echo "  4. Servisleri başlatın: docker-compose up -d"
