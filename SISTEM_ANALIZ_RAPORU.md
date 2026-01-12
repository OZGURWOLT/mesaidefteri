# 📊 Sistem Analiz Raporu - Mock Data'dan Gerçek Veriye Geçiş

## 🎯 Özet

Bu rapor, sistemde kullanılan mock data'ların gerçek veritabanı verilerine nasıl dönüştürülebileceğini analiz eder. Mock data'dan kurtulurken hiçbir özellik kaybolmayacak şekilde planlama yapılmıştır.

---

## 📋 1. VERİTABANI MODELLERİ (Prisma Schema)

### Mevcut Modeller:
1. ✅ **User** - Kullanıcılar
2. ✅ **Task** - Görevler
3. ✅ **PriceLog** - Fiyat logları
4. ✅ **LeaveRequest** - İzin talepleri
5. ✅ **Shift** - Vardiyalar
6. ✅ **Notification** - Bildirimler
7. ✅ **UserScore** - Kullanıcı puanları
8. ✅ **UserActivity** - Kullanıcı aktiviteleri (LOGIN/LOGOUT + konum)
9. ✅ **SmsCode** - SMS kodları
10. ✅ **SmsLog** - SMS logları

### Eksik Modeller:
1. ❌ **Branch** - Şubeler
2. ❌ **SystemLog** - Sistem logları (audit trail)
3. ❌ **LocationTracking** - Konum takibi (UserActivity var ama yeterli değil)

---

## 📍 2. MOCK DATA KULLANIM YERLERİ

### A. Yönetici Dashboard (`app/panel/yonetici/page.tsx`)

#### Kullanılan Mock Data:
- `mockStaffList` - Personel listesi
- `mockApprovalItems` - Onay bekleyen görevler

#### Mock Staff Interface Alanları:
```typescript
interface Staff {
  id: string
  name: string          // ❌ User.fullName var ama name/surname ayrı değil
  surname: string       // ❌ User.fullName var ama name/surname ayrı değil
  role: string          // ✅ User.role var
  shiftActive: boolean  // ✅ Shift.isActive var (bugünkü vardiya)
  lastLocation: string  // ⚠️ UserActivity var ama string formatında değil
  shiftStartTime?: string // ✅ Shift.startTime var
  shiftEndTime?: string   // ✅ Shift.endTime var
  onLeave?: boolean       // ✅ LeaveRequest var (bugün izinli mi?)
  totalTasks: number      // ✅ Task tablosundan COUNT ile hesaplanabilir
  pendingApprovals: number // ✅ Task tablosundan COUNT ile hesaplanabilir
  incompleteTasks: number  // ✅ Task tablosundan COUNT ile hesaplanabilir
  successRate: number      // ✅ Task tablosundan hesaplanabilir
  avatar?: string          // ❌ User tablosunda yok (opsiyonel)
}
```

#### Mock ApprovalItem Interface Alanları:
```typescript
interface ApprovalItem {
  id: string                // ✅ Task.id var
  staffName: string         // ✅ User.fullName var
  staffRole: string         // ✅ User.role var
  taskType: string          // ✅ Task.taskType var
  taskTitle: string         // ✅ Task.title var
  submittedAt: string       // ✅ Task.submittedAt var
  data?: any                // ✅ PriceLog tablosundan çekilebilir
  photos?: string[]         // ✅ Task.photos var
  status: 'pending'         // ✅ Task.status = 'BEKLIYOR' var
}
```

**Durum:**
- ✅ ApprovalItem için `/api/tasks/pending` API'si var ve kullanılabilir
- ❌ Staff için API yok - oluşturulmalı

---

### B. Yönetici Personel Listesi (`app/panel/yonetici/personel/page.tsx`)

#### Kullanılan Mock Data:
- `mockStaffList` - Personel listesi

**Durum:**
- Aynı Staff interface'i kullanıyor
- Görev detayları modalı zaten gerçek API kullanıyor ✅

