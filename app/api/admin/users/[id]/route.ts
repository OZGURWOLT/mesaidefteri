import { NextRequest, NextResponse } from 'next/server'
import { requireManagerOrSupervisor, requireAuth } from '@/lib/auth-helpers'
import bcrypt from 'bcryptjs'
import { UserRole } from '@prisma/client'
import { Client } from 'pg'

// Kullanıcı bilgilerini getir (GET)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // Oturum kontrolü
    const currentUser = await requireAuth()
    const { id } = params

    // Kullanıcı sadece kendi bilgilerini görebilir veya MANAGER/SUPERVIZOR tüm kullanıcıları görebilir
    if (currentUser.id !== id && currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVIZOR') {
      return NextResponse.json(
        { error: 'Bu kullanıcının bilgilerini görüntüleme yetkiniz yok' },
        { status: 403 }
      )
    }

    await client.connect()

    const result = await client.query(
      'SELECT id, username, "fullName", role, phone, "staffDuty", "branchId", "managerId", "workScheduleType", "fixedWorkStartTime", "fixedWorkEndTime", "fixedWorkOffDay", "shiftSchedule", "createdAt", "updatedAt" FROM users WHERE id = $1',
      [id]
    )

    if (result.rows.length === 0) {
      await client.end()
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    await client.end()

    const user = result.rows[0]

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone || null,
        staffDuty: user.staffDuty || null,
        branchId: user.branchId || null,
        managerId: user.managerId || null,
        workScheduleType: user.workScheduleType || null,
        fixedWorkStartTime: user.fixedWorkStartTime || null,
        fixedWorkEndTime: user.fixedWorkEndTime || null,
        fixedWorkOffDay: user.fixedWorkOffDay || null,
        shiftSchedule: user.shiftSchedule || null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      }
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error fetching user:', error)

    if (error.message?.includes('Yetkisiz')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Kullanıcı bilgileri getirilirken bir hata oluştu' },
      { status: 500 }
    )
  }
}

