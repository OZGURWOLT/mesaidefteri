import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { Client } from 'pg'

/**
 * Kullanıcıyı username ile getir
 * GET /api/admin/users-by-username?username=xxx
 */
export async function GET(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // Login için kullanıldığından requireAuth opsiyonel yapıldı
    // Session varsa kontrol et, yoksa devam et (login sayfası için)
    let currentUser = null
    try {
      currentUser = await requireAuth()
    } catch {
      // Auth yoksa devam et (login sayfasından çağrılabilir)
    }

    const searchParams = request.nextUrl.searchParams
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json(
        { error: 'Username parametresi gerekli' },
        { status: 400 }
      )
    }

    await client.connect()

    const result = await client.query(
      'SELECT id, username, "fullName", role, phone FROM users WHERE username = $1',
      [username.toLowerCase().trim()]
    )

    await client.end()

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    const user = result.rows[0]

    return NextResponse.json({
      success: true,
      users: [{
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone || null
      }]
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error fetching user by username:', error)
    return NextResponse.json(
      { error: error.message || 'Kullanıcı getirilirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
