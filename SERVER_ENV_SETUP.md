# Sunucu .env Dosyası Kurulum Rehberi

## Hızlı Kurulum

Sunucu terminalinde şu komutları çalıştırın:

```bash
# 1. Proje klasörüne gidin
cd /opt/mesaidefteri

# 2. .env dosyasını oluşturun (eğer yoksa)
cp env.example .env

# 3. .env dosyasını düzenleyin
nano .env
```

## .env Dosyası İçeriği

Aşağıdaki değerleri doldurun:

```env
# Database Configuration
POSTGRES_USER=ebubekir
POSTGRES_PASSWORD=GÜÇLÜ_ŞİFRE_BURAYA
POSTGRES_DB=mesaidefteri
DATABASE_URL=postgresql://ebubekir:GÜÇLÜ_ŞİFRE_BURAYA@db:5432/mesaidefteri?schema=public

# NextAuth Configuration
NEXTAUTH_URL=https://yourdomain.com
# veya IP kullanıyorsanız:
# NEXTAUTH_URL=http://YOUR_SERVER_IP:3000
NEXTAUTH_SECRET=GÜÇLÜ_32_KARAKTERLİK_SECRET_BURAYA

# NetGSM SMS Configuration
NETGSM_USERNAME=4146060654
NETGSM_PASSWORD=T1.69r3E
NETGSM_MSGHEADER=EVDESIPARIS
NETGSM_PARTNERCODE=

# Cron Job API Key (güçlü bir key oluşturun)
CRON_API_KEY=GÜÇLÜ_API_KEY_BURAYA

# Node Environment
NODE_ENV=production
```

## Önemli Değerler

### 1. POSTGRES_PASSWORD
Güçlü bir şifre kullanın (min 12 karakter, büyük/küçük harf, sayı, özel karakter)

### 2. NEXTAUTH_SECRET
32+ karakterlik rastgele string. Oluşturmak için:
```bash
openssl rand -base64 32
```

### 3. NEXTAUTH_URL
- Domain kullanıyorsanız: `https://yourdomain.com`
- IP kullanıyorsanız: `http://YOUR_SERVER_IP:3000`

### 4. CRON_API_KEY
Güçlü bir API key. Oluşturmak için:
```bash
openssl rand -base64 32
```

## Otomatik Kurulum Script'i

Tüm kurulumu otomatik yapmak için:

```bash
# Script'i indirin ve çalıştırın
cd /opt
sudo mkdir -p mesaidefteri
cd mesaidefteri
sudo git clone https://github.com/OZGURWOLT/mesaidefteri.git .
sudo chown -R $USER:$USER .

# Kurulum script'ini çalıştırın
chmod +x SERVER_SETUP.sh
./SERVER_SETUP.sh
```

## Manuel Kurulum Adımları

### 1. Docker Kurulumu
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Docker Compose Kurulumu
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. Proje Kurulumu
```bash
cd /opt
sudo mkdir -p mesaidefteri
cd mesaidefteri
sudo git clone https://github.com/OZGURWOLT/mesaidefteri.git .
sudo chown -R $USER:$USER .
```

### 4. .env Dosyası
```bash
cp env.example .env
nano .env
# Yukarıdaki değerleri doldurun
```

### 5. Servisleri Başlatma
```bash
# Database'i başlat
docker-compose up -d db

# Database hazır olana kadar bekle (10 saniye)
sleep 10

# Migration'ları çalıştır
docker-compose run --rm app npx prisma migrate deploy

# Tüm servisleri başlat
docker-compose build
docker-compose up -d
```

## Kontrol Komutları

```bash
# Servis durumu
docker-compose ps

# Logları görüntüle
docker-compose logs -f

# Health check
curl http://localhost:3000/api/health

# Database bağlantısı
docker-compose exec db psql -U ebubekir -d mesaidefteri -c "SELECT version();"
```

## Sorun Giderme

### Database bağlantı hatası
```bash
# Database loglarını kontrol et
docker-compose logs db

# Database'i yeniden başlat
docker-compose restart db
```

### Port çakışması
```bash
# Port kullanımını kontrol et
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :5432

# docker-compose.yml'de port numaralarını değiştirin
```

### Permission hatası
```bash
# Kullanıcıyı docker grubuna ekle
sudo usermod -aG docker $USER
newgrp docker
```
