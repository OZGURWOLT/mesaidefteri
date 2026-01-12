import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'
import bcrypt from 'bcryptjs'

/**
 * Şifre sıfırla
 * POST /api/auth/forgot-password/reset
 */
export async function POST(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    const body = await request.json()
    const { userId, newPassword } = body

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'Kullanıcı ID ve yeni şifre gerekli' },
        { status: 400 }
      )
    }

    // Şifre validasyonu
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Şifre en az 6 karakter olmalıdır' },
        { status: 400 }
      )
    }

    if (!/[A-Z]/.test(newPassword)) {
      return NextResponse.json(
        { error: 'Şifre en az bir büyük harf içermelidir' },
        { status: 400 }
      )
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      return NextResponse.json(
        { error: 'Şifre en az bir noktalama işareti içermelidir' },
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

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Şifreyi güncelle
    await client.query(
      'UPDATE users SET password = $1, "mustChangePassword" = false, "updatedAt" = NOW() WHERE id = $2',
      [hashedPassword, userId]
    )

    await client.end()

    return NextResponse.json({
      success: true,
      message: 'Şifre başarıyla güncellendi'
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: error.message || 'Şifre güncellenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
