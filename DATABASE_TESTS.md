# Veritabanı Test Rehberi

Bu doküman, Ubuntu 22.04 production ortamında veritabanı bağlantılarını ve performansını test etmek için hazırlanmıştır.

## Test Senaryoları

### 1. Environment Variables Test
- `DATABASE_URL` environment variable'ının varlığını kontrol eder
- URL formatını doğrular
- Dummy URL (build-time) kontrolü yapar

### 2. Direct PostgreSQL Connection Test
- `pg` client ile doğrudan bağlantı testi
- Connection timeout kontrolü
- Basit query performans testi

### 3. Connection Pool Test
- Connection pool oluşturma
- Concurrent query testleri
- Pool istatistikleri

### 4. Prisma Client Test
- Prisma client initialization
- Lazy import testi (API route'lardaki gibi)
- Basit ve kompleks query testleri

### 5. Database Schema Test
- Kritik tabloların varlığını kontrol eder
- Her tablodaki kayıt sayısını gösterir

### 6. Indexes Test
- Database indexlerini kontrol eder
- Kritik indexlerin varlığını doğrular
- Performans için öneriler sunar

### 7. Query Performance Test
- Basit count query
- Join query performansı
- Aggregation query performansı

### 8. Connection Pool Stress Test
- 20 concurrent query testi
- Pool kapasitesi kontrolü
- Waiting queue analizi

### 9. Error Handling Test
- Invalid query handling
- SQL injection koruması

### 10. Transaction Support Test
- Transaction rollback testi
- Data integrity kontrolü

## Kullanım

### Local Development

```bash
# Environment variable'ları ayarla
export DATABASE_URL="postgresql://user:password@localhost:5432/mesaidefteri?schema=public"

# Test script'ini çalıştır
npm run db:test

# Veya direkt
./scripts/test-database.sh
```

### Docker Environment

```bash
# Docker container içinde
docker-compose exec app ./scripts/test-database-docker.sh

# Veya
docker-compose exec app npm run db:test
```

### Production (Ubuntu Server)

```bash
# SSH ile sunucuya bağlan
ssh user@your-server

# Proje dizinine git
cd /opt/mesaidefteri

# Environment variable'ları kontrol et
echo $DATABASE_URL

# Test script'ini çalıştır
npm run db:test
```

## Beklenen Sonuçlar

### ✅ Başarılı Test
- Tüm testler geçer
- Connection süreleri < 500ms
- Query süreleri < 1000ms
- Pool stress testi başarılı

### ⚠️ Uyarılar
- Yavaş query'ler (> 1000ms)
- Eksik indexler
- Pool waiting queue

### ❌ Hatalar
- Database connection hatası
- Missing tables
- Transaction failures

## Troubleshooting

### Connection Timeout
```bash
# Database server'ın çalıştığını kontrol et
sudo systemctl status postgresql

# Port kontrolü
sudo netstat -tlnp | grep 5432

# Firewall kontrolü
sudo ufw status
```

### Slow Queries
```bash
# Index'leri kontrol et
psql $DATABASE_URL -c "\d+ users"
psql $DATABASE_URL -c "\d+ tasks"

# Query plan analizi
psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT * FROM users WHERE username = 'test';"
```

### Pool Exhaustion
```bash
# Aktif connection'ları kontrol et
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'mesaidefteri';"

# Pool ayarlarını kontrol et
# lib/db-pool.ts dosyasındaki max ve min değerlerini artır
```

## Production Checklist

- [ ] `DATABASE_URL` doğru şekilde ayarlanmış
- [ ] Database server erişilebilir
- [ ] Tüm tablolar mevcut
- [ ] Indexler oluşturulmuş
- [ ] Connection pool ayarları optimize edilmiş
- [ ] Query performansı kabul edilebilir seviyede
- [ ] Error handling testleri geçiyor
- [ ] Transaction support çalışıyor

## Notlar

- Test script'i production database'e yazma yapmaz (sadece okuma)
- Transaction testi bir test kullanıcısı oluşturur ama rollback yapar
- Stress testi 20 concurrent query çalıştırır, pool kapasitesini zorlar
- Tüm testler Ubuntu 22.04 PostgreSQL 16 ile test edilmiştir
