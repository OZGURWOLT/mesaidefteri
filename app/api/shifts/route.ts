import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { Client } from 'pg'

// Vardiya listesi (GET) - Yönetici için tüm personel vardiyaları
export async function GET(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    const currentUser = await requireAuth()
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') // Belirli bir kullanıcının vardiyaları
    const date = searchParams.get('date') // Belirli bir tarih için

    await client.connect()

    let query = `
      SELECT 
        s.id, s."userId", s."shiftDate", s."startTime", s."endTime", s."actualStart", s."actualEnd", 
        s."isActive", s."weeklyHours", s."assignedBy", s."createdAt", s."updatedAt",
        u."fullName", u.role, u.username
      FROM shifts s
      LEFT JOIN users u ON s."userId" = u.id
      WHERE 1=1
    `
    const params: any[] = []

    if (userId) {
      query += ` AND s."userId" = $${params.length + 1}`
      params.push(userId)
    } else {
      // Eğer userId yoksa, yönetici/süpervizör ise tüm vardiyaları göster
      // Personel ise sadece kendi vardiyalarını göster
      if (currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVIZOR') {
        query += ` AND s."userId" = $${params.length + 1}`
        params.push(currentUser.id)
      }
      // Süpervizör ise tüm vardiyaları göster (MANAGER dahil)
      // Yönetici ise sadece STAFF, DEVELOPER, KASIYER rolündeki personelin vardiyalarını göster (MANAGER hariç)
      if (currentUser.role === 'MANAGER') {
        query += ` AND u.role IN ('STAFF', 'DEVELOPER', 'KASIYER')`
      }
    }

    if (date) {
      query += ` AND DATE(s."shiftDate") = $${params.length + 1}`
      params.push(date)
    }

    query += ' ORDER BY s."shiftDate" DESC, s."startTime" ASC'

    const result = await client.query(query, params)
    await client.end()

    const shifts = result.rows.map(row => ({
      id: row.id,
      userId: row.userId,
      userName: row.fullName,
      userRole: row.role,
      shiftDate: row.shiftDate.toISOString().split('T')[0],
      startTime: row.startTime,
      endTime: row.endTime,
      actualStart: row.actualStart?.toISOString() || null,
      actualEnd: row.actualEnd?.toISOString() || null,
      isActive: row.isActive,
      weeklyHours: row.weeklyHours,
      assignedBy: row.assignedBy || null,
      createdAt: row.createdAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      shifts
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error fetching shifts:', error)
    return NextResponse.json(
      { error: error.message || 'Vardiyalar yüklenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}

// Vardiya oluştur/güncelle (POST) - Yönetici için
export async function POST(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    const currentUser = await requireAuth()
    
    // Sadece MANAGER veya SUPERVIZOR vardiya atayabilir
    if (currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVIZOR') {
      return NextResponse.json(
        { error: 'Vardiya atamak için yetkiniz yok' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, shiftDate, startTime, endTime, weeklyHours = 40, shiftId } = body

    if (!userId || !shiftDate || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Kullanıcı, tarih, başlangıç ve bitiş saati zorunludur' },
        { status: 400 }
      )
    }

    await client.connect()

    // Kullanıcı rolü kontrolü: Yönetici sadece STAFF, DEVELOPER, KASIYER'a vardiya atayabilir
    // Süpervizör tüm rollere (MANAGER dahil) vardiya atayabilir
    if (currentUser.role === 'MANAGER') {
      const userRoleResult = await client.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      )
      if (userRoleResult.rows.length === 0) {
        await client.end()
        return NextResponse.json(
          { error: 'Kullanıcı bulunamadı' },
          { status: 404 }
        )
      }
      const userRole = userRoleResult.rows[0].role
      if (userRole === 'MANAGER' || userRole === 'SUPERVIZOR') {
        await client.end()
        return NextResponse.json(
          { error: 'Yönetici sadece STAFF, DEVELOPER ve KASIYER rolündeki personellere vardiya atayabilir' },
          { status: 403 }
        )
      }
    }

    // Eğer shiftId varsa güncelle
    if (shiftId) {
      await client.query(
        `UPDATE shifts 
         SET "shiftDate" = $1, "startTime" = $2, "endTime" = $3, "weeklyHours" = $4, "assignedBy" = $5, "updatedAt" = NOW()
         WHERE id = $6`,
        [shiftDate, startTime, endTime, weeklyHours || 40, currentUser.id, shiftId]
      )
      await client.end()
      return NextResponse.json({ success: true, message: 'Vardiya güncellendi' })
    }

    // Aynı tarih ve kullanıcı için vardiya var mı kontrol et
    const existingShift = await client.query(
      'SELECT id FROM shifts WHERE "userId" = $1 AND DATE("shiftDate") = $2',
      [userId, shiftDate]
    )

    if (existingShift.rows.length > 0) {
      // Mevcut vardiyayı güncelle
      await client.query(
        `UPDATE shifts 
         SET "startTime" = $1, "endTime" = $2, "weeklyHours" = $3, "assignedBy" = $4, "updatedAt" = NOW()
         WHERE id = $5`,
        [startTime, endTime, weeklyHours || 40, currentUser.id, existingShift.rows[0].id]
      )
      await client.end()
      return NextResponse.json({ success: true, message: 'Vardiya güncellendi' })
    }

    // Yeni vardiya oluştur
    await client.query(
      `INSERT INTO shifts (id, "userId", "shiftDate", "startTime", "endTime", "weeklyHours", "assignedBy", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, false, NOW(), NOW())`,
      [userId, shiftDate, startTime, endTime, weeklyHours || 40, currentUser.id]
    )

    await client.end()

    return NextResponse.json({ success: true, message: 'Vardiya başarıyla oluşturuldu' })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error creating shift:', error)
    return NextResponse.json(
      { error: error.message || 'Vardiya oluşturulurken bir hata oluştu' },
      { status: 500 }
    )
  }
}
