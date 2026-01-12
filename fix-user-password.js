// ebubekirozgur kullanıcısının şifresini düzelt
// Bu script, PostgreSQL çalışıyorsa kullanıcıyı oluşturur/günceller

const { Client } = require('pg')
const bcrypt = require('bcryptjs')

// DATABASE_URL'i environment variable'dan al veya default kullan
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'

async function fixUser() {
  const client = new Client({
    connectionString: DATABASE_URL,
  })

  try {
    console.log('🔌 Veritabanına bağlanılıyor...')
    await client.connect()
    console.log('✅ Veritabanına bağlandı\n')

    const username = 'ebubekirozgur'
    const password = '12345'
    const fullName = 'Ebubekir ÖZGÜR'
    const role = 'SUPERVIZOR'

    // Şifreyi hash'le
    console.log('🔑 Şifre hash\'leniyor...')
    const hashedPassword = await bcrypt.hash(password, 10)
    console.log('✅ Şifre hash\'lendi\n')

    // Kullanıcı var mı kontrol et
    console.log(`🔍 Kullanıcı kontrol ediliyor: ${username}...`)
    const checkResult = await client.query(
      'SELECT id, username, password, "fullName", role FROM users WHERE LOWER(username) = $1',
      [username.toLowerCase()]
    )

    if (checkResult.rows.length > 0) {
      const existingUser = checkResult.rows[0]
      console.log(`📋 Mevcut kullanıcı bulundu:`)
      console.log(`   ID: ${existingUser.id}`)
      console.log(`   Username: ${existingUser.username}`)
      console.log(`   FullName: ${existingUser.fullName}`)
      console.log(`   Role: ${existingUser.role}`)
      console.log(`   Password type: ${existingUser.password.startsWith('$2') ? 'HASH (bcrypt)' : 'PLAIN TEXT'}\n`)

      // Şifreyi güncelle
      console.log('🔄 Şifre güncelleniyor...')
      const updateResult = await client.query(
        `UPDATE users 
         SET password = $1, "fullName" = $2, role = $3::"UserRole", "updatedAt" = NOW()
         WHERE LOWER(username) = $4
         RETURNING id, username, "fullName", role`,
        [hashedPassword, fullName, role, username.toLowerCase()]
      )
      const user = updateResult.rows[0]
      console.log(`✅ Kullanıcı güncellendi!`)
      console.log(`   ${user.fullName} (${user.username}) - ${user.role}`)
      console.log(`   Şifre: ${password} (bcrypt ile hash'lenmiş)\n`)
    } else {
      // Yeni kullanıcı oluştur
      console.log(`➕ Yeni kullanıcı oluşturuluyor...`)
      const insertResult = await client.query(
        `INSERT INTO users (id, username, password, "fullName", role, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4::"UserRole", NOW(), NOW())
         RETURNING id, username, "fullName", role`,
        [username, hashedPassword, fullName, role]
      )
      const user = insertResult.rows[0]
      console.log(`✅ Kullanıcı oluşturuldu!`)
      console.log(`   ${user.fullName} (${user.username}) - ${user.role}`)
      console.log(`   Şifre: ${password} (bcrypt ile hash'lenmiş)\n`)
    }

    // Test: Şifreyi kontrol et
    console.log('🧪 Şifre doğrulaması test ediliyor...')
    const testResult = await client.query(
      'SELECT password FROM users WHERE LOWER(username) = $1',
      [username.toLowerCase()]
    )
    if (testResult.rows.length > 0) {
      const dbPassword = testResult.rows[0].password
      const isValid = await bcrypt.compare(password, dbPassword)
      console.log(`   Şifre doğrulama: ${isValid ? '✅ BAŞARILI' : '❌ BAŞARISIZ'}\n`)
    }

    await client.end()
    console.log('✅ İşlem tamamlandı!')
    console.log('\n📝 Giriş bilgileri:')
    console.log(`   Username: ${username}`)
    console.log(`   Password: ${password}`)
    console.log(`   Role: ${role}`)
    
  } catch (error) {
    console.error('\n❌ Hata:', error.message)
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  PostgreSQL bağlantı hatası!')
      console.error('   Lütfen PostgreSQL servisinin çalıştığından emin olun.')
      console.error('   macOS: brew services start postgresql@14')
      console.error('   Linux: sudo systemctl start postgresql')
    } else if (error.code === '28P01') {
      console.error('\n⚠️  Kimlik doğrulama hatası!')
      console.error('   Veritabanı kullanıcı adı veya şifresi yanlış olabilir.')
    }
    process.exit(1)
  }
}

fixUser()
