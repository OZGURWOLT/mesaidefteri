import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { Client } from 'pg'

// Kullanıcıya atanmış görevleri getir (GET)
export async function GET(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // Yetki kontrolü
    const currentUser = await requireAuth()
    
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') || currentUser.id
    const taskType = searchParams.get('taskType') || 'all'

    await client.connect()

    // Kullanıcıya atanmış görevleri çek (isTemplate: false olanlar)
    // STAFF sadece kendine atanan ve şablon olmayan görevleri görebilir
    let query = `SELECT id, title, description, status, type, repetition, "hasCustomDuration", 
                 "durationMinutes", "assignedTo", "assignedAt", "submittedAt", "createdAt", 
                 "updatedAt", photos, "isTemplate"
                 FROM tasks 
                 WHERE "assignedTo" = $1 AND "isTemplate" = false`
    const params: any[] = [userId]

    // TaskType filtresi
    if (taskType === 'technical') {
      query += ' AND ("taskType" LIKE $2 OR "taskType" LIKE $3 OR "taskType" LIKE $4 OR "taskType" LIKE $5)'
      params.push('TECHNICAL_TASK:%', '%Bug%', '%Özellik%', '%Bakım%')
    } else if (taskType === 'delivery') {
      // Teslimat görevleri (TESLIMAT tipinde)
      query += ' AND ("taskType" = $2 OR "taskType" LIKE $3)'
      params.push('TESLIMAT', 'TESLIMAT:%')
    } else if (taskType === 'market') {
      // Market içi görevler (TESLIMAT dışındaki tüm görevler)
      query += ' AND "taskType" != $2 AND "taskType" NOT LIKE $3'
      params.push('TESLIMAT', 'TESLIMAT:%')
    }

    query += ' ORDER BY "createdAt" DESC'

    const result = await client.query(query, params)
    await client.end()

    const tasks = result.rows.map(row => {
      // Photos'u parse et (JSON string ise)
      let photos: string[] = []
      if (row.photos) {
        if (typeof row.photos === 'string') {
          try {
            photos = JSON.parse(row.photos)
          } catch {
            photos = [row.photos]
          }
        } else if (Array.isArray(row.photos)) {
          photos = row.photos
        }
      }

      // Yeni schema'ya göre formatla
      return {
        id: row.id,
        title: row.title,
        description: row.description || '',
        type: row.type || 'STANDART_GOREV',
        repetition: row.repetition || 'TEK_SEFERLIK',
        hasCustomDuration: row.hasCustomDuration || false,
        durationMinutes: row.durationMinutes || null,
        status: row.status === 'BEKLIYOR' ? 'pending' : row.status === 'ONAYLANDI' ? 'completed' : 'in_progress',
        assignedAt: row.assignedAt ? row.assignedAt.toISOString() : null,
        submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
        photos: photos
      }
    })

    return NextResponse.json({
      success: true,
      tasks
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error fetching assigned tasks:', error)

    if (error.message?.includes('Yetkisiz')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Görevler yüklenirken bir hata oluştu: ' + error.message },
      { status: 500 }
    )
  }
}
