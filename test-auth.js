// Auth test script - kullanıcıları ve şifreleri kontrol et
const { Client } = require('pg')
const bcrypt = require('bcryptjs')

const DATABASE_URL = 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'

const client = new Client({
  connectionString: DATABASE_URL,
})

async function testAuth() {
  await client.connect()
  console.log('✅ Veritabanına bağlandı\n')

  const testUsers = [
    { username: 'ebubekirozgur', password: '12345' },
    { username: 'islimkilic', password: '12345' },
    { username: 'muslumdildas', password: '12345' },
  ]

  for (const testUser of testUsers) {
    console.log(`\n🔍 Test ediliyor: ${testUser.username}`)
    
    // Normalize username (auth.ts'deki gibi)
    const normalizedUsername = testUser.username.toLowerCase().trim()
    console.log(`   Normalize edilmiş: "${normalizedUsername}"`)

    // Veritabanından kullanıcıyı çek
    const result = await client.query(
      'SELECT id, username, password, role, "fullName" FROM users WHERE LOWER(username) = $1',
      [normalizedUsername]
    )

    if (result.rows.length === 0) {
      console.log(`   ❌ Kullanıcı bulunamadı!`)
      continue
    }

    const user = result.rows[0]
    console.log(`   ✅ Kullanıcı bulundu: ${user.fullName}`)
    console.log(`   Veritabanındaki username: "${user.username}"`)
    console.log(`   Şifre hash başlangıcı: "${user.password.substring(0, 30)}..."`)
    console.log(`   Hash bcrypt mi? ${user.password.startsWith('$2')}`)

    // Şifre kontrolü
    if (user.password.startsWith('$2')) {
      const isValid = await bcrypt.compare(testUser.password, user.password)
      console.log(`   Şifre doğru mu? ${isValid ? '✅ EVET' : '❌ HAYIR'}`)
      
      if (!isValid) {
        // Test için yeni hash oluştur ve karşılaştır
        const newHash = await bcrypt.hash(testUser.password, 10)
        console.log(`   Yeni hash: "${newHash.substring(0, 30)}..."`)
        const isValidNew = await bcrypt.compare(testUser.password, newHash)
        console.log(`   Yeni hash ile test: ${isValidNew ? '✅ EVET' : '❌ HAYIR'}`)
      }
    } else {
      console.log(`   ⚠️  Şifre hash'lenmemiş (düz metin)!`)
      console.log(`   Düz metin karşılaştırma: ${user.password === testUser.password ? '✅ EVET' : '❌ HAYIR'}`)
    }
  }

  await client.end()
  console.log('\n✅ Test tamamlandı!')
}

testAuth().catch((error) => {
  console.error('❌ Kritik hata:', error)
  process.exit(1)
})
