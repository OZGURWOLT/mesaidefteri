/**
 * Phone unique constraint'ini kaldır ve tüm kullanıcılara telefon numarası ekle
 */
import { Client } from 'pg'

async function fixPhoneAndAdd() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    await client.connect()
    console.log('Veritabanına bağlanıldı...')

    // Önce mevcut constraint'leri kontrol et
    const constraints = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'users' 
      AND constraint_type = 'UNIQUE' 
      AND constraint_name LIKE '%phone%'
    `)
    
    console.log('Mevcut phone constraint\'leri:', constraints.rows.map(r => r.constraint_name))

    // Tüm phone constraint'lerini kaldır
    for (const constraint of constraints.rows) {
      try {
        await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS ${constraint.constraint_name};`)
        console.log(`✓ Constraint kaldırıldı: ${constraint.constraint_name}`)
      } catch (e: any) {
        console.log(`⚠ Constraint kaldırılamadı: ${constraint.constraint_name} - ${e.message}`)
      }
    }

    // Index'i de kaldır (eğer varsa)
    try {
      await client.query(`DROP INDEX IF EXISTS users_phone_key;`)
      console.log('✓ Index kaldırıldı (eğer varsa)')
    } catch (e: any) {
      console.log(`⚠ Index zaten yok veya kaldırılamadı: ${e.message}`)
    }

    // Tüm kullanıcıları çek
    const usersResult = await client.query(
      'SELECT id, username, "fullName", phone FROM users'
    )

    console.log(`\nToplam ${usersResult.rows.length} kullanıcı bulundu.`)

    const phoneNumber = '5331310163' // 5xxXXXxxxx formatında

    // Her kullanıcıya telefon numarası ekle
    for (const user of usersResult.rows) {
      try {
        await client.query(
          'UPDATE users SET phone = $1, "updatedAt" = NOW() WHERE id = $2',
          [phoneNumber, user.id]
        )
        console.log(`✓ ${user.fullName} (${user.username}) - Telefon numarası eklendi/güncellendi`)
      } catch (e: any) {
        console.log(`❌ ${user.fullName} (${user.username}) - Hata: ${e.message}`)
      }
    }

    console.log('\n✅ İşlem tamamlandı!')
    console.log(`📱 Telefon numarası: 0533 131 01 63`)

    await client.end()
  } catch (error: any) {
    console.error('❌ Hata:', error.message)
    await client.end().catch(() => {})
    process.exit(1)
  }
}

fixPhoneAndAdd()
