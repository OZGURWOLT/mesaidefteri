import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { Client } from 'pg'

/**
 * SMS log kaydı oluştur
 * POST /api/sms/log
 */
export async function POST(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // İç API çağrısı için auth kontrolü opsiyonel
    // Eğer session varsa userId'yi al, yoksa null bırak
    let userId: string | null = null
    try {
      const user = await requireAuth()
      userId = user.id
    } catch {
      // Auth yoksa devam et (cron job'dan gelebilir)
    }

    const body = await request.json()
    const { userId: bodyUserId, taskId, phone, message, type, status, jobId, errorCode, errorMessage } = body

    if (!phone || !message || !type || !status) {
      return NextResponse.json(
        { error: 'Telefon, mesaj, tip ve durum zorunludur' },
        { status: 400 }
      )
    }

    await client.connect()

    // SMS log kaydı oluştur
    await client.query(
      `INSERT INTO sms_logs (id, "userId", "taskId", phone, message, type, status, "jobId", "errorCode", "errorMessage", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [bodyUserId || userId, taskId || null, phone, message, type, status, jobId || null, errorCode || null, errorMessage || null]
    )

    await client.end()

    return NextResponse.json({
      success: true,
      message: 'SMS log kaydedildi'
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('SMS log error:', error)
    return NextResponse.json(
      { error: error.message || 'SMS log kaydedilirken bir hata oluştu' },
      { status: 500 }
    )
  }
}

/**
 * SMS log listesi getir
 * GET /api/sms/log
 */
export async function GET(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    const currentUser = await requireAuth()
    
    // Sadece MANAGER veya SUPERVIZOR SMS loglarını görebilir
    if (currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVIZOR') {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type') // 'otp' veya 'alert'

    await client.connect()

    let query = `
      SELECT 
        sl.id, sl."userId", sl."taskId", sl.phone, sl.message, sl.type, sl.status, 
        sl."jobId", sl."errorCode", sl."errorMessage", sl."createdAt",
        u."fullName" as user_name,
        t.title as task_title
      FROM sms_logs sl
      LEFT JOIN users u ON sl."userId" = u.id
      LEFT JOIN tasks t ON sl."taskId" = t.id
      WHERE 1=1
    `
    const params: any[] = []

    if (type) {
      query += ` AND sl.type = $${params.length + 1}`
      params.push(type)
    }

    query += ' ORDER BY sl."createdAt" DESC LIMIT $' + (params.length + 1)
    params.push(limit)

    const result = await client.query(query, params)
    await client.end()

    const logs = result.rows.map(row => ({
      id: row.id,
      userId: row.userId,
      userName: row.user_name,
      taskId: row.taskId,
      taskTitle: row.task_title,
      phone: row.phone,
      message: row.message,
      type: row.type,
      status: row.status,
      jobId: row.jobId,
      errorCode: row.errorCode,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      logs
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('SMS log fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'SMS logları yüklenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