---

### C. Süpervizör Dashboard (`app/panel/supervizor/page.tsx`)

#### Kullanılan Mock Data:
- `mockBranches` - Şubeler
- `mockManagers` - Yönetici audit verileri
- `mockSystemLogs` - Sistem logları

#### Mock Branch Interface:
```typescript
interface Branch {
  id: string              // ❌ Branch modeli yok
  name: string            // ❌ Branch modeli yok
  totalStaff: number      // ✅ User tablosundan COUNT ile hesaplanabilir
  criticalPending: number // ✅ Task tablosundan COUNT ile hesaplanabilir
  activeRate: number      // ✅ Shift tablosundan hesaplanabilir
  managerId: string       // ❌ Branch modeli yok
  managerName: string     // ❌ Branch modeli yok
}
```

#### Mock ManagerAudit Interface:
```typescript
interface ManagerAudit {
  id: string                // ✅ User.id var
  name: string              // ✅ User.fullName var
  branch: string            // ❌ Branch modeli yok
  avgApprovalTime: number   // ✅ Task tablosundan hesaplanabilir
  rejectionRate: number     // ✅ Task tablosundan hesaplanabilir
  overriddenDecisions: number // ❌ Supervisor override sistemi yok
  totalDecisions: number    // ✅ Task tablosundan COUNT ile hesaplanabilir
  successRate: number       // ✅ Task tablosundan hesaplanabilir
}
```

#### Mock SystemLog Interface:
```typescript
interface SystemLog {
  id: string                // ❌ SystemLog modeli yok
  timestamp: string         // ❌ SystemLog modeli yok
  type: string              // ❌ SystemLog modeli yok
  description: string       // ❌ SystemLog modeli yok
  staffName?: string        // ❌ SystemLog modeli yok
  staffRole?: string        // ❌ SystemLog modeli yok
  taskId?: string           // ❌ SystemLog modeli yok
  branch?: string           // ❌ SystemLog modeli yok
  details?: any             // ❌ SystemLog modeli yok
}
```

**Durum:**
- ❌ Branch modeli yok
- ❌ SystemLog modeli yok
- ⚠️ ManagerAudit verileri hesaplanabilir ama Branch bilgisi eksik

---

### D. Harita Takip (`app/panel/yonetici/harita-takip/page.tsx`)

#### Kullanılan Mock Data:
- `mockTrackingData` - Konum takip verileri

#### Mock LocationTracking Interface:
```typescript
interface LocationTracking {
  id: string            // ❌ LocationTracking modeli yok
  staffId: string       // ✅ User.id var
  name: string          // ✅ User.fullName var
  surname: string       // ✅ User.fullName var (ayrı değil)
  role: string          // ✅ User.role var
  lat: number           // ✅ UserActivity.latitude var
  lng: number           // ✅ UserActivity.longitude var
  batteryLevel: number  // ❌ YOK
  speed: number         // ❌ YOK
  lastUpdate: string    // ✅ UserActivity.createdAt var
  isMoving: boolean     // ❌ YOK
  currentTask?: string  // ✅ Task.title var (aktif görev)
  eta?: string          // ❌ YOK (hesaplanabilir)
}
```

**Durum:**
- ✅ `/api/user/log` endpoint'i var (UserActivity kullanıyor)
- ⚠️ Bazı alanlar eksik (batteryLevel, speed, isMoving, eta)
- ✅ Temel konum bilgisi UserActivity'den çekilebilir

---

### E. Yönetici Raporlar (`app/panel/yonetici/raporlar/page.tsx`)

**Kontrol edilmeli** - mock data kullanımı tespit edildi ama detayları incelenmeli.

---

## 🔄 3. MOCK DATA → GERÇEK VERİ MAPPING

### Staff Interface → User + Hesaplanan Alanlar

