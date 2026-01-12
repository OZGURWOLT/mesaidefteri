# Docker Compose "no configuration file" Hatası Çözümü

## Sorun
`docker-compose.yml` dosyası bulunamıyor.

## Çözüm Adımları

### 1. Proje Klasörüne Gidin

```bash
cd /opt/mesaidefteri
```

### 2. Dosyanın Varlığını Kontrol Edin

```bash
# docker-compose.yml dosyasını kontrol et
ls -la docker-compose.yml

# Eğer yoksa, repository'den çekin
git pull origin main
```

### 3. Eğer Dosya Yoksa, Manuel Oluşturun

```bash
cd /opt/mesaidefteri
nano docker-compose.yml
```

Aşağıdaki içeriği yapıştırın:

```yaml
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
      # Override DATABASE_URL to use service name 'db' instead of localhost
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
```

**Ctrl+O** ile kaydedin, **Enter** ile onaylayın, **Ctrl+X** ile çıkın.

### 4. Dosya İzinlerini Kontrol Edin

```bash
chmod 644 docker-compose.yml
ls -la docker-compose.yml
```

### 5. Docker Compose'u Tekrar Çalıştırın

```bash
# Doğru dizinde olduğunuzdan emin olun
pwd
# Çıktı: /opt/mesaidefteri olmalı

# Docker Compose'u çalıştır
docker-compose up -d db
```

## Hızlı Çözüm (Tek Komut)

```bash
cd /opt/mesaidefteri && \
git pull origin main && \
ls -la docker-compose.yml && \
docker-compose --version
```

## Alternatif: docker compose (v2)

Eğer `docker-compose` çalışmıyorsa, yeni Docker Compose V2 kullanın:

```bash
# docker compose (boşluklu, v2)
docker compose up -d db
```

## Sorun Devam Ederse

```bash
# Mevcut dizini kontrol et
pwd

# Dosyaları listele
ls -la

# Repository durumunu kontrol et
git status

# Tüm dosyaları çek
git pull origin main --force
```
