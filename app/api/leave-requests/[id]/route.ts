import { NextRequest, NextResponse } from 'next/server'
import { requireManagerOrSupervisor } from '@/lib/auth-helpers'
import { Client } from 'pg'

// İzin talebini onayla/reddet (PUT)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    const currentUser = await requireManagerOrSupervisor()
    const { id } = params
    const body = await request.json()
    const { status, message } = body // status: 'approved' veya 'rejected'

    if (!status || (status !== 'approved' && status !== 'rejected')) {
      return NextResponse.json(
        { error: 'Geçersiz durum. "approved" veya "rejected" olmalı' },
        { status: 400 }
      )
    }

    await client.connect()

    // İzin talebini bul
    const leaveResult = await client.query(
      'SELECT "userId", status FROM leave_requests WHERE id = $1',
      [id]
    )

    if (leaveResult.rows.length === 0) {
      await client.end()
      return NextResponse.json(
        { error: 'İzin talebi bulunamadı' },
        { status: 404 }
      )
    }

    const leaveRequest = leaveResult.rows[0]

    if (leaveRequest.status !== 'pending') {
      await client.end()
      return NextResponse.json(
        { error: 'Bu izin talebi zaten işlenmiş' },
        { status: 400 }
      )
    }

    // İzin talebini güncelle
    await client.query(
      `UPDATE leave_requests 
       SET status = $1, "reviewedBy" = $2, "reviewedAt" = NOW(), "updatedAt" = NOW()
       ${message ? ', description = COALESCE(description || \'\\n\' || $4, $4)' : ''}
       WHERE id = $3`,
      message 
        ? [status.toUpperCase(), currentUser.id, id, `\n[${status === 'approved' ? 'Onaylandı' : 'Reddedildi'}] ${message || ''}`]
        : [status.toUpperCase(), currentUser.id, id]
    )

    // Kullanıcıya bildirim gönder
    await client.query(
      `INSERT INTO notifications (id, "userId", title, message, type, "isRead", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, false, NOW(), NOW())`,
      [
        leaveRequest.userId,
        status === 'approved' ? 'İzin Talebi Onaylandı' : 'İzin Talebi Reddedildi',
        status === 'approved' 
          ? `İzin talebiniz onaylandı.${message ? ' ' + message : ''}`
          : `İzin talebiniz reddedildi.${message ? ' Sebep: ' + message : ''}`,
        status === 'approved' ? 'success' : 'error'
      ]
    )

    await client.end()

    return NextResponse.json({
      success: true,
      message: status === 'approved' ? 'İzin talebi onaylandı' : 'İzin talebi reddedildi'
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error updating leave request:', error)
    return NextResponse.json(
      { error: error.message || 'İzin talebi güncellenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
