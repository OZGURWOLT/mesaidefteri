import { NextRequest, NextResponse } from 'next/server'
import { requireManagerOrSupervisor } from '@/lib/auth-helpers'
import { Client } from 'pg'

// Staff listesi + istatistikler (GET)
export async function GET(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // Yetki kontrolü ve mevcut kullanıcıyı al
    const currentUser = await requireManagerOrSupervisor()

    await client.connect()

    // BranchId filtresi (opsiyonel)
    const searchParams = request.nextUrl.searchParams
    const branchId = searchParams.get('branchId')

    // Staff listesi + istatistikler + branch bilgisi
    let query = `
      SELECT 
        u.id,
        u."fullName",
        u.role,
        u.username,
        u."staffDuty",
        u."branchId",
        u."managerId",
        b.name as "branchName",
        u."workScheduleType",
        u."fixedWorkStartTime",
        u."fixedWorkEndTime",
        u."fixedWorkOffDay",
        u."shiftSchedule",
        -- Shift bilgisi (bugünkü vardiya)
        s."isActive" as "shiftActive",
        s."startTime" as "shiftStartTime",
        s."endTime" as "shiftEndTime",
        -- Bugünkü giriş saati (UserActivity'den LOGIN tipi, bugünkü en son kayıt)
        (
          SELECT ua."createdAt"
          FROM user_activities ua 
          WHERE ua."userId" = u.id 
          AND ua.type = 'LOGIN'
          AND ua."createdAt"::date = CURRENT_DATE
          ORDER BY ua."createdAt" DESC 
          LIMIT 1
        ) as "loginTime",
        -- Bugünkü çıkış saati (UserActivity'den LOGOUT tipi, bugünkü en son kayıt)
        (
          SELECT ua."createdAt"
          FROM user_activities ua 
          WHERE ua."userId" = u.id 
          AND ua.type = 'LOGOUT'
          AND ua."createdAt"::date = CURRENT_DATE
          ORDER BY ua."createdAt" DESC 
          LIMIT 1
        ) as "logoutTime",
        -- İzin durumu
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM leave_requests lr 
            WHERE lr."userId" = u.id 
            AND lr.status = 'approved' 
            AND CURRENT_DATE BETWEEN lr."startDate"::date AND lr."endDate"::date
          ) THEN true 
          ELSE false 
        END as "onLeave",
        -- Görev istatistikleri
        (SELECT COUNT(*) FROM tasks t WHERE t."assignedTo" = u.id)::int as "totalTasks",
        (SELECT COUNT(*) FROM tasks t WHERE t."assignedTo" = u.id AND t.status = 'BEKLIYOR')::int as "pendingApprovals",
        -- Yapılmayan görevler: ONAYLANDI ve REDDEDILDI dışındaki tüm görevler (pending, in_progress, BEKLIYOR, vb.)
        (SELECT COUNT(*) FROM tasks t WHERE t."assignedTo" = u.id AND t.status NOT IN ('ONAYLANDI', 'REDDEDILDI', 'completed', 'cancelled'))::int as "incompleteTasks",
        -- Success rate (tamamlanma oranı)
        CASE 
          WHEN (SELECT COUNT(*) FROM tasks t WHERE t."assignedTo" = u.id) > 0
          THEN ROUND(
            (SELECT COUNT(*)::numeric FROM tasks t WHERE t."assignedTo" = u.id AND t.status = 'ONAYLANDI')::numeric /
            (SELECT COUNT(*)::numeric FROM tasks t WHERE t."assignedTo" = u.id)::numeric * 100.0,
            1
          )
          ELSE 0
        END as "successRate",
        -- Son konum (UserActivity'den)
        (
          SELECT CONCAT(
            COALESCE(ua.latitude::text, ''), 
            ', ', 
            COALESCE(ua.longitude::text, '')
          )
          FROM user_activities ua 
          WHERE ua."userId" = u.id 
          AND ua.latitude IS NOT NULL 
          AND ua.longitude IS NOT NULL
          ORDER BY ua."createdAt" DESC 
          LIMIT 1
        ) as "lastLocation"
      FROM users u
      LEFT JOIN branches b ON u."branchId" = b.id
      LEFT JOIN shifts s ON s."userId" = u.id AND s."shiftDate"::date = CURRENT_DATE
      WHERE 1=1
    `
    
    const params: any[] = []
    let paramIndex = 1

    // Süpervizör: Tüm çalışanları göster (STAFF, DEVELOPER, KASIYER, MANAGER)
    // Yönetici: Sadece kendisine bağlı personelleri göster (STAFF, DEVELOPER, KASIYER)
    if (currentUser.role === 'SUPERVIZOR') {
      query += ` AND u.role IN ('STAFF', 'DEVELOPER', 'KASIYER', 'MANAGER')`
    } else if (currentUser.role === 'MANAGER') {
      // Yönetici sadece kendisine bağlı personelleri görebilir
      query += ` AND u.role IN ('STAFF', 'DEVELOPER', 'KASIYER') AND u."managerId" = $${paramIndex}`
      params.push(currentUser.id)
      paramIndex++
    }

    if (branchId) {
      query += ` AND u."branchId" = $${paramIndex}`
      params.push(branchId)
      paramIndex++
    }
    
    query += ` ORDER BY u."fullName"`

    const result = await client.query(query, params)

    await client.end()

    // Response formatına dönüştür
    const staff = result.rows.map(row => {
      // fullName'i name ve surname'e böl
      const nameParts = row.fullName.split(' ')
      const name = nameParts[0] || ''
      const surname = nameParts.slice(1).join(' ') || ''

      // Rol gösterimi: staffDuty varsa onu göster, yoksa role göre
      let displayRole = row.role
      if (row.staffDuty) {
        displayRole = row.staffDuty
      } else if (row.role === 'MANAGER') {
        displayRole = 'Yönetici'
      } else if (row.role === 'STAFF') {
        displayRole = 'Satınalma' // Varsayılan, staffDuty yoksa
      } else if (row.role === 'DEVELOPER') {
        displayRole = 'Yazılımcı'
      } else if (row.role === 'KASIYER') {
        displayRole = 'Kasiyer'
      }

      // Giriş saati formatla
      let loginTimeFormatted = null
      if (row.loginTime) {
        const loginDate = new Date(row.loginTime)
        loginTimeFormatted = loginDate.toLocaleTimeString('tr-TR', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })
      }

      // Çıkış saati formatla
      let logoutTimeFormatted = null
      if (row.logoutTime) {
        const logoutDate = new Date(row.logoutTime)
        logoutTimeFormatted = logoutDate.toLocaleTimeString('tr-TR', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })
      }

      // Bugünün gününü tespit et (Türkçe)
      const today = new Date()
      const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
      const todayDayName = dayNames[today.getDay()]

      // Mesai bilgisi formatla
      let workScheduleTypeDisplay = '-'
      let shiftStartTimeDisplay = row.shiftStartTime || null // Vardiya başlangıç (bugünkü vardiya)
      let workEndTimeDisplay = null // Mesai bitiş (sabit mesai bitiş saati veya bugünkü çıkış)

      if (row.workScheduleType === 'SABIT_MESAI') {
        workScheduleTypeDisplay = 'Sabit'
        
        // İzin günü kontrolü
        if (row.fixedWorkOffDay === todayDayName) {
          // Bugün izin günü
          shiftStartTimeDisplay = 'İzinli'
          workEndTimeDisplay = 'İzinli'
        } else {
          // Normal çalışma günü - sabit mesai saatlerini göster
          // Vardiya başlangıç: sabit mesai başlama saati (eğer bugünkü vardiya yoksa)
          if (!shiftStartTimeDisplay && row.fixedWorkStartTime) {
            shiftStartTimeDisplay = row.fixedWorkStartTime
          }
          // Mesai bitiş: sabit mesai bitiş saati
          if (row.fixedWorkEndTime) {
            workEndTimeDisplay = row.fixedWorkEndTime
          }
        }
      } else if (row.workScheduleType === 'VARDIYALI_MESAI') {
        workScheduleTypeDisplay = 'Vardiyalı'
        
        // Vardiyalı mesai için shiftSchedule JSON'unu parse et
        if (row.shiftSchedule) {
          try {
            const schedule = JSON.parse(row.shiftSchedule)
            const todaySchedule = schedule[todayDayName]
            
            if (todaySchedule === 'off') {
              // Bugün izin günü
              shiftStartTimeDisplay = 'İzinli'
              workEndTimeDisplay = 'İzinli'
            } else if (todaySchedule) {
              // Vardiya saatlerini parse et (örn: "09:00-17:30")
              const timeParts = todaySchedule.split('-')
              if (timeParts.length === 2) {
                const startTime = timeParts[0].trim()
                const endTime = timeParts[1].trim()
                
                // Eğer bugünkü vardiya (shiftStartTime) yoksa, shiftSchedule'dan al
                if (!shiftStartTimeDisplay) {
                  shiftStartTimeDisplay = startTime
                }
                // Mesai bitiş: shiftSchedule'dan veya logoutTime'dan
                if (!workEndTimeDisplay) {
                  workEndTimeDisplay = endTime
                }
              }
            }
          } catch (e) {
            console.error('Error parsing shiftSchedule for user:', row.id, e)
            // Parse hatası durumunda, bugünkü vardiya bilgisi varsa onu kullan
            if (!shiftStartTimeDisplay && row.shiftStartTime) {
              shiftStartTimeDisplay = row.shiftStartTime
            }
          }
        } else {
          // shiftSchedule yoksa, bugünkü vardiya bilgisi varsa onu kullan
          if (!shiftStartTimeDisplay && row.shiftStartTime) {
            shiftStartTimeDisplay = row.shiftStartTime
          }
        }
      }

      return {
        id: row.id,
        name: name,
        surname: surname,
        role: row.role,
        displayRole: displayRole,
        staffDuty: row.staffDuty || null,
        branchId: row.branchId || null,
        branchName: row.branchName || 'Atanmamış',
        shiftActive: row.shiftActive || false,
        lastLocation: row.lastLocation || 'Konum bilgisi yok',
        shiftStartTime: row.shiftStartTime || null,
        shiftEndTime: row.shiftEndTime || null,
        loginTime: loginTimeFormatted,
        loginTimeRaw: row.loginTime ? new Date(row.loginTime).toISOString() : null,
        logoutTime: logoutTimeFormatted,
        logoutTimeRaw: row.logoutTime ? new Date(row.logoutTime).toISOString() : null,
        onLeave: row.onLeave || false,
        totalTasks: row.totalTasks || 0,
        pendingApprovals: row.pendingApprovals || 0,
        incompleteTasks: row.incompleteTasks || 0,
        successRate: parseFloat(row.successRate) || 0,
        workScheduleType: row.workScheduleType || null,
        workScheduleTypeDisplay: workScheduleTypeDisplay,
        shiftStartTimeDisplay: shiftStartTimeDisplay,
        workEndTimeDisplay: workEndTimeDisplay,
        fixedWorkStartTime: row.fixedWorkStartTime || null,
        fixedWorkEndTime: row.fixedWorkEndTime || null,
        fixedWorkOffDay: row.fixedWorkOffDay || null,
        shiftSchedule: row.shiftSchedule || null,
        isBeingMonitored: row.isBeingMonitored || false,
        monitoredBy: row.monitoredBy || null
      }
    })

    return NextResponse.json({
      success: true,
      staff
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error fetching staff:', error)
    
    if (error.message?.includes('Yetkisiz')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Personel listesi getirilirken bir hata oluştu: ' + error.message },
      { status: 500 }
    )
  }
}
