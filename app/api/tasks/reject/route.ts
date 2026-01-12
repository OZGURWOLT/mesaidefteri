import { NextRequest, NextResponse } from 'next/server'
import { requireManagerOrSupervisor } from '@/lib/auth-helpers'
import { Client } from 'pg'

export async function POST(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // Session'dan kullanıcıyı al ve yetki kontrolü yap
    const currentUser = await requireManagerOrSupervisor()
    
    const body = await request.json()
    const { taskId, message, userId } = body

    if (!taskId) {
      return NextResponse.json(
        { error: 'Görev ID gerekli' },
        { status: 400 }
      )
    }

    await client.connect()

    // Görevi bul
    const taskResult = await client.query(
      'SELECT id, "assignedTo", status, title FROM tasks WHERE id = $1',
      [taskId]
    )

    if (taskResult.rows.length === 0) {
      await client.end()
      return NextResponse.json(
        { error: 'Görev bulunamadı' },
        { status: 404 }
      )
    }

    const task = taskResult.rows[0]

    if (task.status !== 'BEKLIYOR') {
      await client.end()
      return NextResponse.json(
        { error: 'Bu görev onay bekliyor durumunda değil' },
        { status: 400 }
      )
    }

    // Görevi reddet
    await client.query(
      'UPDATE tasks SET status = $1, "updatedAt" = NOW() WHERE id = $2',
      ['REDDEDILDI', taskId]
    )

    // Personel için bildirim oluştur
    const rejectionMessage = message || 'Fiyatlar Hatalı, Tekrar Kontrol Et'
    
    if (task.assignedTo) {
      await client.query(
        `INSERT INTO notifications (id, "userId", "taskId", title, message, type, "isRead", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, false, NOW(), NOW())`,
        [
          task.assignedTo,
          taskId,
          'Görev Reddedildi',
          `${task.title} göreviniz reddedildi. ${rejectionMessage}`,
          'error'
        ]
      )
    }

    // Sistem logu oluştur
    try {
      const userResult = await client.query(
        `SELECT u."fullName", u."staffDuty", u."branchId", b.name as "branchName"
         FROM users u
         LEFT JOIN branches b ON u."branchId" = b.id
         WHERE u.id = $1`,
        [task.assignedTo]
      )
      const assignedUser = userResult.rows[0]

      await client.query(
        `INSERT INTO system_logs (id, type, description, "userId", "taskId", "branchId", details, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())`,
        [
          'task_rejected',
          `${currentUser.fullName || 'Yönetici'} - "${task.title}" görevini reddetti`,
          task.assignedTo,
          taskId,
          assignedUser?.branchId || null,
          JSON.stringify({
            taskTitle: task.title,
            rejectedBy: currentUser.fullName || currentUser.id,
            reason: rejectionMessage
          })
        ]
      )
    } catch (logError) {
      console.error('System log oluşturma hatası:', logError)
    }

    await client.end()

    return NextResponse.json({ 
      success: true, 
      message: 'Görev reddedildi ve personele bildirim gönderildi' 
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error rejecting task:', error)
    return NextResponse.json(
      { error: error.message || 'Görev reddedilirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
