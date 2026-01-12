import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'
import { sendAlert, logSms } from '@/lib/sms'

// Global ayarları çek
async function getGlobalSettings(client: Client) {
  const result = await client.query(
    `SELECT * FROM global_settings ORDER BY "updatedAt" DESC LIMIT 1`
  )
  
  if (result.rows.length === 0) {
    return {
      netgsmAlertEnabled: false,
      netgsmAlertMessage: null
    }
  }
  
  return {
    netgsmAlertEnabled: result.rows[0].netgsmAlertEnabled || false,
    netgsmAlertMessage: result.rows[0].netgsmAlertMessage || null
  }
}

/**
 * Gecikme kontrolü ve otomatik SMS uyarıları
 * GET /api/cron/check-delays
 * 
 * Personel için: Görev YAPILIYOR durumunda ve assignedAt üzerinden 30 dakika geçmişse SMS
 * Yönetici için: Görev ONAY_BEKLIYOR durumunda ve submittedAt üzerinden 15 dakika geçmişse SMS
 */
export async function GET(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // API Key kontrolü (cron job güvenliği için)
    const apiKey = request.headers.get('x-api-key')
    const expectedKey = process.env.CRON_API_KEY

    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { status: 401 }
      )
    }

    await client.connect()

    // Global ayarları çek
    const globalSettings = await getGlobalSettings(client)
    
    // Eğer alert gönderimi kapalıysa, işlemi sonlandır
    if (!globalSettings.netgsmAlertEnabled) {
      await client.end()
      return NextResponse.json({
        success: true,
        message: 'NetGSM uyarı mesajı gönderimi kapalı',
        sentSms: []
      })
    }

    const now = new Date()
    const sentSms: string[] = []

    // 1. Personel için gecikme kontrolü (30 dakika)
    // Görev YAPILIYOR durumunda ve assignedAt üzerinden 30 dakika geçmişse
    const staffDelayThreshold = new Date(now.getTime() - 30 * 60 * 1000) // 30 dakika önce

    const staffDelayedTasks = await client.query(
      `SELECT 
        t.id, t.title, t."assignedAt", t."lastReminderSentAt",
        u.id as user_id, u."fullName", u.phone
      FROM tasks t
      LEFT JOIN users u ON t."assignedTo" = u.id
      WHERE 
        t.status IN ('in_progress', 'pending')
        AND t."assignedAt" IS NOT NULL
        AND t."assignedAt" < $1
        AND u.phone IS NOT NULL
        AND (
          t."lastReminderSentAt" IS NULL 
          OR t."lastReminderSentAt" < $2
        )
      ORDER BY t."assignedAt" ASC`,
      [staffDelayThreshold, new Date(now.getTime() - 60 * 60 * 1000)] // Son 1 saat içinde SMS gönderilmemiş olmalı
    )

    for (const task of staffDelayedTasks.rows) {
      if (!task.phone) continue

      const delayMinutes = Math.floor((now.getTime() - new Date(task.assignedAt).getTime()) / (1000 * 60))
      
      // Global ayarlardan mesajı al, yoksa varsayılan mesajı kullan
      let message = globalSettings.netgsmAlertMessage
      if (!message || message.trim() === '') {
        message = `Merhaba ${task.fullName}, "${task.title}" göreviniz ${delayMinutes} dakikadır devam ediyor. Lütfen görevi tamamlayın veya durumunu güncelleyin.`
      } else {
        // Mesajda {fullName}, {taskTitle}, {delayMinutes} gibi placeholder'ları değiştir
        message = message
          .replace(/{fullName}/g, task.fullName)
          .replace(/{taskTitle}/g, task.title)
          .replace(/{delayMinutes}/g, delayMinutes.toString())
      }

      const smsResult = await sendAlert({
        phone: task.phone,
        message,
        encoding: 'TR'
      })

      // SMS log kaydet
      await logSms({
        userId: task.user_id,
        taskId: task.id,
        phone: task.phone,
        message,
        type: 'alert',
        status: smsResult.success ? 'success' : 'failed',
        jobId: smsResult.jobId,
        errorCode: smsResult.code,
        errorMessage: smsResult.error
      })

      // lastReminderSentAt güncelle
      if (smsResult.success) {
        await client.query(
          'UPDATE tasks SET "lastReminderSentAt" = NOW() WHERE id = $1',
          [task.id]
        )
        sentSms.push(`Personel: ${task.fullName} - ${task.title}`)
      }
    }

    // 2. Yönetici için gecikme kontrolü (15 dakika)
    // Görev ONAY_BEKLIYOR durumunda ve submittedAt üzerinden 15 dakika geçmişse
    const managerDelayThreshold = new Date(now.getTime() - 15 * 60 * 1000) // 15 dakika önce

    // Yöneticileri bul (MANAGER rolündeki kullanıcılar)
    const managers = await client.query(
      `SELECT id, "fullName", phone FROM users WHERE role = 'MANAGER' AND phone IS NOT NULL`
    )

    let managerDelayedCount = 0

    if (managers.rows.length > 0) {
      const managerDelayedTasks = await client.query(
        `SELECT 
          t.id, t.title, t."submittedAt", t."lastReminderSentAt",
          u.id as user_id, u."fullName" as staff_name
        FROM tasks t
        LEFT JOIN users u ON t."assignedTo" = u.id
        WHERE 
          t.status = 'BEKLIYOR'
          AND t."submittedAt" IS NOT NULL
          AND t."submittedAt" < $1
          AND (
            t."lastReminderSentAt" IS NULL 
            OR t."lastReminderSentAt" < $2
          )
        ORDER BY t."submittedAt" ASC`,
        [managerDelayThreshold, new Date(now.getTime() - 60 * 60 * 1000)] // Son 1 saat içinde SMS gönderilmemiş olmalı
      )

      managerDelayedCount = managerDelayedTasks.rows.length

      // Her yöneticiye gecikmiş görev sayısını bildir
      if (managerDelayedTasks.rows.length > 0) {
        const delayMinutes = Math.floor((now.getTime() - new Date(managerDelayedTasks.rows[0].submittedAt).getTime()) / (1000 * 60))
        
        for (const manager of managers.rows) {
          const message = `Merhaba ${manager.fullName}, ${managerDelayedTasks.rows.length} adet görev onayınızı bekliyor. En eski görev ${delayMinutes} dakikadır bekliyor. Lütfen kontrol edin.`

          const smsResult = await sendAlert({
            phone: manager.phone,
            message,
            encoding: 'TR'
          })

          // SMS log kaydet
          await logSms({
            userId: manager.id,
            phone: manager.phone,
            message,
            type: 'alert',
            status: smsResult.success ? 'success' : 'failed',
            jobId: smsResult.jobId,
            errorCode: smsResult.code,
            errorMessage: smsResult.error
          })

          if (smsResult.success) {
            // Tüm gecikmiş görevlerin lastReminderSentAt'ını güncelle
            await client.query(
              `UPDATE tasks 
               SET "lastReminderSentAt" = NOW() 
               WHERE id = ANY($1::uuid[])`,
              [managerDelayedTasks.rows.map((t: any) => t.id)]
            )
            sentSms.push(`Yönetici: ${manager.fullName} - ${managerDelayedTasks.rows.length} görev`)
          }
        }
      }
    }

    await client.end()

    return NextResponse.json({
      success: true,
      message: `${sentSms.length} SMS gönderildi`,
      sentSms,
      staffDelayed: staffDelayedTasks.rows.length,
      managerDelayed: managerDelayedCount
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Check delays error:', error)
    return NextResponse.json(
      { error: error.message || 'Gecikme kontrolü sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}
