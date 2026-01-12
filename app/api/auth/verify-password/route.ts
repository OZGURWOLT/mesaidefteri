import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'
import { Client } from 'pg'

/**
 * Mevcut şifreyi doğrula (POST)
 * Kullanıcı kendi şifresini değiştirirken mevcut şifresini kontrol etmek için
 */
export async function POST(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // Oturum kontrolü
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Oturum bulunamadı. Lütfen giriş yapın.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { userId, password } = body

    // Kullanıcı ID kontrolü - sadece kendi şifresini doğrulayabilir
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Başka bir kullanıcının şifresini doğrulayamazsınız' },
        { status: 403 }
      )
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Şifre gereklidir' },
        { status: 400 }
      )
    }

    await client.connect()

    // Kullanıcıyı ve şifresini çek
    const result = await client.query(
      'SELECT id, password FROM users WHERE id = $1',
      [userId]
    )

    if (result.rows.length === 0) {
      await client.end()
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    const user = result.rows[0]

    // Şifre kontrolü
    const isPasswordValid = await bcrypt.compare(password, user.password)

    await client.end()

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Mevcut şifre hatalı' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Şifre doğrulandı'
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error verifying password:', error)

    return NextResponse.json(
      { error: error.message || 'Şifre doğrulanırken bir hata oluştu' },
      { status: 500 }
    )
  }
}
