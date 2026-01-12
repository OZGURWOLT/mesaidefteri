import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { Client } from 'pg'

// Kullanıcının bugünkü vardiyasını getir (GET)
export async function GET(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    const currentUser = await requireAuth()
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') || currentUser.id
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    await client.connect()

    // Bugünkü vardiyayı çek
    const result = await client.query(
      `SELECT 
        id, "userId", "shiftDate", "startTime", "endTime", "actualStart", "actualEnd", 
        "isActive", "weeklyHours", "assignedBy", "createdAt"
      FROM shifts
      WHERE "userId" = $1 AND DATE("shiftDate") = $2
      ORDER BY "createdAt" DESC
      LIMIT 1`,
      [userId, date]
    )

    await client.end()

    if (result.rows.length === 0) {
      // Varsayılan vardiya döndür
      return NextResponse.json({
        success: true,
        shift: {
          id: null,
          startTime: '08:00',
          endTime: '18:00',
          weeklyHours: 40,
          isActive: false,
          actualStart: null,
          actualEnd: null
        }
      })
    }

    const shift = result.rows[0]

    return NextResponse.json({
      success: true,
      shift: {
        id: shift.id,
        startTime: shift.startTime,
        endTime: shift.endTime,
        weeklyHours: shift.weeklyHours || 40,
        isActive: shift.isActive || false,
        actualStart: shift.actualStart?.toISOString() || null,
        actualEnd: shift.actualEnd?.toISOString() || null
      }
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error fetching current shift:', error)
    return NextResponse.json(
      { error: error.message || 'Vardiya yüklenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
