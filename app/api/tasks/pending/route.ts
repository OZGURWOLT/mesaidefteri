import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function GET(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    const searchParams = request.nextUrl.searchParams
    const taskType = searchParams.get('taskType') || 'all'

    await client.connect()

    // Status: BEKLIYOR olan görevleri çek
    let query = `
      SELECT 
        t.id, t.title, t.description, t.status, t.type, t."assignedAt", t."submittedAt", t."createdAt", t.photos, t."assignedTo",
        u.id as user_id, u."fullName" as user_fullName, u.role as user_role, u.username as user_username, u."staffDuty"
      FROM tasks t
      LEFT JOIN users u ON t."assignedTo" = u.id
      WHERE t.status = $1
    `
    const params: any[] = ['BEKLIYOR']

    // TaskType filtresi
    if (taskType !== 'all') {
      if (taskType === 'technical') {
        // Teknik görevler: TECHNICAL_TASK ile başlayan veya Bug, Özellik, Bakım içeren
        query += ' AND (t.type::text LIKE $2 OR t.title LIKE $3 OR t.title LIKE $4 OR t.title LIKE $5)'
        params.push('TECHNICAL_TASK:%', '%Bug%', '%Özellik%', '%Bakım%')
      } else if (taskType === 'kasiyer') {
        // Kasiyer görevleri: KASIYER_GOREV ile başlayan
        query += ' AND t.type::text LIKE $2'
        params.push('KASIYER_GOREV:%')
      } else if (taskType === 'kurye') {
        // Kurye görevleri: TESLIMAT veya MARKET_GOREV ile başlayan
        query += ' AND (t.type::text = $2 OR t.type::text LIKE $3)'
        params.push('TESLIMAT', 'MARKET_GOREV:%')
      } else {
        query += ' AND t.type::text = $2'
        params.push(taskType)
      }
    }

    query += ' ORDER BY t."submittedAt" DESC NULLS LAST, t."createdAt" DESC'

    const tasksResult = await client.query(query, params)

    // Her görev için priceLog'ları çek (varsa)
    const formattedTasks = await Promise.all(
      tasksResult.rows.map(async (task) => {
        // PriceLog'ları çek (sadece fiyat araştırması görevleri için)
        let priceLogs: any[] = []
        if (task.type && (task.type === 'FIYAT_ARASTIRMASI' || task.type.toString().includes('Fiyat') || task.type.toString().includes('fiyat'))) {
          const priceLogsResult = await client.query(
            'SELECT id, "productName", "ourPrice", "migrosPrice", "getirPrice", "a101Price", "sarayPrice", "grossPrice", status FROM price_logs WHERE "taskId" = $1',
            [task.id]
          )
          priceLogs = priceLogsResult.rows
        }

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

          return {
            id: task.id,
            staffName: task.user_fullName || 'Bilinmeyen',
            staffRole: task.user_staffDuty || task.user_role || 'Bilinmeyen',
            staffId: task.user_id || '',
            taskType: task.type ? (task.type === 'FIYAT_ARASTIRMASI' ? 'Fiyat Araştırması' : task.type === 'STANDART_GOREV' ? 'Standart Görev' : task.type.toString()) : 'Bilinmeyen',
            taskTitle: task.title,
            description: task.description || '',
            assignedAt: task.assignedAt
              ? new Date(task.assignedAt).toLocaleString('tr-TR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : new Date(task.createdAt).toLocaleString('tr-TR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }),
            submittedAt: task.submittedAt
              ? new Date(task.submittedAt).toLocaleString('tr-TR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : null,
            status: 'pending' as const,
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
            : undefined,
          photos: photos
        }
      })
    )

    await client.end()

    return NextResponse.json({ tasks: formattedTasks })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error fetching pending tasks:', error)
    return NextResponse.json(
      { error: 'Görevler yüklenirken bir hata oluştu: ' + error.message },
      { status: 500 }
    )
  }
}
