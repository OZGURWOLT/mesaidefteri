import { NextRequest, NextResponse } from 'next/server'
import { sendOTP, logSms } from '@/lib/sms'
import { Client } from 'pg'

/**
 * Şifre sıfırlama için OTP gönder
 * POST /api/auth/forgot-password/request
 */
export async function POST(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    const body = await request.json()
    const { username, phone, userId } = body

    // Eğer userId varsa (yeniden gönderim), direkt OTP gönder
    if (userId) {
      await client.connect()
      
      const userResult = await client.query(
        'SELECT id, phone, username FROM users WHERE id = $1',
        [userId]
      )

      if (userResult.rows.length === 0) {
        await client.end()
        return NextResponse.json(
          { error: 'Kullanıcı bulunamadı' },
          { status: 404 }
        )
      }

      const user = userResult.rows[0]
      if (!user.phone) {
        await client.end()
        return NextResponse.json(
          { error: 'Kullanıcının telefon numarası kayıtlı değil' },
          { status: 400 }
        )
      }

      // Şifre sıfırlama için OTP her zaman aktif (global ayardan bağımsız)
      // 6 haneli rastgele kod oluştur
      const code = Math.floor(100000 + Math.random() * 900000).toString()

      // Eski kodları geçersiz kıl
      await client.query(
        'UPDATE sms_codes SET used = true WHERE "userId" = $1 AND used = false',
        [userId]
      )

      // Yeni OTP kodunu kaydet (10 dakika geçerli)
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + 10)

      await client.query(
        `INSERT INTO sms_codes (id, "userId", code, "expiresAt", used, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, false, NOW())`,
        [userId, code, expiresAt]
      )

      await client.end()

      // SMS gönder
      const smsResult = await sendOTP({
        phone: user.phone,
        code,
        appname: 'Mesaidefteri'
      })

      // SMS log kaydet
      await logSms({
        userId: userId,
        phone: user.phone,
        message: `Sifre sifirlama kodunuz: ${code}. Bu kodu kimseyle paylasmayin.`,
        type: 'otp',
        status: smsResult.success ? 'success' : 'failed',
        jobId: smsResult.jobId,
        errorCode: smsResult.code,
        errorMessage: smsResult.error
      })

      if (smsResult.success) {
        return NextResponse.json({
          success: true,
          message: 'Doğrulama kodu gönderildi',
          expiresAt: expiresAt.toISOString()
        })
      } else {
        return NextResponse.json(
          { error: smsResult.error || 'SMS gönderilemedi' },
          { status: 500 }
        )
      }
    }

    // Kullanıcı adı veya telefon ile kullanıcıyı bul
    if (!username && !phone) {
      return NextResponse.json(
        { error: 'Kullanıcı adı veya telefon numarası gerekli' },
        { status: 400 }
      )
    }

    await client.connect()

    // Şifre sıfırlama için OTP her zaman aktif (global ayardan bağımsız)
    // Kullanıcıyı bul
    let userResult
    if (username) {
      userResult = await client.query(
        'SELECT id, phone, username FROM users WHERE username = $1',
        [username.trim().toLowerCase()]
      )
    } else if (phone) {
      // Telefon numarasını temizle
      const cleanedPhone = phone.replace(/[\s\-\(\)\+]/g, '').replace(/^90/, '').replace(/^0/, '')
      userResult = await client.query(
        'SELECT id, phone, username FROM users WHERE phone LIKE $1 OR phone LIKE $2 OR phone LIKE $3',
        [`%${cleanedPhone}%`, `%0${cleanedPhone}%`, `%90${cleanedPhone}%`]
      )
    }

    if (!userResult || userResult.rows.length === 0) {
      await client.end()
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    const user = userResult.rows[0]

    if (!user.phone) {
      await client.end()
      return NextResponse.json(
        { error: 'Kullanıcının telefon numarası kayıtlı değil. Lütfen sistem yöneticisi ile iletişime geçin.' },
        { status: 400 }
      )
    }

    // 6 haneli rastgele kod oluştur
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Eski kodları geçersiz kıl
    await client.query(
      'UPDATE sms_codes SET used = true WHERE "userId" = $1 AND used = false',
      [user.id]
    )

    // Yeni OTP kodunu kaydet (10 dakika geçerli)
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    await client.query(
      `INSERT INTO sms_codes (id, "userId", code, "expiresAt", used, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, false, NOW())`,
      [user.id, code, expiresAt]
    )

    await client.end()

    // SMS gönder
    const smsResult = await sendOTP({
      phone: user.phone,
      code,
      appname: 'Mesaidefteri'
    })

    // SMS log kaydet
    await logSms({
      userId: user.id,
      phone: user.phone,
      message: `Sifre sifirlama kodunuz: ${code}. Bu kodu kimseyle paylasmayin.`,
      type: 'otp',
      status: smsResult.success ? 'success' : 'failed',
      jobId: smsResult.jobId,
      errorCode: smsResult.code,
      errorMessage: smsResult.error
    })

    if (smsResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Doğrulama kodu gönderildi',
        userId: user.id,
        phone: user.phone,
        expiresAt: expiresAt.toISOString()
      })
    } else {
      return NextResponse.json(
        { error: smsResult.error || 'SMS gönderilemedi' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Forgot password request error:', error)
    return NextResponse.json(
      { error: error.message || 'İşlem sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}
