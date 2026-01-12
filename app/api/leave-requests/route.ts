import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { Client } from 'pg'

// İzin talepleri listesi (GET)
export async function GET(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    const currentUser = await requireAuth()
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') // Belirli bir kullanıcının izinleri
    const status = searchParams.get('status') // 'pending', 'approved', 'rejected'

    await client.connect()

    let query = `
      SELECT 
        lr.id, lr."startDate", lr."endDate", lr.type, lr.description, lr.status, 
        lr."userId", lr."reviewedBy", lr."reviewedAt", lr."createdAt", lr."updatedAt",
        u."fullName", u.role, u.username,
        reviewer."fullName" as reviewer_name
      FROM leave_requests lr
      LEFT JOIN users u ON lr."userId" = u.id
      LEFT JOIN users reviewer ON lr."reviewedBy" = reviewer.id
      WHERE 1=1
    `
    const params: any[] = []

    if (userId) {
      query += ` AND lr."userId" = $${params.length + 1}`
      params.push(userId)
    } else {
      // Yönetici/süpervizör ise tüm izinleri göster, değilse sadece kendi izinlerini
      if (currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVIZOR') {
        query += ` AND lr."userId" = $${params.length + 1}`
        params.push(currentUser.id)
      }
      // Süpervizör ise tüm izinleri göster (MANAGER dahil)
      // Yönetici ise sadece STAFF, DEVELOPER, KASIYER rolündeki personelin izinlerini göster (MANAGER hariç)
      if (currentUser.role === 'MANAGER') {
        query += ` AND u.role IN ('STAFF', 'DEVELOPER', 'KASIYER')`
      }
    }

    if (status) {
      query += ` AND lr.status = $${params.length + 1}`
      params.push(status.toUpperCase())
    }

    query += ' ORDER BY lr."createdAt" DESC'

    const result = await client.query(query, params)
    await client.end()

    const leaveRequests = result.rows.map(row => ({
      id: row.id,
      userId: row.userId,
      userName: row.fullName,
      userRole: row.role,
      startDate: row.startDate.toISOString().split('T')[0],
      endDate: row.endDate.toISOString().split('T')[0],
      type: row.type || 'annual',
      description: row.description || '',
      status: row.status.toLowerCase(),
      reviewedBy: row.reviewedBy || null,
      reviewedByName: row.reviewer_name || null,
      reviewedAt: row.reviewedAt?.toISOString() || null,
      submittedAt: row.createdAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      leaveRequests
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error fetching leave requests:', error)
    return NextResponse.json(
      { error: error.message || 'İzin talepleri yüklenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}

// İzin talebi oluştur (POST)
export async function POST(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    const currentUser = await requireAuth()
    const body = await request.json()
    const { startDate, endDate, type = 'annual', description = '' } = body

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Başlangıç ve bitiş tarihi zorunludur' },
        { status: 400 }
      )
    }

    await client.connect()

    // İzin talebi oluştur
    await client.query(
      `INSERT INTO leave_requests (id, "userId", "startDate", "endDate", type, description, status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'pending', NOW(), NOW())
       RETURNING id, "createdAt"`,
      [currentUser.id, startDate, endDate, type, description]
    )

    // Yönetici/süpervizöre bildirim oluştur (MANAGER rolüne)
    const managerResult = await client.query(
      `SELECT id FROM users WHERE role IN ('MANAGER', 'SUPERVIZOR') ORDER BY "createdAt" ASC LIMIT 1`
    )

    if (managerResult.rows.length > 0) {
      const managerId = managerResult.rows[0].id
      await client.query(
        `INSERT INTO notifications (id, "userId", title, message, type, "isRead", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, false, NOW(), NOW())`,
        [
          managerId,
          'Yeni İzin Talebi',
          `${currentUser.name || currentUser.username} tarafından yeni bir izin talebi oluşturuldu.`,
          'info'
        ]
      )
    }

    await client.end()

    return NextResponse.json({
      success: true,
      message: 'İzin talebi başarıyla oluşturuldu. Yönetici onayı bekleniyor.'
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error creating leave request:', error)
    return NextResponse.json(
      { error: error.message || 'İzin talebi oluşturulurken bir hata oluştu' },
      { status: 500 }
    )
  }
}