| Mock Alan | Veritabanı Kaynağı | Durum |
|-----------|-------------------|-------|
| `id` | `User.id` | ✅ Var |
| `name` | `User.fullName.split(' ')[0]` | ⚠️ Parse edilebilir |
| `surname` | `User.fullName.split(' ').slice(1).join(' ')` | ⚠️ Parse edilebilir |
| `role` | `User.role` | ✅ Var |
| `shiftActive` | `Shift.isActive WHERE shiftDate = CURRENT_DATE` | ✅ Var |
| `lastLocation` | `UserActivity.latitude, longitude ORDER BY createdAt DESC LIMIT 1` | ✅ Var (formatlanmalı) |
| `shiftStartTime` | `Shift.startTime WHERE shiftDate = CURRENT_DATE` | ✅ Var |
| `shiftEndTime` | `Shift.endTime WHERE shiftDate = CURRENT_DATE` | ✅ Var |
| `onLeave` | `LeaveRequest.status = 'approved' AND CURRENT_DATE BETWEEN startDate AND endDate` | ✅ Var |
| `totalTasks` | `COUNT(*) FROM tasks WHERE assignedTo = userId` | ✅ Hesaplanabilir |
| `pendingApprovals` | `COUNT(*) FROM tasks WHERE assignedTo = userId AND status = 'BEKLIYOR'` | ✅ Hesaplanabilir |
| `incompleteTasks` | `COUNT(*) FROM tasks WHERE assignedTo = userId AND status != 'ONAYLANDI'` | ✅ Hesaplanabilir |
| `successRate` | `(COUNT(*) WHERE status = 'ONAYLANDI') / (COUNT(*)) * 100` | ✅ Hesaplanabilir |
| `avatar` | - | ❌ YOK (opsiyonel, şimdilik null) |

### ApprovalItem Interface → Task + PriceLog

| Mock Alan | Veritabanı Kaynağı | Durum |
|-----------|-------------------|-------|
| `id` | `Task.id` | ✅ Var |
| `staffName` | `User.fullName` | ✅ Var |
| `staffRole` | `User.role` | ✅ Var |
| `taskType` | `Task.taskType` | ✅ Var |
| `taskTitle` | `Task.title` | ✅ Var |
| `submittedAt` | `Task.submittedAt` | ✅ Var |
| `data` | `PriceLog[] WHERE taskId = Task.id` | ✅ Var |
| `photos` | `Task.photos` | ✅ Var |
| `status` | `Task.status = 'BEKLIYOR'` | ✅ Var |

**Durum:** ✅ `/api/tasks/pending` API'si zaten var ve bu formatta dönüyor!

---

## 🛠️ 4. GEREKLİ API ENDPOINT'LERİ

### Mevcut API'ler:
- ✅ `/api/admin/users` - Kullanıcı listesi
- ✅ `/api/tasks/pending` - Onay bekleyen görevler
- ✅ `/api/tasks/assigned?userId=...` - Kullanıcıya atanan görevler
- ✅ `/api/shifts` - Vardiyalar
- ✅ `/api/leave-requests` - İzin talepleri
- ✅ `/api/user/log` - Konum kayıtları

