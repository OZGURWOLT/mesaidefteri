import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { Client } from 'pg'

/**
 * OTP kodunu doğrula
 * POST /api/sms/verify
 */
export async function POST(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    const currentUser = await requireAuth()
    const body = await request.json()
    const { code } = body

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: 'Geçerli bir 6 haneli kod giriniz' },
        { status: 400 }
      )
    }

    await client.connect()

    // Kullanıcının en son gönderilen, kullanılmamış ve geçerli kodu bul
    const codeResult = await client.query(
      `SELECT id, code, "expiresAt", used 
       FROM sms_codes 
       WHERE "userId" = $1 AND used = false AND "expiresAt" > NOW()
       ORDER BY "createdAt" DESC
       LIMIT 1`,
      [currentUser.id]
    )

    if (codeResult.rows.length === 0) {
      await client.end()
      return NextResponse.json(
        { error: 'Geçerli bir doğrulama kodu bulunamadı. Lütfen yeni kod isteyin.' },
        { status: 404 }
      )
    }

    const smsCode = codeResult.rows[0]

    // Kod kontrolü
    if (smsCode.code !== code) {
      await client.end()
      return NextResponse.json(
        { error: 'Doğrulama kodu hatalı' },
        { status: 400 }
      )
    }

    // Kodu kullanıldı olarak işaretle
    await client.query(
      'UPDATE sms_codes SET used = true WHERE id = $1',
      [smsCode.id]
    )

    await client.end()

    return NextResponse.json({
      success: true,
      message: 'Doğrulama başarılı'
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('OTP verify error:', error)
    return NextResponse.json(
      { error: error.message || 'Doğrulama sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}
