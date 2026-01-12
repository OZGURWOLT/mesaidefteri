# Mesaidefteri - Production Deployment Guide

Bu doküman, Mesaidefteri uygulamasını Ubuntu Server'da Docker ile production ortamına deploy etmek için adım adım rehberdir.

## Gereksinimler

- Ubuntu Server 20.04+ (veya benzer Linux dağıtımı)
- Docker 20.10+
- Docker Compose 2.0+
- Minimum 2GB RAM, 20GB disk alanı
- Domain adı (SSL sertifikası için)

## 1. Sunucu Hazırlığı

### Docker ve Docker Compose Kurulumu

```bash
# Güncellemeleri yap
sudo apt update && sudo apt upgrade -y

# Docker kurulumu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose kurulumu
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Docker'ı başlat
sudo systemctl start docker
sudo systemctl enable docker

# Kullanıcıyı docker grubuna ekle (opsiyonel, sudo kullanmadan çalıştırmak için)
sudo usermod -aG docker $USER
newgrp docker
```

## 2. Proje Kurulumu

```bash
# Projeyi klonla veya yükle
cd /opt
sudo git clone <repository-url> mesaidefteri
# veya
sudo mkdir -p /opt/mesaidefteri
# Dosyaları buraya kopyala

cd /opt/mesaidefteri

# Environment dosyasını oluştur
sudo cp .env.example .env
sudo nano .env
# Tüm değişkenleri doldur
```

### Önemli Environment Değişkenleri

```bash
# Güçlü şifreler kullan
POSTGRES_PASSWORD=Güçlü_Şifre_Buraya_123!

# NextAuth secret oluştur (32+ karakter)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Domain adınızı girin
NEXTAUTH_URL=https://yourdomain.com

# NetGSM bilgilerinizi girin
NETGSM_USERNAME=your_username
NETGSM_PASSWORD=your_password
NETGSM_MSGHEADER=your_header

# Cron API key oluştur
CRON_API_KEY=$(openssl rand -base64 32)
```

## 3. SSL Sertifikası (Let's Encrypt)

```bash
# Certbot kurulumu
sudo apt install certbot -y

# Sertifika oluştur (domain adınızı girin)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Sertifikaları nginx klasörüne kopyala
sudo mkdir -p /opt/mesaidefteri/nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/mesaidefteri/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/mesaidefteri/nginx/ssl/key.pem
sudo chmod 644 /opt/mesaidefteri/nginx/ssl/cert.pem
sudo chmod 600 /opt/mesaidefteri/nginx/ssl/key.pem
```

## 4. Veritabanı Migrasyonu

```bash
# Docker container'ları başlat (sadece database)
docker-compose -f docker-compose.prod.yml up -d db

# Birkaç saniye bekle (database hazır olana kadar)
sleep 10

# Prisma migrate çalıştır
docker-compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy

# Seed çalıştır (opsiyonel)
docker-compose -f docker-compose.prod.yml run --rm app npm run db:seed
```

## 5. Uygulamayı Başlatma

```bash
# Tüm servisleri build et ve başlat
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Logları kontrol et
docker-compose -f docker-compose.prod.yml logs -f
```

## 6. Health Check

```bash
# Health check endpoint'ini test et
curl http://localhost/api/health

# Veya browser'dan
https://yourdomain.com/api/health
```

## 7. Firewall Yapılandırması

```bash
# UFW firewall kurulumu
sudo apt install ufw -y

# HTTP ve HTTPS portlarını aç
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# SSH'ı aç (dikkatli olun!)
sudo ufw allow 22/tcp

# Firewall'u aktif et
sudo ufw enable
sudo ufw status
```

## 8. Otomatik Güncellemeler (Opsiyonel)

### SSL Sertifika Yenileme

```bash
# Crontab'a ekle (her ay yenile)
sudo crontab -e

# Şu satırı ekle:
0 3 1 * * certbot renew --quiet && docker-compose -f /opt/mesaidefteri/docker-compose.prod.yml restart nginx
```

### Backup Script

`/opt/mesaidefteri/backup.sh` dosyası oluştur:

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/mesaidefteri"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
docker-compose -f /opt/mesaidefteri/docker-compose.prod.yml exec -T db pg_dump -U ebubekir mesaidefteri > $BACKUP_DIR/db_$DATE.sql

# Eski backup'ları sil (30 günden eski)
find $BACKUP_DIR -name "db_*.sql" -mtime +30 -delete
```

```bash
chmod +x /opt/mesaidefteri/backup.sh

# Crontab'a ekle (her gün saat 2'de)
0 2 * * * /opt/mesaidefteri/backup.sh
```

## 9. Monitoring ve Logging

### Logları Görüntüleme

```bash
# Tüm servislerin logları
docker-compose -f docker-compose.prod.yml logs -f

# Sadece app logları
docker-compose -f docker-compose.prod.yml logs -f app

# Son 100 satır
docker-compose -f docker-compose.prod.yml logs --tail=100 app
```

### Container Durumu

```bash
# Container durumlarını kontrol et
docker-compose -f docker-compose.prod.yml ps

# Resource kullanımı
docker stats
```

## 10. Güncelleme İşlemi

```bash
cd /opt/mesaidefteri

# Yeni kodu çek
git pull origin main

# Yeni image'ları build et
docker-compose -f docker-compose.prod.yml build

# Servisleri yeniden başlat
docker-compose -f docker-compose.prod.yml up -d

# Database migration (gerekirse)
docker-compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
```

## 11. Sorun Giderme

### Container'lar başlamıyor

```bash
# Logları kontrol et
docker-compose -f docker-compose.prod.yml logs

# Container'ları yeniden oluştur
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Database bağlantı hatası

```bash
# Database container'ının çalıştığını kontrol et
docker-compose -f docker-compose.prod.yml ps db

# Database loglarını kontrol et
docker-compose -f docker-compose.prod.yml logs db

# Environment değişkenlerini kontrol et
docker-compose -f docker-compose.prod.yml config
```

### Port çakışması

```bash
# Port kullanımını kontrol et
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# docker-compose.prod.yml'de port numaralarını değiştir
```

## 12. Güvenlik Kontrolleri

- [ ] Environment dosyasında güçlü şifreler kullanıldı
- [ ] SSL sertifikası geçerli ve güncel
- [ ] Firewall aktif ve doğru yapılandırılmış
- [ ] Database sadece localhost'tan erişilebilir
- [ ] Düzenli backup alınıyor
- [ ] Loglar düzenli kontrol ediliyor
- [ ] Container'lar non-root user ile çalışıyor

## Destek

Sorun yaşarsanız:
1. Logları kontrol edin: `docker-compose -f docker-compose.prod.yml logs`
2. Health check endpoint'ini test edin: `/api/health`
3. Container durumlarını kontrol edin: `docker-compose -f docker-compose.prod.yml ps`
