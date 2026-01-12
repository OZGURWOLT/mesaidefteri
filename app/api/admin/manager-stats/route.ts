import { NextRequest, NextResponse } from 'next/server'
import { requireManagerOrSupervisor } from '@/lib/auth-helpers'
import { Client } from 'pg'

/**
 * Yönetici istatistiklerini getir (GET)
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

    // Yönetici istatistiklerini çek
    const statsResult = await client.query(
      `SELECT 
        u.id,
        u."fullName" as name,
        b.name as branch,
        CASE 
          WHEN COUNT(t.id) > 0
          THEN ROUND(
            AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."submittedAt")) / 60)::numeric,
            1
          )
          ELSE 0
        END as "avgApprovalTime",
        CASE 
          WHEN COUNT(t.id) > 0
          THEN ROUND(
            (SELECT COUNT(*)::numeric FROM tasks t2 
             WHERE t2."assignedBy" = u.id 
             AND t2.status = 'REDDEDILDI')::numeric /
            (SELECT COUNT(*)::numeric FROM tasks t3 
             WHERE t3."assignedBy" = u.id 
             AND t3.status IN ('ONAYLANDI', 'REDDEDILDI'))::numeric * 100.0,
            1
          )
          ELSE 0
        END as "rejectionRate",
        0 as "overriddenDecisions", -- Şimdilik 0
        COUNT(t.id)::int as "totalDecisions",
        CASE 
          WHEN COUNT(t.id) > 0
          THEN ROUND(
            (SELECT COUNT(*)::numeric FROM tasks t4 
             WHERE t4."assignedBy" = u.id 
             AND t4.status = 'ONAYLANDI')::numeric /
            (SELECT COUNT(*)::numeric FROM tasks t5 
             WHERE t5."assignedBy" = u.id 
             AND t5.status IN ('ONAYLANDI', 'REDDEDILDI'))::numeric * 100.0,
            1
          )
          ELSE 0
        END as "successRate"
      FROM users u
      LEFT JOIN branches b ON u.id = b."managerId"
      LEFT JOIN tasks t ON t."assignedBy" = u.id 
        AND t.status IN ('ONAYLANDI', 'REDDEDILDI')
        AND t."submittedAt" IS NOT NULL
      WHERE u.role = 'MANAGER'
      GROUP BY u.id, u."fullName", b.name
      ORDER BY u."fullName"`
    )

    await client.end()

    const managers = statsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      branch: row.branch || 'Atanmamış',
      avgApprovalTime: parseFloat(row.avgApprovalTime) || 0,
      rejectionRate: parseFloat(row.rejectionRate) || 0,
      overriddenDecisions: 0,
      totalDecisions: parseInt(row.totalDecisions) || 0,
      successRate: parseFloat(row.successRate) || 0
    }))

    return NextResponse.json({
      success: true,
      managers
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error fetching manager stats:', error)

    if (error.message?.includes('Yetkisiz')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Yönetici istatistikleri yüklenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
