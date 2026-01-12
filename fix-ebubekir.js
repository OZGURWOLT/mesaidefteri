// ebubekirozgur kullanıcısını düzelt
const { Client } = require('pg')
const bcrypt = require('bcryptjs')

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'

const client = new Client({
  connectionString: DATABASE_URL,
})

async function main() {
  try {
    await client.connect()
    console.log('✅ Veritabanına bağlandı\n')

    const username = 'ebubekirozgur'
    const password = '12345'
    const fullName = 'Ebubekir ÖZGÜR'
    const role = 'SUPERVIZOR'

    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(password, 10)
    console.log(`🔑 Şifre hash'lendi: ${hashedPassword.substring(0, 30)}...`)

    // Kullanıcı var mı kontrol et
    const checkResult = await client.query(
      'SELECT id, username, password, "fullName", role FROM users WHERE username = $1',
      [username]
    )

    if (checkResult.rows.length > 0) {
      const existingUser = checkResult.rows[0]
      console.log(`\n📋 Mevcut kullanıcı bulundu:`)
      console.log(`   ID: ${existingUser.id}`)
      console.log(`   Username: ${existingUser.username}`)
      console.log(`   FullName: ${existingUser.fullName}`)
      console.log(`   Role: ${existingUser.role}`)
      console.log(`   Password (ilk 30 karakter): ${existingUser.password.substring(0, 30)}...`)
      
      // Şifreyi güncelle
      const updateResult = await client.query(
        `UPDATE users 
         SET password = $1, "fullName" = $2, role = $3::"UserRole", "updatedAt" = NOW()
         WHERE username = $4
         RETURNING id, username, "fullName", role`,
        [hashedPassword, fullName, role, username]
      )
      const user = updateResult.rows[0]
      console.log(`\n✅ Kullanıcı güncellendi!`)
      console.log(`   ${user.fullName} (${user.username}) - ${user.role}`)
      console.log(`   Şifre: ${password} (hash'lenmiş)`)
    } else {
      // Yeni kullanıcı oluştur
      console.log(`\n➕ Yeni kullanıcı oluşturuluyor...`)
      const insertResult = await client.query(
        `INSERT INTO users (id, username, password, "fullName", role, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4::"UserRole", NOW(), NOW())
         RETURNING id, username, "fullName", role`,
        [username, hashedPassword, fullName, role]
      )
      const user = insertResult.rows[0]
      console.log(`\n✅ Kullanıcı oluşturuldu!`)
      console.log(`   ${user.fullName} (${user.username}) - ${user.role}`)
      console.log(`   Şifre: ${password} (hash'lenmiş)`)
    }

    await client.end()
    console.log('\n✅ İşlem tamamlandı!')
  } catch (error) {
    console.error('\n❌ Hata:', error.message)
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Veritabanı bağlantı hatası!')
      console.error('   PostgreSQL çalışıyor mu kontrol edin:')
      console.error('   psql -U ebubekir -d mesaidefteri')
    }
    process.exit(1)
  }
}

main()
