#!/bin/bash

# SSH Server Kurulum ve Yapılandırma Script'i

set -e

echo "🔐 SSH Server Kurulumu"
echo ""

# SSH server kurulumu kontrolü
if systemctl is-active --quiet ssh || systemctl is-active --quiet sshd; then
    echo "✅ SSH server zaten çalışıyor"
else
    echo "📦 SSH server kuruluyor..."
    apt update
    apt install openssh-server -y
    systemctl start ssh
    systemctl enable ssh
    echo "✅ SSH server kuruldu ve başlatıldı"
fi

echo ""

# SSH durumu
echo "📊 SSH durumu:"
systemctl status ssh --no-pager | head -5

echo ""

# Firewall kontrolü
if command -v ufw &> /dev/null; then
    echo "🔥 Firewall kontrolü..."
    if ufw status | grep -q "22/tcp"; then
        echo "✅ SSH portu (22) firewall'da açık"
    else
        echo "⚠️  SSH portu firewall'da kapalı, açılıyor..."
        ufw allow 22/tcp
    fi
else
    echo "⚠️  UFW kurulu değil, firewall kontrol edilemedi"
fi

echo ""

# SSH config önerileri
echo "📝 SSH yapılandırma önerileri:"
echo "  1. /etc/ssh/sshd_config dosyasını düzenleyin:"
echo "     sudo nano /etc/ssh/sshd_config"
echo ""
echo "  2. Önerilen ayarlar:"
echo "     - PermitRootLogin: no (güvenlik için)"
echo "     - PasswordAuthentication: no (key-based için)"
echo "     - PubkeyAuthentication: yes"
echo ""
echo "  3. Değişikliklerden sonra:"
echo "     sudo systemctl restart ssh"
echo ""

# Aktif bağlantılar
echo "👥 Aktif SSH bağlantıları:"
who

echo ""
echo "✅ SSH kurulum kontrolü tamamlandı!"
