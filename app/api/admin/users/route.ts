import { NextRequest, NextResponse } from 'next/server'
import { requireManagerOrSupervisor } from '@/lib/auth-helpers'
import bcrypt from 'bcryptjs'
import { UserRole } from '@prisma/client'
import { Client } from 'pg'

// Tüm kullanıcıları getir (GET)
export async function GET(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // Yetki kontrolü ve mevcut kullanıcıyı al
    const currentUser = await requireManagerOrSupervisor()

    await client.connect()

    // Süpervizör: Tüm kullanıcıları göster
    // Yönetici: Sadece kendisine bağlı personelleri göster
    let query = 'SELECT id, username, "fullName", role, phone, "staffDuty", "branchId", "managerId", "createdAt", "updatedAt" FROM users'
    const params: any[] = []
    
    if (currentUser.role === 'MANAGER') {
      // Yönetici sadece kendisine bağlı personelleri görebilir (STAFF, DEVELOPER, KASIYER)
      query += ' WHERE "managerId" = $1 AND role IN ($2, $3, $4)'
      params.push(currentUser.id, 'STAFF', 'DEVELOPER', 'KASIYER')
    }
    // Süpervizör için filtre yok, tüm kullanıcıları göster
    
    query += ' ORDER BY "createdAt" DESC'

    const result = await client.query(query, params)

    await client.end()

    const users = result.rows.map(row => ({
      id: row.id,
      username: row.username,
      fullName: row.fullName,
      role: row.role,
      phone: row.phone || null,
      staffDuty: row.staffDuty || null,
      branchId: row.branchId || null,
      managerId: row.managerId || null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      users
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error fetching users:', error)
    
    if (error.message?.includes('Yetkisiz')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Kullanıcılar getirilirken bir hata oluştu: ' + error.message },
      { status: 500 }
    )
  }
}

// Yeni kullanıcı oluştur (POST)
export async function POST(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // Yetki kontrolü
    await requireManagerOrSupervisor()

    const body = await request.json()
    const { 
      username, 
      password, 
      fullName, 
      role, 
      phone, 
      staffDuty, 
      branchId: bodyBranchId, 
      managerId: bodyManagerId,
      workScheduleType,
      fixedWorkStartTime,
      fixedWorkEndTime,
      fixedWorkOffDay,
      shiftSchedule
    } = body

    // Validasyon
    if (!username || !password || !fullName || !role) {
      return NextResponse.json(
        { error: 'Kullanıcı adı, şifre, ad soyad ve rol zorunludur' },
        { status: 400 }
      )
    }

    // Şifre validasyonu
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Şifre en az 6 karakter olmalıdır' },
        { status: 400 }
      )
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: 'Şifre en az bir büyük harf içermelidir' },
        { status: 400 }
      )
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return NextResponse.json(
        { error: 'Şifre en az bir noktalama işareti içermelidir' },
        { status: 400 }
      )
    }

    // Yeni kullanıcı için şube ve yönetici zorunlu (Süpervizör hariç)
    let branchId: string | null = bodyBranchId
    let managerId: string | null = bodyManagerId

    if (role !== 'SUPERVIZOR') {
      if (!branchId) {
        return NextResponse.json(
          { error: 'Şube seçimi zorunludur' },
          { status: 400 }
        )
      }

      if (!managerId) {
        return NextResponse.json(
          { error: 'Yönetici seçimi zorunludur' },
          { status: 400 }
        )
      }
    } else {
      // Süpervizör için şube ve yönetici null olmalı
      branchId = null
      managerId = null
    }

    // Telefon numarası format kontrolü (opsiyonel ama varsa geçerli olmalı)
    let formattedPhone: string | null = null
    if (phone) {
      // Telefon numarasını temizle ve formatla
      const cleaned = phone.replace(/[\s\-\(\)\+]/g, '')
      if (cleaned.startsWith('90')) {
        formattedPhone = cleaned.substring(2)
      } else if (cleaned.startsWith('0')) {
        formattedPhone = cleaned.substring(1)
      } else {
        formattedPhone = cleaned
      }
      
      // 10 haneli ve 5 ile başlamalı
      if (formattedPhone.length !== 10 || !formattedPhone.startsWith('5')) {
        return NextResponse.json(
          { error: 'Geçerli bir telefon numarası giriniz (5xxXXXxxxx formatında)' },
          { status: 400 }
        )
      }
    }

    // Rol kontrolü
    if (!['STAFF', 'MANAGER', 'SUPERVIZOR'].includes(role)) {
      return NextResponse.json(
        { error: 'Geçersiz rol' },
        { status: 400 }
      )
    }

    // Yeni kullanıcı oluştururken SUPERVIZOR rolü kabul edilmez
    if (role === 'SUPERVIZOR') {
      return NextResponse.json(
        { error: 'Yeni kullanıcılar Süpervizör rolü ile oluşturulamaz. Süpervizör kullanıcıları sadece veritabanı yöneticisi tarafından oluşturulabilir.' },
        { status: 403 }
      )
    }

    // Kullanıcı adı kontrolü (küçük harfe çevir)
    const normalizedUsername = username.toLowerCase().trim()

    await client.connect()

    // Kullanıcı adı zaten var mı?
    const existingResult = await client.query(
      'SELECT id FROM users WHERE username = $1',
      [normalizedUsername]
    )

    if (existingResult.rows.length > 0) {
      await client.end()
      return NextResponse.json(
        { error: 'Bu kullanıcı adı zaten kullanılıyor' },
        { status: 400 }
      )
    }

    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(password, 10)

    // Şube kontrolü (Süpervizör hariç)
    if (branchId) {
      const branchCheck = await client.query('SELECT id FROM branches WHERE id = $1', [branchId])
      if (branchCheck.rows.length === 0) {
        await client.end()
        return NextResponse.json(
          { error: 'Seçilen şube bulunamadı' },
          { status: 400 }
        )
      }
    }

    // Yönetici kontrolü
    if (managerId) {
      const managerCheck = await client.query('SELECT id, role FROM users WHERE id = $1', [managerId])
      if (managerCheck.rows.length === 0) {
        await client.end()
        return NextResponse.json(
          { error: 'Seçilen yönetici bulunamadı' },
          { status: 400 }
        )
      }
          const managerRole = managerCheck.rows[0].role
          // Hiyerarşi yapısı:
          // - SUPERVIZOR -> kimseye bağlı değil
          // - MANAGER -> sadece SUPERVIZOR'a bağlı olabilir
          // - STAFF/DEVELOPER/KASIYER -> MANAGER'a bağlı olabilir
          if (role === 'MANAGER') {
            // Yönetici sadece süpervizöre bağlı olabilir
            if (managerRole !== 'SUPERVIZOR') {
              await client.end()
              return NextResponse.json(
                { error: 'Yönetici rolü için seçilen kullanıcı süpervizör rolünde olmalıdır. Yöneticiler sadece süpervizöre bağlı olabilir.' },
                { status: 400 }
              )
            }
          } else {
            // Diğer roller (STAFF, DEVELOPER, KASIYER) için sadece MANAGER olabilir
            if (managerRole !== 'MANAGER') {
              await client.end()
              return NextResponse.json(
                { error: 'Seçilen kullanıcı yönetici rolünde değil' },
                { status: 400 }
              )
            }
          }
    }

    // Personel rolü için görev kontrolü
    const finalStaffDuty = role === 'STAFF' ? (staffDuty || null) : null

    // Kullanıcıyı oluştur (yeni kullanıcılar için mustChangePassword = true)
    const insertResult = await client.query(
      `INSERT INTO users (id, username, password, "fullName", role, phone, "staffDuty", "branchId", "managerId", "mustChangePassword", "workScheduleType", "fixedWorkStartTime", "fixedWorkEndTime", "fixedWorkOffDay", "shiftSchedule", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4::"UserRole", $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
       RETURNING id, username, "fullName", role, phone, "staffDuty", "branchId", "managerId", "mustChangePassword", "workScheduleType", "fixedWorkStartTime", "fixedWorkEndTime", "fixedWorkOffDay", "shiftSchedule", "createdAt", "updatedAt"`,
      [normalizedUsername, hashedPassword, fullName, role, formattedPhone, finalStaffDuty, branchId, managerId, true, workScheduleType || null, fixedWorkStartTime || null, fixedWorkEndTime || null, fixedWorkOffDay || null, shiftSchedule || null]
    )

    const newUser = insertResult.rows[0]

    // Sistem logu oluştur
    try {
      const currentUser = await requireManagerOrSupervisor()
      await client.query(
        `INSERT INTO system_logs (id, type, description, "userId", "branchId", details, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())`,
        [
          'user_created',
          `${currentUser.fullName || 'Yönetici'} - "${fullName}" (${role}) kullanıcısı oluşturuldu`,
          newUser.id,
          branchId || null,
          JSON.stringify({
            username: normalizedUsername,
            role: role,
            staffDuty: finalStaffDuty || null
          })
        ]
      )
    } catch (logError) {
      console.error('System log oluşturma hatası:', logError)
    }

    await client.end()

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      user: {
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role,
        phone: newUser.phone || null,
        staffDuty: newUser.staffDuty || null,
        branchId: newUser.branchId || null,
        managerId: newUser.managerId || null,
        createdAt: newUser.createdAt.toISOString(),
        updatedAt: newUser.updatedAt.toISOString()
      }
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error creating user:', error)

    if (error.message?.includes('Yetkisiz')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    if (error.code === '23505') { // PostgreSQL unique violation
      return NextResponse.json(
        { error: 'Bu kullanıcı adı zaten kullanılıyor' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Kullanıcı oluşturulurken bir hata oluştu' },
      { status: 500 }
    )
  }
}
