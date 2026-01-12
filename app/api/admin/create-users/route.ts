import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'
import bcrypt from 'bcryptjs'

// SADECE DEVELOPMENT İÇİN - Production'da kaldırılmalı!
export async function POST(request: NextRequest) {
  // Development kontrolü
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    await client.connect()

    const users = [
      {
        username: 'ebubekirozgur',
        password: '12345',
        fullName: 'Ebubekir ÖZGÜR',
        role: 'SUPERVIZOR',
      },
      {
        username: 'islimkilic',
        password: '12345',
        fullName: 'İslim KILIÇ',
        role: 'MANAGER',
      },
      {
        username: 'muslumdildas',
        password: '12345',
        fullName: 'Müslüm DİLDAŞ',
        role: 'STAFF',
      },
    ]

    const results = []

    for (const userData of users) {
      try {
        // Kullanıcı var mı kontrol et
        const checkResult = await client.query(
          'SELECT id FROM users WHERE LOWER(username) = $1',
          [userData.username.toLowerCase()]
        )

        const hashedPassword = await bcrypt.hash(userData.password, 10)

        if (checkResult.rows.length > 0) {
          // Mevcut kullanıcıyı güncelle
          await client.query(
            `UPDATE users 
             SET password = $1, "fullName" = $2, role = $3::"UserRole", "updatedAt" = NOW()
             WHERE LOWER(username) = $4`,
            [hashedPassword, userData.fullName, userData.role, userData.username.toLowerCase()]
          )
          results.push(`✅ Updated: ${userData.username}`)
        } else {
          // Yeni kullanıcı oluştur
          await client.query(
            `INSERT INTO users (id, username, password, "fullName", role, "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4::"UserRole", NOW(), NOW())`,
            [userData.username.toLowerCase(), hashedPassword, userData.fullName, userData.role]
          )
          results.push(`✅ Created: ${userData.username}`)
        }
      } catch (error: any) {
        results.push(`❌ Error (${userData.username}): ${error.message}`)
      }
    }

    await client.end()

    return NextResponse.json({
      success: true,
      message: 'Users created/updated successfully',
      results
    })
  } catch (error: any) {
    await client.end().catch(() => {})
    console.error('Error creating users:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 500)
    })
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create users',
        details: error.code || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack?.substring(0, 500) : undefined
      },
      { status: 500 }
    )
  }
}
