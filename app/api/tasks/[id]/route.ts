import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'
import { requireManagerOrSupervisor } from '@/lib/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    const taskId = params.id

    await client.connect()

    // Görevi çek (yeni schema'ya göre)
    const taskResult = await client.query(
      `SELECT 
        t.id, t.title, t.description, t.status, t.type, t.repetition, 
        t."hasCustomDuration", t."durationMinutes", t."isTemplate",
        t."assignedAt", t."submittedAt", t."createdAt", t.photos, t."assignedTo", t."assignedBy",
        u.id as user_id, u."fullName" as user_fullName, u.role as user_role, u.username as user_username
      FROM tasks t
      LEFT JOIN users u ON t."assignedTo" = u.id
      WHERE t.id = $1`,
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

    // PriceLog'ları çek (varsa - sadece FIYAT_ARASTIRMASI tipinde)
    let priceLogs: any[] = []
    if (task.type === 'FIYAT_ARASTIRMASI') {
      const priceLogsResult = await client.query(
        'SELECT id, "productName", "ourPrice", "migrosPrice", "getirPrice", "a101Price", "sarayPrice", "grossPrice", status FROM price_logs WHERE "taskId" = $1',
        [taskId]
      )
      priceLogs = priceLogsResult.rows
    }

    await client.end()

    // Photos'u parse et (JSON string ise)
    let photos: string[] = []
    if (task.photos) {
      if (typeof task.photos === 'string') {
        try {
          photos = JSON.parse(task.photos)
        } catch {
          photos = [task.photos]
        }
      } else if (Array.isArray(task.photos)) {
        photos = task.photos
      }
    }

    // API response formatına dönüştür (yeni schema'ya göre)
    const formattedTask = {
      id: task.id,
      title: task.title,
      description: task.description || '',
      type: task.type || 'STANDART_GOREV',
      repetition: task.repetition || 'TEK_SEFERLIK',
      hasCustomDuration: task.hasCustomDuration || false,
      durationMinutes: task.durationMinutes || null,
      isTemplate: task.isTemplate || false,
      status: task.status,
      assignedAt: task.assignedAt ? task.assignedAt.toISOString() : null,
      submittedAt: task.submittedAt ? task.submittedAt.toISOString() : null,
      createdAt: task.createdAt.toISOString(),
      photos: photos,
      // Eski format uyumluluğu için
      staffName: task.user_fullName || 'Bilinmeyen',
      staffRole: task.user_role || 'Bilinmeyen',
      staffId: task.user_id || '',
      taskType: task.type || 'STANDART_GOREV',
      taskTitle: task.title,
      data: priceLogs.length > 0
        ? {
            priceLogs: priceLogs.map(log => ({
              id: log.id,
              productName: log.productName,
              ourPrice: parseFloat(log.ourPrice) || 0,
              migrosPrice: log.migrosPrice ? parseFloat(log.migrosPrice) : null,
              getirPrice: log.getirPrice ? parseFloat(log.getirPrice) : null,
              a101Price: log.a101Price ? parseFloat(log.a101Price) : null,
              sarayPrice: log.sarayPrice ? parseFloat(log.sarayPrice) : null,
              grossPrice: log.grossPrice ? parseFloat(log.grossPrice) : null,
              status: log.status
            })),
            totalProducts: priceLogs.length
          }
        : undefined
    }

    return NextResponse.json({ task: formattedTask })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: 'Görev yüklenirken bir hata oluştu: ' + error.message },
      { status: 500 }
    )
  }
}

// Görev güncelleme (Yönetici/Supervizör için)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // Yetki kontrolü
    await requireManagerOrSupervisor()
    
    const taskId = params.id
    const body = await request.json()
    const { status, assignedTo } = body

    await client.connect()

    // Görevi bul
    const taskResult = await client.query(
      'SELECT id, "assignedTo", status FROM tasks WHERE id = $1',
      [taskId]
    )

    if (taskResult.rows.length === 0) {
      await client.end()
      return NextResponse.json(
        { error: 'Görev bulunamadı' },
        { status: 404 }
      )
    }

    // Güncelleme yap
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`)
      values.push(status)
      paramIndex++
    }

    if (assignedTo !== undefined) {
      updates.push(`"assignedTo" = $${paramIndex}`)
      values.push(assignedTo || null)
      paramIndex++
      
      // Eğer assignedTo değiştiyse assignedAt'i güncelle
      if (assignedTo) {
        updates.push(`"assignedAt" = NOW()`)
      }
    }

    if (updates.length === 0) {
      await client.end()
      return NextResponse.json(
        { error: 'Güncellenecek alan belirtilmedi' },
        { status: 400 }
      )
    }

    updates.push(`"updatedAt" = NOW()`)
    values.push(taskId)

    await client.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    )

    await client.end()

    return NextResponse.json({
      success: true,
      message: 'Görev başarıyla güncellendi'
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error updating task:', error)
    
    if (error.message?.includes('Yetkisiz')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Görev güncellenirken bir hata oluştu: ' + error.message },
      { status: 500 }
    )
  }
}
