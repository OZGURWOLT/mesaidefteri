import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

// Belirli bir kullanıcının bildirimlerini getir
export async function GET(request: NextRequest) {
  try {
    // Session'dan kullanıcıyı al
    const currentUser = await requireAuth()
    const userId = currentUser.id

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
    const body = await request.json()
    const { notificationId } = body

    if (!notificationId) {
      return NextResponse.json(
        { error: 'notificationId parametresi gerekli' },
        { status: 400 }
      )
    }

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
