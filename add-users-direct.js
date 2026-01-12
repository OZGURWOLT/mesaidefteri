// Direkt PostgreSQL bağlantısı ile kullanıcı ekleme
const { Client } = require('pg')
const bcrypt = require('bcryptjs')

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'

const client = new Client({
  connectionString: DATABASE_URL,
})

async function main() {
  await client.connect()
  console.log('✅ Veritabanına bağlandı\n')

  const users = [
    { username: 'ebubekirozgur', password: '12345', fullName: 'Ebubekir ÖZGÜR', role: 'SUPERVIZOR' },
    { username: 'islimkilic', password: '12345', fullName: 'İslim KILIÇ', role: 'MANAGER' },
    { username: 'muslumdildas', password: '12345', fullName: 'Müslüm DİLDAŞ', role: 'STAFF' },
  ]

  for (const userData of users) {
    try {
      // Şifreyi hash'le
      const hashedPassword = await bcrypt.hash(userData.password, 10)

      // Kullanıcı var mı kontrol et
      const checkResult = await client.query(
        'SELECT id FROM users WHERE username = $1',
        [userData.username]
      )

      if (checkResult.rows.length > 0) {
        // Mevcut kullanıcıyı güncelle
        const updateResult = await client.query(
          `UPDATE users 
           SET password = $1, "fullName" = $2, role = $3::"UserRole", "updatedAt" = NOW()
           WHERE username = $4
           RETURNING id, username, "fullName", role, "createdAt"`,
          [hashedPassword, userData.fullName, userData.role, userData.username]
        )
        const user = updateResult.rows[0]
        console.log(`✅ Güncellendi: ${user.fullName} (${user.username}) - ${user.role}`)
        console.log(`   ID: ${user.id}`)
        console.log(`   Oluşturulma: ${user.createdAt}`)
      } else {
        // Yeni kullanıcı oluştur
        const insertResult = await client.query(
          `INSERT INTO users (id, username, password, "fullName", role, "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4::"UserRole", NOW(), NOW())
           RETURNING id, username, "fullName", role, "createdAt"`,
          [userData.username, hashedPassword, userData.fullName, userData.role]
        )
        const user = insertResult.rows[0]
        console.log(`✅ Oluşturuldu: ${user.fullName} (${user.username}) - ${user.role}`)
        console.log(`   ID: ${user.id}`)
        console.log(`   Oluşturulma: ${user.createdAt}`)
      }
    } catch (error) {
      console.error(`❌ Hata (${userData.username}):`, error.message)
      if (error.detail) {
        console.error(`   Detay: ${error.detail}`)
      }
    }
  }

  await client.end()
  console.log('\n✅ Tüm kullanıcılar eklendi/güncellendi!')
}

main().catch((error) => {
  console.error('❌ Kritik hata:', error)
  process.exit(1)
})
