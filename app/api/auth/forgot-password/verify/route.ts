import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

/**
 * Şifre sıfırlama için OTP doğrula
 * POST /api/auth/forgot-password/verify
 */
export async function POST(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    const body = await request.json()
    const { userId, code } = body

    if (!userId || !code) {
      return NextResponse.json(
        { error: 'Kullanıcı ID ve kod gerekli' },
        { status: 400 }
      )
    }

    if (code.length !== 6) {
      return NextResponse.json(
        { error: 'Kod 6 haneli olmalıdır' },
        { status: 400 }
      )
    }

    await client.connect()

    // Kullanıcıyı kontrol et
    const userResult = await client.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      await client.end()
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    // Geçerli ve kullanılmamış kodu bul
    const codeResult = await client.query(
      `SELECT id, code, "expiresAt", used 
       FROM sms_codes 
       WHERE "userId" = $1 AND used = false AND "expiresAt" > NOW()
       ORDER BY "createdAt" DESC 
       LIMIT 1`,
      [userId]
    )

    if (codeResult.rows.length === 0) {
      await client.end()
      return NextResponse.json(
        { error: 'Geçerli kod bulunamadı veya süresi dolmuş' },
        { status: 400 }
      )
    }

    const savedCode = codeResult.rows[0]

    // Kod kontrolü
    if (savedCode.code !== code) {
      await client.end()
      return NextResponse.json(
        { error: 'Kod hatalı' },
        { status: 400 }
      )
    }

    // Kodu kullanıldı olarak işaretle
    await client.query(
      'UPDATE sms_codes SET used = true WHERE id = $1',
      [savedCode.id]
    )

    await client.end()

    return NextResponse.json({
      success: true,
      message: 'Kod doğrulandı'
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('OTP verify error:', error)
    return NextResponse.json(
      { error: error.message || 'Kod doğrulanırken bir hata oluştu' },
      { status: 500 }
    )
  }
}
