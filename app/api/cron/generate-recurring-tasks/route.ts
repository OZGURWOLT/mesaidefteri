import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

/**
 * Tekrarlayan görevleri oluştur (Cron Job)
 * Her gece çalışacak ve şablon görevlerden yeni görevler oluşturacak
 * 
 * GET /api/cron/generate-recurring-tasks?key=CRON_API_KEY
 */
export async function GET(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // API Key kontrolü (güvenlik için)
    const searchParams = request.nextUrl.searchParams
    const apiKey = searchParams.get('key')
    const expectedKey = process.env.CRON_API_KEY || 'your-cron-api-key'

    if (apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await client.connect()

    // Bugünün tarihi ve günü
    const today = new Date()
    const todayDayOfWeek = today.getDay() // 0 = Pazar, 1 = Pazartesi, ..., 6 = Cumartesi
    const todayDateStr = today.toISOString().split('T')[0] // YYYY-MM-DD formatında

    // Şablon görevleri bul (isTemplate: true)
    const templateTasksResult = await client.query(
      `SELECT id, title, description, type, repetition, "hasCustomDuration", 
       "durationMinutes", "assignedTo", "assignedBy", "createdAt"
       FROM tasks 
       WHERE "isTemplate" = true`
    )

    const templateTasks = templateTasksResult.rows
    const createdTasks = []
    const skippedTasks = []

    for (const template of templateTasks) {
      try {
        // GUNLUK: Her gün oluştur
        if (template.repetition === 'GUNLUK') {
          // Bugün için zaten bir görev var mı kontrol et
          const existingTaskResult = await client.query(
            `SELECT id FROM tasks 
             WHERE "isTemplate" = false 
             AND "assignedTo" = $1 
             AND title = $2 
             AND DATE("createdAt") = $3`,
            [template.assignedTo, template.title, todayDateStr]
          )

          if (existingTaskResult.rows.length === 0) {
            // Yeni görev oluştur
            const insertResult = await client.query(
              `INSERT INTO tasks (
                id, title, description, type, repetition, "hasCustomDuration", 
                "durationMinutes", "assignedTo", "assignedBy", "isTemplate", 
                status, "assignedAt", "createdAt", "updatedAt"
              )
              VALUES (
                gen_random_uuid(), $1, $2, $3::"TaskType", $4::"TaskRepetition", 
                $5, $6, $7, $8, false, 
                'BEKLIYOR', NOW(), NOW(), NOW()
              )
              RETURNING id, title`,
              [
                template.title,
                template.description,
                template.type,
                template.repetition,
                template.hasCustomDuration,
                template.durationMinutes,
                template.assignedTo,
                template.assignedBy
              ]
            )

            createdTasks.push({
              id: insertResult.rows[0].id,
              title: insertResult.rows[0].title,
              type: 'GUNLUK'
            })
          } else {
            skippedTasks.push({
              title: template.title,
              reason: 'Bugün için zaten görev mevcut'
            })
          }
        }
        // HAFTALIK: Sadece atandığı günün haftalık tekrarında oluştur
        else if (template.repetition === 'HAFTALIK') {
          // Şablonun oluşturulduğu günü bul
          const templateCreatedDate = new Date(template.createdAt)
          const templateDayOfWeek = templateCreatedDate.getDay()

          // Bugün şablonun oluşturulduğu günle eşleşiyor mu?
          if (todayDayOfWeek === templateDayOfWeek) {
            // Bu hafta için zaten bir görev var mı kontrol et
            const weekStart = new Date(today)
            weekStart.setDate(today.getDate() - todayDayOfWeek) // Haftanın başlangıcı (Pazar)
            weekStart.setHours(0, 0, 0, 0)

            const existingTaskResult = await client.query(
              `SELECT id FROM tasks 
               WHERE "isTemplate" = false 
               AND "assignedTo" = $1 
               AND title = $2 
               AND "createdAt" >= $3`,
              [template.assignedTo, template.title, weekStart]
            )

            if (existingTaskResult.rows.length === 0) {
              // Yeni görev oluştur
              const insertResult = await client.query(
                `INSERT INTO tasks (
                  id, title, description, type, repetition, "hasCustomDuration", 
                  "durationMinutes", "assignedTo", "assignedBy", "isTemplate", 
                  status, "assignedAt", "createdAt", "updatedAt"
                )
                VALUES (
                  gen_random_uuid(), $1, $2, $3::"TaskType", $4::"TaskRepetition", 
                  $5, $6, $7, $8, false, 
                  'BEKLIYOR', NOW(), NOW(), NOW()
                )
                RETURNING id, title`,
                [
                  template.title,
                  template.description,
                  template.type,
                  template.repetition,
                  template.hasCustomDuration,
                  template.durationMinutes,
                  template.assignedTo,
                  template.assignedBy
                ]
              )

              createdTasks.push({
                id: insertResult.rows[0].id,
                title: insertResult.rows[0].title,
                type: 'HAFTALIK'
              })
            } else {
              skippedTasks.push({
                title: template.title,
                reason: 'Bu hafta için zaten görev mevcut'
              })
            }
          }
        }
        // TEK_SEFERLIK: Şablon olmamalı, atlanır
      } catch (error: any) {
        console.error(`Error processing template ${template.id}:`, error)
        skippedTasks.push({
          title: template.title,
          reason: `Hata: ${error.message}`
        })
      }
    }

    await client.end()

    return NextResponse.json({
      success: true,
      message: 'Tekrarlayan görevler işlendi',
      stats: {
        templatesFound: templateTasks.length,
        created: createdTasks.length,
        skipped: skippedTasks.length
      },
      createdTasks,
      skippedTasks
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error generating recurring tasks:', error)
    return NextResponse.json(
      { error: error.message || 'Tekrarlayan görevler oluşturulurken bir hata oluştu' },
      { status: 500 }
    )
  }
}
