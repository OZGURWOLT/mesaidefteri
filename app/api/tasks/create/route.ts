import { NextRequest, NextResponse } from 'next/server'
import { requireManagerOrSupervisor, requireAuth } from '@/lib/auth-helpers'
import { Client } from 'pg'
import bcrypt from 'bcryptjs'

// Yeni görev oluştur (POST)
export async function POST(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // Yetki kontrolü - Sadece MANAGER veya SUPERVIZOR
    const currentUser = await requireManagerOrSupervisor()
    
    const body = await request.json()
    const { 
      title,
      description,
      type, // 'FIYAT_ARASTIRMASI' veya 'STANDART_GOREV'
      repetition, // 'TEK_SEFERLIK', 'GUNLUK', 'HAFTALIK'
      hasCustomDuration,
      durationMinutes,
      assignedTo, // Personel ID'si
      isTemplate = false // Varsayılan false
    } = body

    // Validasyon
    if (!title || !type || !repetition || !assignedTo) {
      return NextResponse.json(
        { error: 'Başlık, tür, tekrar tipi ve atanan personel zorunludur' },
        { status: 400 }
      )
    }

    if (!['FIYAT_ARASTIRMASI', 'STANDART_GOREV'].includes(type)) {
      return NextResponse.json(
        { error: 'Geçersiz görev türü' },
        { status: 400 }
      )
    }

    if (!['TEK_SEFERLIK', 'GUNLUK', 'HAFTALIK'].includes(repetition)) {
      return NextResponse.json(
        { error: 'Geçersiz tekrar tipi' },
        { status: 400 }
      )
    }

    if (hasCustomDuration && (!durationMinutes || durationMinutes <= 0)) {
      return NextResponse.json(
        { error: 'Özel süre belirtildiyse dakika değeri gerekli' },
        { status: 400 }
      )
    }

    await client.connect()

    // Rol bazlı yetkilendirme kontrolü
    // SUPERVIZOR: Tüm personele atayabilir
    // MANAGER: Sadece kendisine bağlı personele atayabilir
    if (currentUser.role === 'MANAGER') {
      // MANAGER ise, atanan personelin kendisine bağlı olup olmadığını kontrol et
      // Şimdilik basit kontrol - ileride branch/team ilişkisi eklenebilir
      const assignedUserResult = await client.query(
        'SELECT id, role FROM users WHERE id = $1',
        [assignedTo]
      )

      if (assignedUserResult.rows.length === 0) {
        await client.end()
        return NextResponse.json(
          { error: 'Atanan personel bulunamadı' },
          { status: 404 }
        )
      }

      const assignedUser = assignedUserResult.rows[0]
      // MANAGER sadece STAFF, DEVELOPER, KASIYER rolündeki personele atayabilir
      if (!['STAFF', 'DEVELOPER', 'KASIYER'].includes(assignedUser.role)) {
        await client.end()
        return NextResponse.json(
          { error: 'Bu personele görev atama yetkiniz yok' },
          { status: 403 }
        )
      }
    }

    // Görevi oluştur
    const insertResult = await client.query(
      `INSERT INTO tasks (
        id, title, description, type, repetition, "hasCustomDuration", 
        "durationMinutes", "assignedTo", "assignedBy", "isTemplate", 
        status, "assignedAt", "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3::"TaskType", $4::"TaskRepetition", 
        $5, $6, $7, $8, $9, $10, 
        CASE WHEN $9 = false THEN NOW() ELSE NULL END, 
        NOW(), NOW()
      )
      RETURNING id, title, description, type, repetition, "hasCustomDuration", 
                "durationMinutes", "assignedTo", "assignedBy", "isTemplate", 
                status, "assignedAt", "createdAt"`,
      [
        title,
        description || null,
        type,
        repetition,
        hasCustomDuration || false,
        hasCustomDuration ? durationMinutes : null,
        assignedTo,
        currentUser.id,
        isTemplate,
        'BEKLIYOR'
      ]
    )

    const newTask = insertResult.rows[0]

    // Kullanıcı ve şube bilgilerini al (log için)
    const userResult = await client.query(
      `SELECT u."fullName", u."staffDuty", u."branchId", b.name as "branchName"
       FROM users u
       LEFT JOIN branches b ON u."branchId" = b.id
       WHERE u.id = $1`,
      [assignedTo]
    )
    const assignedUser = userResult.rows[0]

    // Sistem logu oluştur
    try {
      await client.query(
        `INSERT INTO system_logs (id, type, description, "userId", "taskId", "branchId", details, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())`,
        [
          'task_created',
          `${currentUser.fullName || 'Yönetici'} - "${title}" görevi ${assignedUser?.fullName || 'Personel'}'ye atandı`,
          assignedTo,
          newTask.id,
          assignedUser?.branchId || null,
          JSON.stringify({
            taskTitle: title,
            taskType: type,
            assignedBy: currentUser.fullName || currentUser.id,
            assignedTo: assignedUser?.fullName || assignedTo
          })
        ]
      )
    } catch (logError) {
      console.error('System log oluşturma hatası:', logError)
      // Log hatası ana işlemi engellemez
    }

    await client.end()

    return NextResponse.json({
      success: true,
      message: 'Görev başarıyla oluşturuldu',
      task: {
        id: newTask.id,
        title: newTask.title,
        description: newTask.description,
        type: newTask.type,
        repetition: newTask.repetition,
        hasCustomDuration: newTask.hasCustomDuration,
        durationMinutes: newTask.durationMinutes,
        assignedTo: newTask.assignedTo,
        assignedBy: newTask.assignedBy,
        isTemplate: newTask.isTemplate,
        status: newTask.status,
        assignedAt: newTask.assignedAt ? newTask.assignedAt.toISOString() : null,
        createdAt: newTask.createdAt.toISOString()
      }
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error creating task:', error)
    
    if (error.message?.includes('Yetkisiz')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Görev oluşturulurken bir hata oluştu' },
      { status: 500 }
    )
  }
}
