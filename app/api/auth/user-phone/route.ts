import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { Client } from 'pg'

/**
 * Login sayfası için kullanıcı telefon numarasını getir
 * GET /api/auth/user-phone?username=xxx
 * 
 * Bu endpoint login sayfasından çağrılır, session olmayabilir
 * Sadece username ile telefon numarasını döndürür
 */
export async function GET(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
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
      'SELECT id, username, "fullName", phone FROM users WHERE username = $1',
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
      phone: user.phone || null,
      fullName: user.fullName
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error fetching user phone:', error)
    return NextResponse.json(
      { error: error.message || 'Kullanıcı telefon numarası getirilirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
