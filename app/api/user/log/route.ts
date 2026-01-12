import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { UserActivityType } from '@prisma/client'
import { Client } from 'pg'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Build-time check
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('dummy')) {
      return NextResponse.json({ success: false, error: 'Build-time: route not available' }, { status: 503 })
    }
    
    // Session'dan kullanıcıyı al
    const currentUser = await requireAuth()
    
    const body = await request.json()
    const { type, latitude, longitude } = body

    // Type kontrolü
    if (type !== 'LOGIN' && type !== 'LOGOUT') {
      return NextResponse.json(
        { error: 'Geçersiz aktivite tipi' },
        { status: 400 }
      )
    }

    // Lazy import - sadece runtime'da import et
    const { prisma } = await import('@/lib/prisma')

    // UserActivity kaydı oluştur
    const activity = await prisma.userActivity.create({
      data: {
        userId: currentUser.id,
        type: type as UserActivityType,
        latitude: latitude ? parseFloat(latitude.toString()) : null,
        longitude: longitude ? parseFloat(longitude.toString()) : null
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            branchId: true
          }
        }
      }
    })

    // Sistem logu oluştur
    try {
      const logClient = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
      })
      await logClient.connect()
      
      await logClient.query(
        `INSERT INTO system_logs (id, type, description, "userId", "branchId", details, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())`,
        [
          type.toLowerCase(),
          `${activity.user.fullName || activity.user.username} - ${type === 'LOGIN' ? 'Sisteme giriş yaptı' : 'Sistemden çıkış yaptı'}`,
          currentUser.id,
          activity.user.branchId || null,
          JSON.stringify({
            hasLocation: latitude !== null && longitude !== null,
            latitude: latitude || null,
            longitude: longitude || null
          })
        ]
      )
      
      await logClient.end()
    } catch (logError) {
      console.error('System log oluşturma hatası:', logError)
    }

    return NextResponse.json({ 
      success: true, 
      activity,
      message: `${type === 'LOGIN' ? 'Giriş' : 'Çıkış'} konumu kaydedildi` 
    })
  } catch (error) {
    console.error('Error logging user activity:', error)
    return NextResponse.json(
      { error: 'Konum kaydedilirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
