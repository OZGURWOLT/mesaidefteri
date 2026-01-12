import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { sendOTP, logSms } from '@/lib/sms'
import { Client } from 'pg'

// Global ayarları çek
async function getGlobalSettings(client: Client) {
  const result = await client.query(
    `SELECT * FROM global_settings ORDER BY "updatedAt" DESC LIMIT 1`
  )
  
  if (result.rows.length === 0) {
    return {
      netgsmOtpEnabled: false
    }
  }
  
  return {
    netgsmOtpEnabled: result.rows[0].netgsmOtpEnabled || false
  }
}

/**
 * OTP SMS gönder
 * POST /api/sms/otp
 */
export async function POST(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    const currentUser = await requireAuth()
    const body = await request.json()
    const { phone } = body

    if (!phone) {
      return NextResponse.json(
        { error: 'Telefon numarası gerekli' },
        { status: 400 }
      )
    }

    // 6 haneli rastgele kod oluştur
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    await client.connect()

    // Global ayarları çek
    const globalSettings = await getGlobalSettings(client)
    
    // Eğer OTP doğrulama kapalıysa, hata döndür
    if (!globalSettings.netgsmOtpEnabled) {
      await client.end()
      return NextResponse.json(
        { error: 'OTP doğrulama şu anda kapalı. Lütfen sistem yöneticisi ile iletişime geçin.' },
        { status: 403 }
      )
    }

    // Kullanıcının telefon numarasını kontrol et veya güncelle
    const userResult = await client.query(
      'SELECT id, phone FROM users WHERE id = $1',
      [currentUser.id]
    )

    if (userResult.rows.length === 0) {
      await client.end()
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    // Telefon numarasını güncelle (eğer farklıysa)
    if (userResult.rows[0].phone !== phone) {
      await client.query(
        'UPDATE users SET phone = $1, "updatedAt" = NOW() WHERE id = $2',
        [phone, currentUser.id]
      )
    }

    // Eski kodları geçersiz kıl (kullanılmamış olanlar)
    await client.query(
      'UPDATE sms_codes SET used = true WHERE "userId" = $1 AND used = false',
      [currentUser.id]
    )

    // Yeni OTP kodunu kaydet (10 dakika geçerli)
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    await client.query(
      `INSERT INTO sms_codes (id, "userId", code, "expiresAt", used, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, false, NOW())`,
      [currentUser.id, code, expiresAt]
    )

    await client.end()

    // SMS gönder
    const smsResult = await sendOTP({
      phone,
      code,
      appname: 'Mesaidefteri'
    })

    // SMS log kaydet
    await logSms({
      userId: currentUser.id,
      phone,
      message: `Kodunuz: ${code}. Bu kodu kimseyle paylasmayin.`,
      type: 'otp',
      status: smsResult.success ? 'success' : 'failed',
      jobId: smsResult.jobId,
      errorCode: smsResult.code,
      errorMessage: smsResult.error
    })

    if (smsResult.success) {
      return NextResponse.json({
        success: true,
        message: 'SMS doğrulama kodu gönderildi',
        expiresAt: expiresAt.toISOString()
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: smsResult.error || 'SMS gönderilemedi'
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('OTP SMS error:', error)
    return NextResponse.json(
      { error: error.message || 'SMS gönderilirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