### Eksik API'ler:
1. ❌ `/api/admin/staff` - Staff listesi + istatistikler
2. ❌ `/api/branches` - Şubeler (Branch modeli gerekiyor)
3. ❌ `/api/admin/manager-stats` - Yönetici audit istatistikleri
4. ❌ `/api/system/logs` - Sistem logları (SystemLog modeli gerekiyor)
5. ❌ `/api/tracking/locations` - Konum takip verileri (UserActivity'den)

---

## 📝 5. YAPILMASI GEREKENLER

### Öncelik 1: Yönetici Dashboard - Staff Listesi

**Görev:** `/api/admin/staff` endpoint'i oluştur

**Endpoint:** `GET /api/admin/staff`

**Response:**
```typescript
{
  success: true,
  staff: [
    {
      id: string,              // User.id
      name: string,            // User.fullName.split(' ')[0]
      surname: string,         // User.fullName.split(' ').slice(1).join(' ')
      role: string,            // User.role
      shiftActive: boolean,    // Shift.isActive (bugünkü vardiya)
      lastLocation: string,    // UserActivity'dan formatlanmış
      shiftStartTime?: string, // Shift.startTime
      shiftEndTime?: string,   // Shift.endTime
      onLeave?: boolean,       // LeaveRequest kontrolü
      totalTasks: number,      // COUNT(tasks)
      pendingApprovals: number, // COUNT(tasks WHERE status = 'BEKLIYOR')
      incompleteTasks: number,  // COUNT(tasks WHERE status != 'ONAYLANDI')
      successRate: number,      // Hesaplanan
      avatar?: string           // null (şimdilik)
    }
  ]
}
```

**SQL Sorgusu:**
```sql
SELECT 
  u.id,
  u."fullName",
  u.role,
  -- Shift bilgisi (bugünkü vardiya)
  s."isActive" as "shiftActive",
  s."startTime" as "shiftStartTime",
  s."endTime" as "shiftEndTime",
  -- İzin durumu
  CASE WHEN EXISTS (
    SELECT 1 FROM leave_requests lr 
    WHERE lr."userId" = u.id 
    AND lr.status = 'approved' 
    AND CURRENT_DATE BETWEEN DATE(lr."startDate") AND DATE(lr."endDate")
  ) THEN true ELSE false END as "onLeave",
  -- Görev istatistikleri
  (SELECT COUNT(*) FROM tasks t WHERE t."assignedTo" = u.id) as "totalTasks",
  (SELECT COUNT(*) FROM tasks t WHERE t."assignedTo" = u.id AND t.status = 'BEKLIYOR') as "pendingApprovals",
  (SELECT COUNT(*) FROM tasks t WHERE t."assignedTo" = u.id AND t.status != 'ONAYLANDI') as "incompleteTasks",
  -- Success rate
  CASE 
    WHEN (SELECT COUNT(*) FROM tasks t WHERE t."assignedTo" = u.id) > 0
    THEN ROUND(
      (SELECT COUNT(*)::float FROM tasks t WHERE t."assignedTo" = u.id AND t.status = 'ONAYLANDI') /
      (SELECT COUNT(*)::float FROM tasks t WHERE t."assignedTo" = u.id) * 100,
      1
    )
    ELSE 0
  END as "successRate",
  -- Son konum
  (SELECT CONCAT(ua.latitude, ', ', ua.longitude) 
   FROM user_activities ua 
   WHERE ua."userId" = u.id 
   ORDER BY ua."createdAt" DESC 
   LIMIT 1) as "lastLocation"
FROM users u
LEFT JOIN shifts s ON s."userId" = u.id AND DATE(s."shiftDate") = CURRENT_DATE
WHERE u.role IN ('STAFF', 'DEVELOPER', 'KASIYER')
ORDER BY u."fullName"
```

---

### Öncelik 2: Yönetici Dashboard - Approval Items

**Görev:** `mockApprovalItems` yerine `/api/tasks/pending` kullan

**Durum:** ✅ API zaten var ve doğru formatta dönüyor!

**Değişiklik:**
- `app/panel/yonetici/page.tsx` dosyasında `mockApprovalItems` yerine `/api/tasks/pending` endpoint'i kullanılacak

---

### Öncelik 3: Branch Sistemi (Süpervizör Dashboard için)

**Seçenek 1:** Branch modeli ekle (önerilen)

**Prisma Schema Değişikliği:**
```prisma
model Branch {
  id          String   @id @default(uuid())
  name        String
  address     String?
  phone       String?
  managerId   String?  // User.id (role = MANAGER)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  manager     User?    @relation("BranchManager", fields: [managerId], references: [id])

  @@map("branches")
}
```

**User Model'e Ekle:**
```prisma
branchId     String?  // Branch.id referansı
branch       Branch?  @relation("BranchUsers", fields: [branchId], references: [id])
managedBranch Branch? @relation("BranchManager")
```

**Seçenek 2:** Basit çözüm - User tablosuna branch alanı ekle (şimdilik)

```prisma
// User model'e ekle
branch       String?  // Şube adı (basit string)
```

**API Endpoint:** `/api/branches`

---

### Öncelik 4: Manager Audit (Süpervizör Dashboard için)

**Görev:** `/api/admin/manager-stats` endpoint'i oluştur

**Endpoint:** `GET /api/admin/manager-stats`

**SQL Sorgusu:**
```sql
SELECT 
  u.id,
  u."fullName" as name,
  -- Branch bilgisi (branch modeli varsa)
  b.name as branch,
  -- Ortalama onay süresi (dakika)
  AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."submittedAt")) / 60) as "avgApprovalTime",
  -- Red oranı (%)
  CASE 
    WHEN COUNT(t.id) > 0
    THEN ROUND(
      (SELECT COUNT(*)::float FROM tasks t2 WHERE t2.status = 'REDDEDILDI' AND ...) /
      (SELECT COUNT(*)::float FROM tasks t2 WHERE ...) * 100,
      1
    )
    ELSE 0
  END as "rejectionRate",
  -- Toplam karar sayısı
  COUNT(t.id) as "totalDecisions",
  -- Success rate
  CASE 
    WHEN COUNT(t.id) > 0
    THEN ROUND(
      (SELECT COUNT(*)::float FROM tasks t2 WHERE t2.status = 'ONAYLANDI' AND ...) /
      (SELECT COUNT(*)::float FROM tasks t2 WHERE ...) * 100,
      1
    )
    ELSE 0
  END as "successRate"
FROM users u
LEFT JOIN tasks t ON t.status IN ('ONAYLANDI', 'REDDEDILDI') AND ...
WHERE u.role = 'MANAGER'
GROUP BY u.id, u."fullName"
```

**Not:** Supervisor override sistemi yok, `overriddenDecisions` şimdilik 0 olacak.

---

### Öncelik 5: System Logs (Süpervizör Dashboard için)

**Seçenek 1:** SystemLog modeli ekle (önerilen)

**Prisma Schema Değişikliği:**
```prisma
model SystemLog {
  id          String   @id @default(uuid())
  type        String   // 'task_created', 'manager_approval', 'supervisor_override', etc.
  description String
  userId      String?  // İlgili kullanıcı
  taskId      String?  // İlgili görev
  branchId    String?  // İlgili şube
  details     Json?    // Ek detaylar
  createdAt   DateTime @default(now())

  user        User?    @relation(fields: [userId], references: [id])
  task        Task?    @relation(fields: [taskId], references: [id])
  branch      Branch?  @relation(fields: [branchId], references: [id])

  @@map("system_logs")
}
```

**Seçenek 2:** Basit çözüm - Mevcut tablolardan log oluştur (kısa vadeli)

Task onay/red işlemlerinden log oluşturulabilir ama gerçek system log için model gerekli.

---

### Öncelik 6: Location Tracking (Harita Takip için)

**Çözüm:** `/api/tracking/locations` endpoint'i oluştur (UserActivity kullanarak)

**Endpoint:** `GET /api/tracking/locations`

**SQL Sorgusu:**
```sql
SELECT DISTINCT ON (ua."userId")
  u.id as "staffId",
  u."fullName",
  u.role,
  ua.latitude as lat,
  ua.longitude as lng,
  ua."createdAt" as "lastUpdate"
FROM user_activities ua
JOIN users u ON ua."userId" = u.id
WHERE ua.latitude IS NOT NULL AND ua.longitude IS NOT NULL
ORDER BY ua."userId", ua."createdAt" DESC
```

**Eksik Alanlar:**
- `batteryLevel` - ❌ YOK (opsiyonel, null olabilir)
- `speed` - ❌ YOK (opsiyonel, null olabilir)
- `isMoving` - ❌ YOK (opsiyonel, hesaplanabilir veya null)
- `currentTask` - ✅ Task tablosundan çekilebilir
- `eta` - ❌ YOK (hesaplanabilir veya null)

---

## ✅ 6. YAPILACAKLAR LİSTESİ

### Yüksek Öncelik (Mevcut özellikler için gerekli):

1. **✅ `/api/tasks/pending`** - Zaten var
2. **❌ `/api/admin/staff`** - Oluşturulmalı
   - Staff listesi + istatistikler
   - Yönetici Dashboard ve Personel Listesi için

### Orta Öncelik (Dashboard için):

3. **❌ `/api/admin/manager-stats`** - Oluşturulmalı
   - Yönetici audit istatistikleri
   - Süpervizör Dashboard için

4. **❌ Branch sistemi** - Model + API
   - Süpervizör Dashboard için
   - Seçenek: Branch modeli ekle VEYA User tablosuna branch alanı ekle

### Düşük Öncelik (İleri seviye özellikler):

5. **❌ SystemLog modeli + `/api/system/logs`** - Oluşturulmalı
   - Süpervizör Dashboard için

6. **❌ `/api/tracking/locations`** - Oluşturulmalı
   - Harita Takip için
   - UserActivity kullanarak

---

## 🔧 7. DETAYLI YAPILACAKLAR

### 1. `/api/admin/staff` Endpoint'i Oluştur

**Dosya:** `app/api/admin/staff/route.ts`

**Fonksiyon:**
- User tablosundan kullanıcıları çek
- Her kullanıcı için:
  - Shift bilgisi (bugünkü vardiya)
  - İzin durumu
  - Görev istatistikleri (totalTasks, pendingApprovals, incompleteTasks, successRate)
  - Son konum (UserActivity'den)

**Kullanım Yerleri:**
- `app/panel/yonetici/page.tsx` - mockStaffList yerine
- `app/panel/yonetici/personel/page.tsx` - mockStaffList yerine

---

### 2. Yönetici Dashboard - Approval Items

**Dosya:** `app/panel/yonetici/page.tsx`

**Değişiklik:**
- `mockApprovalItems` yerine `/api/tasks/pending` kullan
- API response'unu ApprovalItem formatına map et

---

### 3. Branch Sistemi

**Seçenek A:** Branch modeli ekle (önerilen)

**Değişiklikler:**
1. `prisma/schema.prisma` - Branch modeli ekle
2. User model'e branchId ve branch relation ekle
3. `npx prisma db push` - Veritabanını güncelle
4. `/api/branches` endpoint'i oluştur
5. `app/panel/supervizor/page.tsx` - mockBranches yerine API kullan

**Seçenek B:** Basit çözüm (şimdilik)

1. User model'e `branch String?` ekle
2. `npx prisma db push`
3. `/api/branches` endpoint'i oluştur (User tablosundan DISTINCT branch çek)
4. `app/panel/supervizor/page.tsx` - mockBranches yerine API kullan

---

### 4. Manager Audit

**Dosya:** `app/api/admin/manager-stats/route.ts`

**Fonksiyon:**
- User tablosundan role = 'MANAGER' olanları çek
- Her yönetici için:
  - avgApprovalTime (Task tablosundan)
  - rejectionRate (Task tablosundan)
  - totalDecisions (Task tablosundan)
  - successRate (Task tablosundan)
  - branch (Branch modeli varsa)

**Kullanım Yeri:**
- `app/panel/supervizor/page.tsx` - mockManagers yerine

---

### 5. System Logs

**Seçenek A:** SystemLog modeli ekle (önerilen)

**Değişiklikler:**
1. `prisma/schema.prisma` - SystemLog modeli ekle
2. `npx prisma db push`
3. Tüm sistem işlemlerinde log kaydı ekle:
   - Task onay/red işlemlerinde
   - Task oluşturma işlemlerinde
   - Supervisor override işlemlerinde
   - Sistem ayarları değişikliklerinde
4. `/api/system/logs` endpoint'i oluştur
5. `app/panel/supervizor/page.tsx` - mockSystemLogs yerine API kullan

**Seçenek B:** Basit çözüm (kısa vadeli)

- Task onay/red işlemlerinden log oluştur (mevcut tablolardan)
- `/api/system/logs` endpoint'i oluştur (Task tablosundan)
- `app/panel/supervizor/page.tsx` - mockSystemLogs yerine API kullan

---

### 6. Location Tracking

**Dosya:** `app/api/tracking/locations/route.ts`

**Fonksiyon:**
- UserActivity tablosundan son konum bilgilerini çek
- Aktif kullanıcıları filtrele
- Konum bilgilerini formatla

**Eksik Alanlar:**
- batteryLevel, speed, isMoving, eta - şimdilik null veya hesaplanabilir

**Kullanım Yeri:**
- `app/panel/yonetici/harita-takip/page.tsx` - mockTrackingData yerine

---

## 📊 8. ÖNCELİK SIRASI

### Faz 1: Yönetici Dashboard (Yüksek Öncelik)
1. `/api/admin/staff` endpoint'i oluştur
2. `app/panel/yonetici/page.tsx` - mockStaffList yerine API kullan
3. `app/panel/yonetici/page.tsx` - mockApprovalItems yerine `/api/tasks/pending` kullan
4. `app/panel/yonetici/personel/page.tsx` - mockStaffList yerine API kullan

### Faz 2: Süpervizör Dashboard (Orta Öncelik)
5. Branch sistemi (model + API)
6. `/api/admin/manager-stats` endpoint'i oluştur
7. `app/panel/supervizor/page.tsx` - mockBranches, mockManagers yerine API kullan

### Faz 3: İleri Seviye Özellikler (Düşük Öncelik)
8. SystemLog modeli + API
9. `app/panel/supervizor/page.tsx` - mockSystemLogs yerine API kullan
10. `/api/tracking/locations` endpoint'i oluştur
11. `app/panel/yonetici/harita-takip/page.tsx` - mockTrackingData yerine API kullan

---

## ⚠️ 9. DİKKAT EDİLMESİ GEREKENLER

1. **User.fullName vs name/surname:**
   - Mock data'da name ve surname ayrı
   - Veritabanında fullName tek alan
   - Çözüm: fullName'i parse et veya frontend'de böl

2. **Branch Sistemi:**
   - Şu an branch bilgisi yok
   - Seçenek: Branch modeli ekle VEYA User tablosuna branch alanı ekle
   - Önerilen: Branch modeli (ileride genişletilebilir)

3. **Supervisor Override:**
   - mockManagers'da overriddenDecisions var
   - Sistemde supervisor override özelliği yok
   - Şimdilik 0 olacak, sonra eklenebilir

4. **Location Tracking:**
   - UserActivity var ama bazı alanlar eksik (batteryLevel, speed, isMoving)
   - Şimdilik temel konum bilgisi yeterli
   - İleri seviye özellikler sonra eklenebilir

5. **Avatar:**
   - Mock data'da avatar var
   - Veritabanında yok
   - Şimdilik null, sonra eklenebilir

---

## ✅ 10. SONUÇ

Sistemdeki mock data'ların çoğu gerçek veritabanı verilerinden oluşturulabilir. Bazı modeller eksik (Branch, SystemLog) ama bunlar eklenebilir veya alternatif çözümler kullanılabilir.

**Kritik Nokta:** Mock data'dan gerçek veriye geçiş yapılırken hiçbir özellik kaybolmayacak, sadece veri kaynağı değişecek.
