import { NextRequest, NextResponse } from 'next/server'
import { requireManagerOrSupervisor } from '@/lib/auth-helpers'
import { Client } from 'pg'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Şubeleri getir (GET)
 * MANAGER veya SUPERVIZOR erişebilir
 */
export async function GET(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // Yetki kontrolü
    await requireManagerOrSupervisor()

    await client.connect()

    // Şubeleri çek (tüm yönetici bilgileri ile)
    const branchesResult = await client.query(
      `SELECT 
        b.id,
        b.name,
        b.address,
        b.phone,
        (SELECT COUNT(*) FROM users u2 WHERE u2."branchId" = b.id)::int as "totalStaff",
        (SELECT COUNT(*) FROM tasks t 
         JOIN users u3 ON t."assignedTo" = u3.id 
         WHERE u3."branchId" = b.id 
         AND t.status = 'BEKLIYOR'
         AND t."submittedAt" IS NOT NULL
         AND t."submittedAt" < NOW() - INTERVAL '1 hour')::int as "criticalPending",
        CASE 
          WHEN (SELECT COUNT(*) FROM users u4 WHERE u4."branchId" = b.id) > 0
          THEN ROUND(
            (SELECT COUNT(*)::numeric FROM shifts s
             JOIN users u5 ON s."userId" = u5.id
             WHERE u5."branchId" = b.id
             AND s."shiftDate"::date = CURRENT_DATE
             AND s."isActive" = true)::numeric /
            (SELECT COUNT(*)::numeric FROM users u6 WHERE u6."branchId" = b.id)::numeric * 100.0,
            1
          )
          ELSE 0
        END as "activeRate"
      FROM branches b
      ORDER BY b.name`
    )

    // Her şube için yöneticileri, izinli personelleri ve aktif personelleri ayrı sorgu ile çek
    const branchesWithManagers = await Promise.all(
      branchesResult.rows.map(async (row) => {
        const managersResult = await client.query(
          `SELECT id, "fullName" 
           FROM users 
           WHERE "branchId" = $1 AND role = 'MANAGER' 
           ORDER BY "fullName"`,
          [row.id]
        )

        const managers = managersResult.rows.map(m => ({
          id: m.id,
          name: m.fullName
        }))

        // İzinli personelleri çek (onLeave = true veya bugün izin günü)
        const todayDayName = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][new Date().getDay()]
        
        const onLeaveResult = await client.query(
          `SELECT DISTINCT u."fullName"
           FROM users u
           LEFT JOIN leave_requests lr ON lr."userId" = u.id
           WHERE u."branchId" = $1
           AND (
             (lr.status = 'approved' AND CURRENT_DATE BETWEEN lr."startDate"::date AND lr."endDate"::date)
             OR (u."workScheduleType" = 'SABIT_MESAI' AND u."fixedWorkOffDay" = $2)
             OR (u."workScheduleType" = 'VARDIYALI_MESAI' AND u."shiftSchedule" IS NOT NULL 
                 AND u."shiftSchedule"::jsonb->>$2 = 'off')
           )
           ORDER BY u."fullName"`,
          [row.id, todayDayName]
        )

        const onLeaveNames = onLeaveResult.rows.map(r => r.fullName)

        // Aktif/mesaide olan personelleri çek (shiftActive = true veya loginTime var ve logoutTime yok)
        const activeResult = await client.query(
          `SELECT DISTINCT u."fullName"
           FROM users u
           LEFT JOIN shifts s ON s."userId" = u.id AND s."shiftDate"::date = CURRENT_DATE
           LEFT JOIN user_activities ua_login ON ua_login."userId" = u.id 
             AND ua_login.type = 'LOGIN' 
             AND ua_login."createdAt"::date = CURRENT_DATE
           LEFT JOIN user_activities ua_logout ON ua_logout."userId" = u.id 
             AND ua_logout.type = 'LOGOUT' 
             AND ua_logout."createdAt"::date = CURRENT_DATE
             AND ua_logout."createdAt" > ua_login."createdAt"
           WHERE u."branchId" = $1
           AND (s."isActive" = true OR (ua_login."createdAt" IS NOT NULL AND ua_logout."createdAt" IS NULL))
           ORDER BY u."fullName"`,
          [row.id]
        )

        const activeNames = activeResult.rows.map(r => r.fullName)

        return {
          id: row.id,
          name: row.name,
          address: row.address,
          phone: row.phone,
          managers: managers,
          totalStaff: row.totalStaff || 0,
          criticalPending: row.criticalPending || 0,
          activeRate: parseFloat(row.activeRate) || 0,
          onLeaveNames: onLeaveNames,
          activeNames: activeNames
        }
      })
    )

    await client.end()

    const branches = branchesWithManagers

    return NextResponse.json({
      success: true,
      branches
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error fetching branches:', error)

    if (error.message?.includes('Yetkisiz')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Şubeler yüklenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