// Kullanıcı güncelle (PUT)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // Oturum kontrolü
    const currentUser = await requireAuth()
    const { id } = params
    const body = await request.json()
    const { 
      username, 
      password, 
      fullName, 
      role, 
      phone, 
      staffDuty, 
      branchId, 
      managerId,
      workScheduleType,
      fixedWorkStartTime,
      fixedWorkEndTime,
      fixedWorkOffDay,
      shiftSchedule
    } = body

    await client.connect()

    // Kullanıcı var mı?
    const existingResult = await client.query(
      'SELECT id, username, role FROM users WHERE id = $1',
      [id]
    )

    if (existingResult.rows.length === 0) {
      await client.end()
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    const existingUser = existingResult.rows[0]

    // Yetki kontrolü: Kullanıcı kendi hesabını güncelleyebilir veya MANAGER/SUPERVIZOR herkesi güncelleyebilir
    if (currentUser.id !== id && currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVIZOR') {
      await client.end()
      return NextResponse.json(
        { error: 'Bu kullanıcıyı güncelleme yetkiniz yok' },
        { status: 403 }
      )
    }

    // Kullanıcı kendi hesabını güncelliyorsa, sadece belirli alanları güncelleyebilir
    const isSelfUpdate = currentUser.id === id
    if (isSelfUpdate) {
      // Kendi hesabını güncellerken rol, username, branchId, managerId değiştirilemez
      if (role && role !== existingUser.role) {
        await client.end()
        return NextResponse.json(
          { error: 'Kendi rolünüzü değiştiremezsiniz' },
          { status: 403 }
        )
      }
      if (username && username !== existingUser.username) {
        await client.end()
        return NextResponse.json(
          { error: 'Kendi kullanıcı adınızı değiştiremezsiniz' },
          { status: 403 }
        )
      }
      // branchId ve managerId kendi hesabında değiştirilemez (sadece fullName, phone, password)
    } else {
      // Başka bir kullanıcıyı güncelliyorsa MANAGER veya SUPERVIZOR olmalı
      if (currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVIZOR') {
        await client.end()
        return NextResponse.json(
          { error: 'Bu işlem için yetkiniz yok' },
          { status: 403 }
        )
      }
    }

    // SUPERVIZOR kullanıcısının rolü değiştirilemez
    if (existingUser.role === 'SUPERVIZOR' && role && role !== 'SUPERVIZOR') {
      await client.end()
      return NextResponse.json(
        { error: 'Süpervizör kullanıcısının rolü değiştirilemez' },
        { status: 403 }
      )
    }

    // SUPERVIZOR kullanıcısına başka bir rol atanamaz
    if (existingUser.role !== 'SUPERVIZOR' && role === 'SUPERVIZOR') {
      await client.end()
      return NextResponse.json(
        { error: 'Mevcut kullanıcılar Süpervizör rolüne yükseltilemez' },
        { status: 403 }
      )
    }

    // Güncelleme verilerini hazırla
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (fullName) {
      updates.push(`"fullName" = $${paramIndex++}`)
      values.push(fullName)
    }

    if (role && ['STAFF', 'MANAGER', 'SUPERVIZOR'].includes(role)) {
      // SUPERVIZOR kullanıcısının rolü değiştirilemez kontrolü yukarıda yapıldı
      updates.push(`role = $${paramIndex++}::"UserRole"`)
      values.push(role)
    }

    if (username) {
      const normalizedUsername = username.toLowerCase().trim()
      // Kullanıcı adı değişiyorsa, başka bir kullanıcıda var mı kontrol et
      if (normalizedUsername !== existingUser.username) {
        const usernameResult = await client.query(
          'SELECT id FROM users WHERE username = $1 AND id != $2',
          [normalizedUsername, id]
        )
        if (usernameResult.rows.length > 0) {
          await client.end()
          return NextResponse.json(
            { error: 'Bu kullanıcı adı zaten kullanılıyor' },
            { status: 400 }
          )
        }
      }
      updates.push(`username = $${paramIndex++}`)
      values.push(normalizedUsername)
    }

    if (password) {
      // Şifre validasyonu
      if (password.length < 6) {
        await client.end()
        return NextResponse.json(
          { error: 'Şifre en az 6 karakter olmalıdır' },
          { status: 400 }
        )
      }
      if (!/[A-Z]/.test(password)) {
        await client.end()
        return NextResponse.json(
          { error: 'Şifre en az bir büyük harf içermelidir' },
          { status: 400 }
        )
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        await client.end()
        return NextResponse.json(
          { error: 'Şifre en az bir noktalama işareti içermelidir' },
          { status: 400 }
        )
      }
      
      // Şifre değiştiriliyorsa hash'le
      const hashedPassword = await bcrypt.hash(password, 10)
      updates.push(`password = $${paramIndex++}`)
      values.push(hashedPassword)
    }

    if (phone !== undefined) {
      // Telefon numarası format kontrolü
      let formattedPhone: string | null = null
      if (phone && phone.trim()) {
        const cleaned = phone.replace(/[\s\-\(\)\+]/g, '')
        if (cleaned.startsWith('90')) {
          formattedPhone = cleaned.substring(2)
        } else if (cleaned.startsWith('0')) {
          formattedPhone = cleaned.substring(1)
        } else {
          formattedPhone = cleaned
        }
        
        // 10 haneli ve 5 ile başlamalı
        if (!formattedPhone || formattedPhone.length !== 10 || !formattedPhone.startsWith('5')) {
          await client.end()
          return NextResponse.json(
            { error: 'Geçerli bir telefon numarası giriniz (5xxXXXxxxx formatında)' },
            { status: 400 }
          )
        }
      }
      updates.push(`phone = $${paramIndex++}`)
      values.push(formattedPhone)
    }

    if (staffDuty !== undefined) {
      // Personel görevi - sadece STAFF rolü için
      const finalStaffDuty = role === 'STAFF' ? (staffDuty || null) : null
      updates.push(`"staffDuty" = $${paramIndex++}`)
      values.push(finalStaffDuty)
    }

    // Süpervizör kullanıcısı için şube ve yönetici null olmalı
    const finalRole = role || existingUser.role
    if (finalRole === 'SUPERVIZOR') {
      // Süpervizör için branchId ve managerId null yap
      updates.push(`"branchId" = NULL`)
      updates.push(`"managerId" = NULL`)
    } else {
      // Diğer roller için normal kontrol
      if (branchId !== undefined) {
        // Şube kontrolü
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
        updates.push(`"branchId" = $${paramIndex++}`)
        values.push(branchId || null)
      }

      if (managerId !== undefined) {
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
          // Güncellenecek kullanıcının rolünü belirle (yeni rol varsa onu kullan, yoksa mevcut rolü)
          const targetRole = role || existingUser.role
          // Hiyerarşi yapısı:
          // - SUPERVIZOR -> kimseye bağlı değil
          // - MANAGER -> sadece SUPERVIZOR'a bağlı olabilir
          // - STAFF/DEVELOPER/KASIYER -> MANAGER'a bağlı olabilir
          if (targetRole === 'MANAGER') {
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
        updates.push(`"managerId" = $${paramIndex++}`)
        values.push(managerId || null)
      }
    }

    // Mesai türü ve ilgili alanlar
    if (workScheduleType !== undefined) {
      updates.push(`"workScheduleType" = $${paramIndex++}`)
      values.push(workScheduleType || null)
    }

    if (fixedWorkStartTime !== undefined) {
      updates.push(`"fixedWorkStartTime" = $${paramIndex++}`)
      values.push(fixedWorkStartTime || null)
    }

    if (fixedWorkEndTime !== undefined) {
      updates.push(`"fixedWorkEndTime" = $${paramIndex++}`)
      values.push(fixedWorkEndTime || null)
    }

    if (fixedWorkOffDay !== undefined) {
      updates.push(`"fixedWorkOffDay" = $${paramIndex++}`)
      values.push(fixedWorkOffDay || null)
    }

    if (shiftSchedule !== undefined) {
      updates.push(`"shiftSchedule" = $${paramIndex++}`)
      values.push(shiftSchedule || null)
    }

    if (updates.length === 0) {
      await client.end()
      return NextResponse.json(
        { error: 'Güncellenecek alan bulunamadı' },
        { status: 400 }
      )
    }

    updates.push(`"updatedAt" = NOW()`)
    values.push(id)

    // Kullanıcıyı güncelle
    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, username, "fullName", role, phone, "staffDuty", "branchId", "managerId", "workScheduleType", "fixedWorkStartTime", "fixedWorkEndTime", "fixedWorkOffDay", "shiftSchedule", "createdAt", "updatedAt"
    `

    const updateResult = await client.query(updateQuery, values)
    const updatedUser = updateResult.rows[0]

    await client.end()

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı başarıyla güncellendi',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        phone: updatedUser.phone || null,
        staffDuty: updatedUser.staffDuty || null,
        branchId: updatedUser.branchId || null,
        managerId: updatedUser.managerId || null,
        workScheduleType: updatedUser.workScheduleType || null,
        fixedWorkStartTime: updatedUser.fixedWorkStartTime || null,
        fixedWorkEndTime: updatedUser.fixedWorkEndTime || null,
        fixedWorkOffDay: updatedUser.fixedWorkOffDay || null,
        shiftSchedule: updatedUser.shiftSchedule || null,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString()
      }
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error updating user:', error)

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
      { error: error.message || 'Kullanıcı güncellenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}

// Kullanıcı sil (DELETE)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // Yetki kontrolü
    const currentUser = await requireManagerOrSupervisor()

    const { id } = params

    await client.connect()

    // Kullanıcı var mı?
    const userResult = await client.query(
      'SELECT id, role FROM users WHERE id = $1',
      [id]
    )

    if (userResult.rows.length === 0) {
      await client.end()
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    const user = userResult.rows[0]

    // SUPERVIZOR kullanıcıları hiçbir şekilde silinemez
    if (user.role === 'SUPERVIZOR') {
      await client.end()
      return NextResponse.json(
        { error: 'Süpervizör kullanıcıları güvenlik nedeniyle silinemez' },
        { status: 403 }
      )
    }

    // Kendi hesabını silmeye çalışıyor mu?
    if (user.id === currentUser.id) {
      await client.end()
      return NextResponse.json(
        { error: 'Kendi hesabınızı silemezsiniz' },
        { status: 400 }
      )
    }

    // Kullanıcıyı sil
    await client.query('DELETE FROM users WHERE id = $1', [id])
    await client.end()

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi'
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error deleting user:', error)

    if (error.message?.includes('Yetkisiz')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Kullanıcı silinirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
