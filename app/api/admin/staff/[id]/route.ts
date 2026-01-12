import { NextRequest, NextResponse } from 'next/server'
import { requireManagerOrSupervisor } from '@/lib/auth-helpers'
import { Client } from 'pg'

// Personel detay bilgileri (GET)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // Yetki kontrolü
    await requireManagerOrSupervisor()

    await client.connect()

    // params'ı resolve et (Next.js 15+ için Promise olabilir)
    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id

    // Personel temel bilgileri
    const userQuery = `
      SELECT 
        u.id,
        u."fullName",
        u.role,
        u.username,
        u."staffDuty",
        u.phone,
        u."branchId",
        b.name as "branchName",
        u."workScheduleType",
        u."fixedWorkStartTime",
        u."fixedWorkEndTime",
        u."fixedWorkOffDay",
        u."shiftSchedule",
        u."createdAt",
        u."updatedAt",
        m."fullName" as "managerName"
      FROM users u
      LEFT JOIN branches b ON u."branchId" = b.id
      LEFT JOIN users m ON u."managerId" = m.id
      WHERE u.id = $1
    `
    const userResult = await client.query(userQuery, [userId])

    if (userResult.rows.length === 0) {
      await client.end()
      return NextResponse.json(
        { error: 'Personel bulunamadı' },
        { status: 404 }
      )
    }

    const user = userResult.rows[0]

    // Geçmiş giriş-çıkış kayıtları (son 30 gün)
    const activitiesQuery = `
      SELECT 
        ua.id,
        ua.type,
        ua."createdAt",
        ua.latitude,
        ua.longitude
      FROM user_activities ua
      WHERE ua."userId" = $1
      AND ua."createdAt" >= NOW() - INTERVAL '30 days'
      ORDER BY ua."createdAt" DESC
      LIMIT 100
    `
    const activitiesResult = await client.query(activitiesQuery, [userId])

    // Tüm görevler (geçmiş ve mevcut)
    const tasksQuery = `
      SELECT 
        t.id,
        t.title,
        t.description,
        t.type,
        t.status,
        t."assignedAt",
        t."submittedAt",
        t."createdAt",
        t."updatedAt",
        u."fullName" as "assignedByName"
      FROM tasks t
      LEFT JOIN users u ON t."assignedBy" = u.id
      WHERE t."assignedTo" = $1
      ORDER BY t."createdAt" DESC
      LIMIT 100
    `
    const tasksResult = await client.query(tasksQuery, [userId])

    // Vardiya geçmişi (son 30 gün)
    const shiftsQuery = `
      SELECT 
        s.id,
        s."shiftDate",
        s."startTime",
        s."endTime",
        s."actualStart",
        s."actualEnd",
        s."isActive",
        s."weeklyHours"
      FROM shifts s
      WHERE s."userId" = $1
      AND s."shiftDate"::date >= (CURRENT_DATE - INTERVAL '30 days')
      ORDER BY s."shiftDate" DESC
      LIMIT 30
    `
    const shiftsResult = await client.query(shiftsQuery, [userId])

    // İzin talepleri
    const leaveQuery = `
      SELECT 
        lr.id,
        lr."startDate",
        lr."endDate",
        lr.type,
        lr.status,
        lr.description,
        lr."createdAt",
        lr."reviewedAt",
        u."fullName" as "reviewedByName"
      FROM leave_requests lr
      LEFT JOIN users u ON lr."reviewedBy" = u.id
      WHERE lr."userId" = $1
      ORDER BY lr."createdAt" DESC
      LIMIT 20
    `
    const leaveResult = await client.query(leaveQuery, [userId])

    await client.end()

    // fullName'i name ve surname'e böl
    const nameParts = user.fullName.split(' ')
    const name = nameParts[0] || ''
    const surname = nameParts.slice(1).join(' ') || ''

    // Rol gösterimi
    let displayRole = user.role
    if (user.staffDuty) {
      displayRole = user.staffDuty
    } else if (user.role === 'MANAGER') {
      displayRole = 'Yönetici'
    } else if (user.role === 'STAFF') {
      displayRole = 'Satınalma'
    } else if (user.role === 'DEVELOPER') {
      displayRole = 'Yazılımcı'
    } else if (user.role === 'KASIYER') {
      displayRole = 'Kasiyer'
    }

    // Aktivite formatla
    const activities = activitiesResult.rows.map(row => ({
      id: row.id,
      type: row.type,
      createdAt: row.createdAt,
      formattedTime: new Date(row.createdAt).toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      latitude: row.latitude,
      longitude: row.longitude
    }))

    // Görev formatla
    const tasks = tasksResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      status: row.status,
      assignedAt: row.assignedAt,
      submittedAt: row.submittedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      assignedByName: row.assignedByName
    }))

    // Vardiya formatla
    const shifts = shiftsResult.rows.map(row => ({
      id: row.id,
      shiftDate: row.shiftDate,
      startTime: row.startTime,
      endTime: row.endTime,
      actualStart: row.actualStart,
      actualEnd: row.actualEnd,
      isActive: row.isActive,
      weeklyHours: row.weeklyHours,
      formattedDate: new Date(row.shiftDate).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }))

    // İzin formatla
    const leaves = leaveResult.rows.map(row => ({
      id: row.id,
      startDate: row.startDate,
      endDate: row.endDate,
      type: row.type,
      status: row.status,
      description: row.description,
      createdAt: row.createdAt,
      reviewedAt: row.reviewedAt,
      reviewedByName: row.reviewedByName,
      formattedStartDate: new Date(row.startDate).toLocaleDateString('tr-TR'),
      formattedEndDate: new Date(row.endDate).toLocaleDateString('tr-TR')
    }))

    return NextResponse.json({
      success: true,
      person: {
        id: user.id,
        name: name,
        surname: surname,
        fullName: user.fullName,
        role: user.role,
        displayRole: displayRole,
        username: user.username,
        staffDuty: user.staffDuty,
        phone: user.phone,
        branchId: user.branchId,
        branchName: user.branchName,
        managerName: user.managerName,
        workScheduleType: user.workScheduleType,
        fixedWorkStartTime: user.fixedWorkStartTime,
        fixedWorkEndTime: user.fixedWorkEndTime,
        fixedWorkOffDay: user.fixedWorkOffDay,
        shiftSchedule: user.shiftSchedule,
        isBeingMonitored: user.isBeingMonitored || false,
        monitoredBy: user.monitoredBy || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      activities,
      tasks,
      shifts,
      leaves
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error fetching staff details:', error)
    
    if (error.message?.includes('Yetkisiz')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Personel detayları getirilirken bir hata oluştu: ' + error.message },
      { status: 500 }
    )
  }
}
