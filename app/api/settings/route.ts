import { NextRequest, NextResponse } from 'next/server'
import { requireSupervisor } from '@/lib/auth-helpers'
import { Client } from 'pg'

// Global ayarları getir (GET)
export async function GET() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    await client.connect()

    // Global settings tablosundan ayarları çek
    const result = await client.query(
      `SELECT * FROM global_settings ORDER BY "updatedAt" DESC LIMIT 1`
    )

    await client.end()

    if (result.rows.length === 0) {
      // Varsayılan ayarları döndür
      return NextResponse.json({
        settings: {
          locationTolerance: 100,
          delayAlarmMinutes: 15,
          penaltyPoints: {
            minor: 5,
            moderate: 15,
            major: 30
          },
          netgsmOtpEnabled: false,
          netgsmAlertEnabled: false,
          netgsmAlertMessage: ''
        }
      })
    }

    const row = result.rows[0]
    return NextResponse.json({
      settings: {
        locationTolerance: row.locationTolerance || 100,
        delayAlarmMinutes: row.delayAlarmMinutes || 15,
        penaltyPoints: {
          minor: row.penaltyPointsMinor || 5,
          moderate: row.penaltyPointsModerate || 15,
          major: row.penaltyPointsMajor || 30
        },
        netgsmOtpEnabled: row.netgsmOtpEnabled || false,
        netgsmAlertEnabled: row.netgsmAlertEnabled || false,
        netgsmAlertMessage: row.netgsmAlertMessage || ''
      }
    })
  } catch (error: any) {
    console.error('Global settings getirme hatası:', error)
    await client.end()
    return NextResponse.json(
      { error: 'Ayarlar getirilirken bir hata oluştu: ' + error.message },
      { status: 500 }
    )
  }
}

// Global ayarları güncelle (PUT)
export async function PUT(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    // Yetki kontrolü - Sadece SUPERVIZOR
    await requireSupervisor()

    const body = await request.json()
    const {
      locationTolerance,
      delayAlarmMinutes,
      penaltyPoints,
      netgsmOtpEnabled,
      netgsmAlertEnabled,
      netgsmAlertMessage
    } = body

    await client.connect()

    // Önce mevcut kaydı kontrol et
    const existingResult = await client.query(
      `SELECT id FROM global_settings ORDER BY "updatedAt" DESC LIMIT 1`
    )

    if (existingResult.rows.length > 0) {
      // Güncelle
      const updateResult = await client.query(
        `UPDATE global_settings 
         SET "locationTolerance" = $1,
             "delayAlarmMinutes" = $2,
             "penaltyPointsMinor" = $3,
             "penaltyPointsModerate" = $4,
             "penaltyPointsMajor" = $5,
             "netgsmOtpEnabled" = $6,
             "netgsmAlertEnabled" = $7,
             "netgsmAlertMessage" = $8,
             "updatedAt" = NOW()
         WHERE id = $9
         RETURNING *`,
        [
          locationTolerance || 100,
          delayAlarmMinutes || 15,
          penaltyPoints?.minor || 5,
          penaltyPoints?.moderate || 15,
          penaltyPoints?.major || 30,
          netgsmOtpEnabled || false,
          netgsmAlertEnabled || false,
          netgsmAlertMessage || null,
          existingResult.rows[0].id
        ]
      )

      await client.end()
      return NextResponse.json({
        success: true,
        settings: {
          locationTolerance: updateResult.rows[0].locationTolerance,
          delayAlarmMinutes: updateResult.rows[0].delayAlarmMinutes,
          penaltyPoints: {
            minor: updateResult.rows[0].penaltyPointsMinor,
            moderate: updateResult.rows[0].penaltyPointsModerate,
            major: updateResult.rows[0].penaltyPointsMajor
          },
          netgsmOtpEnabled: updateResult.rows[0].netgsmOtpEnabled,
          netgsmAlertEnabled: updateResult.rows[0].netgsmAlertEnabled,
          netgsmAlertMessage: updateResult.rows[0].netgsmAlertMessage
        }
      })
    } else {
      // Yeni kayıt oluştur
      const insertResult = await client.query(
        `INSERT INTO global_settings (
          id, "locationTolerance", "delayAlarmMinutes", "penaltyPointsMinor", 
          "penaltyPointsModerate", "penaltyPointsMajor", "netgsmOtpEnabled", 
          "netgsmAlertEnabled", "netgsmAlertMessage", "createdAt", "updatedAt"
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *`,
        [
          locationTolerance || 100,
          delayAlarmMinutes || 15,
          penaltyPoints?.minor || 5,
          penaltyPoints?.moderate || 15,
          penaltyPoints?.major || 30,
          netgsmOtpEnabled || false,
          netgsmAlertEnabled || false,
          netgsmAlertMessage || null
        ]
      )

      await client.end()
      return NextResponse.json({
        success: true,
        settings: {
          locationTolerance: insertResult.rows[0].locationTolerance,
          delayAlarmMinutes: insertResult.rows[0].delayAlarmMinutes,
          penaltyPoints: {
            minor: insertResult.rows[0].penaltyPointsMinor,
            moderate: insertResult.rows[0].penaltyPointsModerate,
            major: insertResult.rows[0].penaltyPointsMajor
          },
          netgsmOtpEnabled: insertResult.rows[0].netgsmOtpEnabled,
          netgsmAlertEnabled: insertResult.rows[0].netgsmAlertEnabled,
          netgsmAlertMessage: insertResult.rows[0].netgsmAlertMessage
        }
      })
    }
  } catch (error: any) {
    console.error('Global settings güncelleme hatası:', error)
    await client.end()
    return NextResponse.json(
      { error: 'Ayarlar güncellenirken bir hata oluştu: ' + error.message },
      { status: 500 }
    )
  }
}
