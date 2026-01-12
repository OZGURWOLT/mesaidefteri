/**
 * Tüm kullanıcılara telefon numarası ekle
 * Bu script'i çalıştırmak için: npx tsx scripts/add-phone-to-users.ts
 */

import { Client } from 'pg'

async function addPhoneToAllUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    await client.connect()
    console.log('Veritabanına bağlanıldı...')

    // Tüm kullanıcıları çek
    const usersResult = await client.query(
      'SELECT id, username, "fullName", phone FROM users'
    )

    console.log(`Toplam ${usersResult.rows.length} kullanıcı bulundu.`)

    const phoneNumber = '5331310163' // 5xxXXXxxxx formatında (0533 kısmı kaldırıldı)

    // Her kullanıcıya telefon numarası ekle
    for (const user of usersResult.rows) {
      if (!user.phone || user.phone !== phoneNumber) {
        await client.query(
          'UPDATE users SET phone = $1, "updatedAt" = NOW() WHERE id = $2',
          [phoneNumber, user.id]
        )
        console.log(`✓ ${user.fullName} (${user.username}) - Telefon numarası eklendi/güncellendi`)
      } else {
        console.log(`- ${user.fullName} (${user.username}) - Zaten telefon numarası var`)
      }
    }

    console.log('\n✅ Tüm kullanıcılara telefon numarası eklendi!')
    console.log(`📱 Telefon numarası: 0533 131 01 63`)

    await client.end()
  } catch (error: any) {
    console.error('❌ Hata:', error.message)
    await client.end().catch(() => {})
    process.exit(1)
  }
}

addPhoneToAllUsers()
