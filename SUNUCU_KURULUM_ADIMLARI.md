# Sunucu Kurulum Adımları - Terminal Komutları

Sunucu terminalinde **sırayla** şu komutları çalıştırın:

## 1. Docker ve Docker Compose Kurulumu

```bash
# Docker kurulumu (eğer yoksa)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
rm get-docker.sh
newgrp docker

# Docker Compose kurulumu
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Kontrol
docker --version
docker-compose --version
```

## 2. Proje Klasörü ve Repository

```bash
# Proje klasörü oluştur
sudo mkdir -p /opt/mesaidefteri
cd /opt/mesaidefteri

# Repository clone
sudo git clone https://github.com/OZGURWOLT/mesaidefteri.git .
sudo chown -R $USER:$USER .
```

## 3. .env Dosyası Oluşturma

```bash
# .env dosyası oluştur
cp env.example .env

# .env dosyasını düzenle
nano .env
```

**.env dosyasında şunları doldurun:**

```env
POSTGRES_USER=ebubekir
POSTGRES_PASSWORD=GÜÇLÜ_ŞİFRE_BURAYA
POSTGRES_DB=mesaidefteri
DATABASE_URL=postgresql://ebubekir:GÜÇLÜ_ŞİFRE_BURAYA@db:5432/mesaidefteri?schema=public

NEXTAUTH_URL=http://YOUR_SERVER_IP:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)

NETGSM_USERNAME=4146060654
NETGSM_PASSWORD=T1.69r3E
NETGSM_MSGHEADER=EVDESIPARIS

CRON_API_KEY=$(openssl rand -base64 32)

NODE_ENV=production
```

**Not:** `$(openssl rand -base64 32)` komutlarını terminal'de çalıştırıp çıkan değerleri kopyalayın.

## 4. Docker Servislerini Başlatma

```bash
cd /opt/mesaidefteri

# Önce database'i başlat
docker-compose up -d db

# Database hazır olana kadar bekle (15 saniye)
sleep 15

# Database kontrolü
docker-compose exec db pg_isready -U ebubekir

# Migration'ları çalıştır
docker-compose run --rm app npx prisma migrate deploy

# Tüm servisleri build et ve başlat
docker-compose build --no-cache
docker-compose up -d
```

## 5. Kontrol ve Test

```bash
# Servis durumu
docker-compose ps

# Logları görüntüle
docker-compose logs -f

# Health check
curl http://localhost:3000/api/health
```

## Hızlı Kurulum (Tek Script)

Eğer `INSTALL_DOCKER_COMPOSE.sh` script'i varsa:

```bash
cd /opt/mesaidefteri
chmod +x INSTALL_DOCKER_COMPOSE.sh
./INSTALL_DOCKER_COMPOSE.sh
```

## Sorun Giderme

### Docker Compose bulunamıyor
```bash
# PATH kontrolü
echo $PATH

# Manuel kurulum
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Alternatif: apt ile
sudo apt update
sudo apt install docker-compose -y
```

### Permission denied
```bash
# Kullanıcıyı docker grubuna ekle
sudo usermod -aG docker $USER
newgrp docker
```

### Build hatası
```bash
# Cache temizle
docker system prune -f
docker builder prune -f

# Tekrar build et
docker-compose build --no-cache
```
