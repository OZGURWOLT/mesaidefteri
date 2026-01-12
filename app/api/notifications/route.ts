import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Belirli bir kullanıcının bildirimlerini getir
export async function GET(request: NextRequest) {
  try {
    // Build-time check
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('dummy')) {
      return NextResponse.json({ notifications: [] })
    }
    
    // Session'dan kullanıcıyı al
    const currentUser = await requireAuth()
    const userId = currentUser.id

    // Lazy import - sadece runtime'da import et
    const { prisma } = await import('@/lib/prisma')

    const notifications = await prisma.notification.findMany({
      where: {
        userId: userId,
        isRead: false // Sadece okunmamış bildirimler
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Son 50 bildirim
    })

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Bildirimler yüklenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}

// Bildirimi okundu olarak işaretle
export async function PATCH(request: NextRequest) {
  try {
    // Build-time check
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('dummy')) {
      return NextResponse.json({ error: 'Build-time: route not available' }, { status: 503 })
    }
    
    const body = await request.json()
    const { notificationId } = body

    if (!notificationId) {
      return NextResponse.json(
        { error: 'notificationId parametresi gerekli' },
        { status: 400 }
      )
    }

    // Lazy import - sadece runtime'da import et
    const { prisma } = await import('@/lib/prisma')

    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    })

    return NextResponse.json({ notification })
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Bildirim güncellenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
