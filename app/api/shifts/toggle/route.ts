import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { Client } from 'pg'

// Mesai başlat/bitir (POST)
export async function POST(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    const currentUser = await requireAuth()
    const body = await request.json()
    const { action } = body // 'start' veya 'end'

    if (!action || (action !== 'start' && action !== 'end')) {
      return NextResponse.json(
        { error: 'Geçersiz aksiyon. "start" veya "end" olmalı' },
        { status: 400 }
      )
    }

    await client.connect()

    const today = new Date().toISOString().split('T')[0]

    // Bugünkü vardiyayı bul veya oluştur
    let shiftResult = await client.query(
      'SELECT id, "isActive" FROM shifts WHERE "userId" = $1 AND DATE("shiftDate") = $2',
      [currentUser.id, today]
    )

    let shiftId: string

    if (shiftResult.rows.length === 0) {
      // Varsayılan vardiya oluştur (yönetici tarafından atanmamışsa)
      const defaultResult = await client.query(
        `INSERT INTO shifts (id, "userId", "shiftDate", "startTime", "endTime", "weeklyHours", "isActive", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, false, NOW(), NOW())
         RETURNING id`,
        [currentUser.id, today, '08:00', '18:00', 40]
      )
      shiftId = defaultResult.rows[0].id
    } else {
      shiftId = shiftResult.rows[0].id
    }

    // Mesai başlat/bitir
    if (action === 'start') {
      // Diğer aktif vardiyaları kapat
      await client.query(
        'UPDATE shifts SET "isActive" = false, "actualEnd" = NOW() WHERE "userId" = $1 AND "isActive" = true',
        [currentUser.id]
      )

      // Yeni vardiyayı başlat
      await client.query(
        'UPDATE shifts SET "isActive" = true, "actualStart" = NOW(), "updatedAt" = NOW() WHERE id = $1',
        [shiftId]
      )
    } else {
      // Mesai bitir
      await client.query(
        'UPDATE shifts SET "isActive" = false, "actualEnd" = NOW(), "updatedAt" = NOW() WHERE id = $1',
        [shiftId]
      )
    }

    // Sistem logu oluştur
    try {
      const userResult = await client.query(
        `SELECT u."fullName", u."staffDuty", u."branchId", b.name as "branchName"
         FROM users u
         LEFT JOIN branches b ON u."branchId" = b.id
         WHERE u.id = $1`,
        [currentUser.id]
      )
      const user = userResult.rows[0]

      await client.query(
        `INSERT INTO system_logs (id, type, description, "userId", "branchId", details, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())`,
        [
          action === 'start' ? 'shift_started' : 'shift_ended',
          `${user?.fullName || 'Personel'} - Mesai ${action === 'start' ? 'başladı' : 'bitti'}`,
          currentUser.id,
          user?.branchId || null,
          JSON.stringify({
            shiftId: shiftId,
            action: action
          })
        ]
      )
    } catch (logError) {
      console.error('System log oluşturma hatası:', logError)
    }

    await client.end()

    return NextResponse.json({
      success: true,
      message: action === 'start' ? 'Mesai başlatıldı' : 'Mesai sonlandırıldı'
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error toggling shift:', error)
    return NextResponse.json(
      { error: error.message || 'Mesai işlemi sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}
