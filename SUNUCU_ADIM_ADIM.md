# Sunucuda Adım Adım Kurulum

## Mevcut Durum
- Klasör: `/opt/mesaidefteri` (boş)
- Kullanıcı: root

## 1. Repository Clone

```bash
cd /opt/mesaidefteri
git clone https://github.com/OZGURWOLT/mesaidefteri.git .
```

## 2. Dosyaları Kontrol Et

```bash
ls -la
# Şunlar görünmeli:
# - docker-compose.yml
# - Dockerfile
# - package.json
# - vb.
```

## 3. Docker ve Docker Compose Kurulumu

```bash
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Kontrol
docker --version
docker-compose --version
```

## 4. .env Dosyası

```bash
cd /opt/mesaidefteri
cp env.example .env
nano .env
```

**.env içeriği:**
```env
POSTGRES_USER=ebubekir
POSTGRES_PASSWORD=GÜÇLÜ_ŞİFRE
POSTGRES_DB=mesaidefteri
DATABASE_URL=postgresql://ebubekir:GÜÇLÜ_ŞİFRE@db:5432/mesaidefteri?schema=public

NEXTAUTH_URL=http://YOUR_SERVER_IP:3000
NEXTAUTH_SECRET=GÜÇLÜ_32_KARAKTER_SECRET

NETGSM_USERNAME=4146060654
NETGSM_PASSWORD=T1.69r3E
NETGSM_MSGHEADER=EVDESIPARIS

CRON_API_KEY=GÜÇLÜ_API_KEY

NODE_ENV=production
```

## 5. Servisleri Başlat

```bash
cd /opt/mesaidefteri

# Database başlat
docker-compose up -d db

# Bekle
sleep 15

# Migration
docker-compose run --rm app npx prisma migrate deploy

# Build ve başlat
docker-compose build --no-cache
docker-compose up -d
```

## Tek Komutla Clone

```bash
cd /opt/mesaidefteri && git clone https://github.com/OZGURWOLT/mesaidefteri.git . && ls -la
```
