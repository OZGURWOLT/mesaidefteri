# Uygulama Test Rehberi

Bu doküman, Ubuntu 22.04 production ortamında uygulamanın tüm bileşenlerini test etmek için hazırlanmıştır.

## Test Senaryoları

### 1. Environment Variables Test
- `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` kontrolü
- Opsiyonel değişkenler kontrolü (NetGSM, Cloudinary)

### 2. Next.js Build Test
- Production build'in başarılı olup olmadığını kontrol eder
- `.next` dizininin oluştuğunu doğrular
- Standalone output kontrolü

### 3. TypeScript Compilation Check
- Tüm TypeScript dosyalarının hatasız derlenip derlenmediğini kontrol eder

### 4. API Endpoints Availability
- Kritik API endpoint dosyalarının varlığını kontrol eder
- `/api/health`, `/api/auth`, `/api/admin/staff`, vb.

### 5. Authentication Configuration
- `auth.ts` dosyasının varlığı
- NextAuth exports kontrolü
- Credentials provider yapılandırması

### 6. Route Protection (Middleware)
- `middleware.ts` dosyasının varlığı
- Session kontrolü
- Role-based access kontrolü
- API ve panel route koruması

### 7. Component Files Check
- Kritik component dosyalarının varlığı
- RouteGuard, ImageUploader
- Kritik sayfa dosyaları

### 8. Prisma Schema Validation
- Prisma şemasının geçerli olup olmadığını kontrol eder

### 9. Docker Configuration Check
- `Dockerfile`, `docker-compose.yml`, `.dockerignore` varlığı
- `next.config.js` standalone output kontrolü

### 10. Package Dependencies Check
- Kritik paketlerin kurulu olup olmadığını kontrol eder
- npm script'lerinin varlığı

### 11. File Structure Check
- Gerekli dizin yapısının mevcut olup olmadığını kontrol eder

### 12. Security Headers Check
- Next.js security header'larının yapılandırıldığını kontrol eder

### 13. API Route Export Check
- API route'larının HTTP method export'larını kontrol eder

### 14. Environment File Check
- `.env.example` ve `.env` dosyalarının varlığını kontrol eder

### 15. Production Readiness Check
- NODE_ENV kontrolü
- Console removal yapılandırması
- Compression ayarları
- Error page varlığı

## Kullanım

### Local Development

```bash
# Sadece uygulama testleri
npm run app:test

# Tüm testler (database + application)
npm run test:all

# Veya direkt script
./scripts/test-all.sh
```

### Docker Environment

```bash
# Docker container içinde
docker-compose exec app npm run app:test
docker-compose exec app npm run test:all
```

### Production (Ubuntu Server)

```bash
# SSH ile sunucuya bağlan
ssh user@your-server

# Proje dizinine git
cd /opt/mesaidefteri

# Testleri çalıştır
npm run app:test
npm run test:all
```

## Beklenen Sonuçlar

### ✅ Başarılı Test
- Tüm testler geçer
- Build başarılı
- TypeScript derleme hatasız
- Tüm dosyalar mevcut

### ⚠️ Uyarılar
- Eksik environment variable'lar (test ortamında normal)
- Standalone output bulunamadı (build sırasında oluşmayabilir)
- Edge Runtime uyarıları (normal, pg modülü Node.js gerektirir)

### ❌ Hatalar
- Build başarısız
- TypeScript derleme hataları
- Eksik kritik dosyalar
- API route export hataları

## Troubleshooting

### Build Başarısız
```bash
# Build loglarını kontrol et
npm run build 2>&1 | tee build.log

# TypeScript hatalarını kontrol et
npx tsc --noEmit

# Prisma schema'yı kontrol et
npx prisma validate
```

### TypeScript Hataları
```bash
# Tüm TypeScript hatalarını listele
npx tsc --noEmit 2>&1 | grep error

# Belirli bir dosyayı kontrol et
npx tsc --noEmit app/api/system/logs/route.ts
```

### Missing Files
```bash
# Eksik dosyaları kontrol et
find app -name "*.tsx" -o -name "*.ts" | sort
find components -name "*.tsx" | sort
```

## Production Checklist

- [ ] `DATABASE_URL` doğru şekilde ayarlanmış
- [ ] `NEXTAUTH_SECRET` ve `NEXTAUTH_URL` ayarlanmış
- [ ] Tüm kritik dosyalar mevcut
- [ ] Build başarılı
- [ ] TypeScript derleme hatasız
- [ ] API route'ları doğru export edilmiş
- [ ] Security header'ları yapılandırılmış
- [ ] Docker yapılandırması hazır
- [ ] Prisma schema geçerli

## Notlar

- Test script'i production database'e yazma yapmaz
- Build testi gerçek build yapar (uzun sürebilir)
- Environment variable'lar test ortamında eksik olabilir (uyarı olarak işaretlenir)
- Edge Runtime uyarıları normaldir (pg modülü Node.js runtime gerektirir)
