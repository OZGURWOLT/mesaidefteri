import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { Client } from 'pg'

export async function POST(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // Session'dan kullanıcıyı al
    const currentUser = await requireAuth()
    
    const body = await request.json()
    const { 
      title, 
      description, 
      taskType, 
      priceLogs, 
      photos = [],
      taskId 
    } = body

    // Validasyon
    if (!title || !taskType) {
      return NextResponse.json(
        { error: 'Görev başlığı ve türü zorunludur' },
        { status: 400 }
      )
    }

    await client.connect()

    // Eğer taskId varsa, mevcut görevi güncelle
    if (taskId) {
      // Görev var mı ve kullanıcıya ait mi kontrol et
      const existingResult = await client.query(
        'SELECT id, "assignedTo" FROM tasks WHERE id = $1',
        [taskId]
      )

      if (existingResult.rows.length === 0) {
        await client.end()
        return NextResponse.json(
          { error: 'Görev bulunamadı' },
          { status: 404 }
        )
      }

      const existingTask = existingResult.rows[0]

      if (existingTask.assignedTo !== currentUser.id) {
        await client.end()
        return NextResponse.json(
          { error: 'Bu görevi güncellemek için yetkiniz yok' },
          { status: 403 }
        )
      }

      // Mevcut görevi güncelle (yeni schema'ya göre)
      // taskType'ı type enum'una çevir (eski format uyumluluğu için)
      let taskTypeEnum = 'STANDART_GOREV'
      if (taskType === 'FIYAT_ARASTIRMASI' || taskType?.includes('Fiyat') || taskType?.includes('fiyat')) {
        taskTypeEnum = 'FIYAT_ARASTIRMASI'
      }

      await client.query(
        `UPDATE tasks 
         SET title = $1, description = $2, type = $3::"TaskType", photos = $4, status = $5, 
             "submittedAt" = CASE WHEN $5 = 'BEKLIYOR' AND "submittedAt" IS NULL THEN NOW() ELSE "submittedAt" END,
             "updatedAt" = NOW()
         WHERE id = $6
         RETURNING id, title, description, type, status, photos, "submittedAt", "assignedAt"`,
        [title, description || null, taskTypeEnum, JSON.stringify(photos || []), 'BEKLIYOR', taskId]
      )

      // PriceLog'ları güncelle veya oluştur (varsa)
      if (priceLogs && Array.isArray(priceLogs) && priceLogs.length > 0) {
        // Eski priceLog'ları sil
        await client.query('DELETE FROM price_logs WHERE "taskId" = $1', [taskId])

        // Yeni priceLog'ları oluştur
        for (const log of priceLogs) {
          await client.query(
            `INSERT INTO price_logs (id, "productName", "ourPrice", "migrosPrice", "getirPrice", "a101Price", "sarayPrice", "grossPrice", "photoUrl", "taskId", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
            [
              log.productName || '',
              parseFloat(log.ourPrice) || 0,
              log.migrosPrice ? parseFloat(log.migrosPrice) : null,
              log.getirPrice ? parseFloat(log.getirPrice) : null,
              log.a101Price ? parseFloat(log.a101Price) : null,
              log.sarayGross ? parseFloat(log.sarayGross) : null,
              log.urfaGross ? parseFloat(log.urfaGross) : null,
              log.photo || null,
              taskId
            ]
          )
        }
      }

      await client.end()

      return NextResponse.json({
        success: true,
        message: 'Görev başarıyla güncellendi ve gönderildi'
      })
    }

    // Yeni görev oluştur (yeni schema'ya göre)
    // taskType'ı type enum'una çevir (eski format uyumluluğu için)
    let taskTypeEnum = 'STANDART_GOREV'
    if (taskType === 'FIYAT_ARASTIRMASI' || taskType?.includes('Fiyat') || taskType?.includes('fiyat')) {
      taskTypeEnum = 'FIYAT_ARASTIRMASI'
    }

    const insertResult = await client.query(
      `INSERT INTO tasks (id, title, description, type, repetition, "hasCustomDuration", "durationMinutes", 
                         "assignedTo", "assignedBy", "isTemplate", status, photos, "assignedAt", "submittedAt", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3::"TaskType", 'TEK_SEFERLIK'::"TaskRepetition", false, null, 
               $4, $4, false, $5, $6, NOW(), NOW(), NOW(), NOW())
       RETURNING id, title, description, type, status, photos, "assignedAt", "submittedAt"`,
      [title, description || null, taskTypeEnum, currentUser.id, 'BEKLIYOR', JSON.stringify(photos || [])]
    )

    const newTask = insertResult.rows[0]

    // PriceLog'ları oluştur (varsa)
    if (priceLogs && Array.isArray(priceLogs) && priceLogs.length > 0) {
      for (const log of priceLogs) {
        await client.query(
          `INSERT INTO price_logs (id, "productName", "ourPrice", "migrosPrice", "getirPrice", "a101Price", "sarayPrice", "grossPrice", "photoUrl", "taskId", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [
            log.productName || '',
            parseFloat(log.ourPrice) || 0,
            log.migrosPrice ? parseFloat(log.migrosPrice) : null,
            log.getirPrice ? parseFloat(log.getirPrice) : null,
            log.a101Price ? parseFloat(log.a101Price) : null,
            log.sarayGross ? parseFloat(log.sarayGross) : null,
            log.urfaGross ? parseFloat(log.urfaGross) : null,
            log.photo || null,
            newTask.id
          ]
        )
      }
    }

    // Sistem logu oluştur
    try {
      const userResult = await client.query(
        `SELECT u."fullName", u."staffDuty", u."branchId", b.name as "branchName"
         FROM users u
         LEFT JOIN branches b ON u."branchId" = b.id
         WHERE u.id = $1`,
        [currentUser.id]
      )
      const user = userResult.rows[0]

      await client.query(
        `INSERT INTO system_logs (id, type, description, "userId", "taskId", "branchId", details, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())`,
        [
          taskId ? 'task_submitted' : 'task_completed',
          `${user?.fullName || 'Personel'} - "${title}" görevini ${taskId ? 'güncelledi' : 'tamamladı'}`,
          currentUser.id,
          taskId || newTask.id,
          user?.branchId || null,
          JSON.stringify({
            taskTitle: title,
            taskType: taskTypeEnum,
            hasPhotos: (photos || []).length > 0
          })
        ]
      )
    } catch (logError) {
      console.error('System log oluşturma hatası:', logError)
    }

    await client.end()

    return NextResponse.json({
      success: true,
      task: {
        id: newTask.id,
        title: newTask.title,
        description: newTask.description,
        taskType: newTask.taskType,
        status: newTask.status,
        photos: typeof newTask.photos === 'string' ? JSON.parse(newTask.photos) : newTask.photos,
        submittedAt: newTask.submittedAt
      },
      message: 'Görev başarıyla oluşturuldu ve gönderildi'
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error submitting task:', error)
    return NextResponse.json(
      { error: error.message || 'Görev gönderilirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
