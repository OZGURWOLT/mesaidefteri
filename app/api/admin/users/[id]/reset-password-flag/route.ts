import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { Client } from 'pg'

// mustChangePassword flag'ini false yap (POST)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // Oturum kontrolü
    const currentUser = await requireAuth()
    const { id } = params

    // Kullanıcı sadece kendi flag'ini değiştirebilir
    if (currentUser.id !== id) {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      )
    }

    await client.connect()

    // mustChangePassword'ü false yap
    await client.query(
      'UPDATE users SET "mustChangePassword" = false, "updatedAt" = NOW() WHERE id = $1',
      [id]
    )

    await client.end()

    return NextResponse.json({
      success: true,
      message: 'Şifre değiştirme zorunluluğu kaldırıldı'
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error resetting password flag:', error)

    if (error.message?.includes('Yetkisiz')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'İşlem sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}
