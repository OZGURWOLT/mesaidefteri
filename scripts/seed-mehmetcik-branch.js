// Mehmetçik Şubesi ve personelleri oluştur/güncelle
const { Client } = require('pg')
const bcrypt = require('bcryptjs')

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'

const client = new Client({
  connectionString: DATABASE_URL,
})

// Personel listesi
const staffMembers = [
  { username: 'islimkilic', fullName: 'İslim KILIÇ', role: 'MANAGER', password: '12345' },
  { username: 'muslumdildas', fullName: 'Müslüm DİLDAŞ', role: 'STAFF', password: '12345' },
  { username: 'osama', fullName: 'Osama', role: 'STAFF', password: '12345' },
  { username: 'ahmet', fullName: 'Ahmet', role: 'STAFF', password: '12345' },
  { username: 'sukran', fullName: 'Şükran', role: 'STAFF', password: '12345' }
]

async function seedMehmetcikBranch() {
  try {
    console.log('🔌 Veritabanına bağlanılıyor...')
    await client.connect()
    console.log('✅ Veritabanına bağlandı\n')

    // 1. Mehmetçik Şubesi'ni oluştur veya güncelle
    console.log('🏢 Mehmetçik Şubesi oluşturuluyor/güncelleniyor...')
    
    // Önce "Merkez Şube" var mı kontrol et
    const existingBranchResult = await client.query(
      'SELECT id, name FROM branches WHERE LOWER(name) IN ($1, $2)',
      ['merkez şube', 'mehmetçik şubesi']
    )

    let branchId
    if (existingBranchResult.rows.length > 0) {
      // Mevcut şubeyi güncelle
      branchId = existingBranchResult.rows[0].id
      await client.query(
        'UPDATE branches SET name = $1, "updatedAt" = NOW() WHERE id = $2',
        ['Mehmetçik Şubesi', branchId]
      )
      console.log(`✅ Şube güncellendi: Mehmetçik Şubesi (ID: ${branchId})\n`)
    } else {
      // Yeni şube oluştur
      const branchResult = await client.query(
        `INSERT INTO branches (id, name, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, NOW(), NOW())
         RETURNING id`,
        ['Mehmetçik Şubesi']
      )
      branchId = branchResult.rows[0].id
      console.log(`✅ Yeni şube oluşturuldu: Mehmetçik Şubesi (ID: ${branchId})\n`)
    }

    // 2. İslim KILIÇ'i MANAGER olarak oluştur/güncelle ve şubeye ata
    const manager = staffMembers[0]
    console.log(`👤 ${manager.fullName} (${manager.role}) oluşturuluyor/güncelleniyor...`)
    
    const hashedPassword = await bcrypt.hash(manager.password, 10)
    
    const managerCheckResult = await client.query(
      'SELECT id, username, "fullName", role, "branchId" FROM users WHERE LOWER(username) = $1',
      [manager.username.toLowerCase()]
    )

    let managerId
    if (managerCheckResult.rows.length > 0) {
      // Mevcut kullanıcıyı güncelle
      managerId = managerCheckResult.rows[0].id
      await client.query(
        `UPDATE users 
         SET password = $1, "fullName" = $2, role = $3::"UserRole", "branchId" = $4, "updatedAt" = NOW()
         WHERE id = $5`,
        [hashedPassword, manager.fullName, manager.role, branchId, managerId]
      )
      console.log(`   ✅ Güncellendi: ${manager.fullName} (ID: ${managerId})`)
    } else {
      // Yeni kullanıcı oluştur
      const managerResult = await client.query(
        `INSERT INTO users (id, username, password, "fullName", role, "branchId", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4::"UserRole", $5, NOW(), NOW())
         RETURNING id`,
        [manager.username, hashedPassword, manager.fullName, manager.role, branchId]
      )
      managerId = managerResult.rows[0].id
      console.log(`   ✅ Oluşturuldu: ${manager.fullName} (ID: ${managerId})`)
    }

    // Şubenin managerId'sini güncelle
    await client.query(
      'UPDATE branches SET "managerId" = $1, "updatedAt" = NOW() WHERE id = $2',
      [managerId, branchId]
    )
    console.log(`   ✅ Şube yöneticisi atandı\n`)

    // 3. Diğer personelleri oluştur/güncelle ve şubeye ata
    for (let i = 1; i < staffMembers.length; i++) {
      const staff = staffMembers[i]
      console.log(`👤 ${staff.fullName} (${staff.role}) oluşturuluyor/güncelleniyor...`)
      
      const staffHashedPassword = await bcrypt.hash(staff.password, 10)
      
      const staffCheckResult = await client.query(
        'SELECT id, username, "fullName", role, "branchId" FROM users WHERE LOWER(username) = $1',
        [staff.username.toLowerCase()]
      )

      if (staffCheckResult.rows.length > 0) {
        // Mevcut kullanıcıyı güncelle
        const staffId = staffCheckResult.rows[0].id
        await client.query(
          `UPDATE users 
           SET password = $1, "fullName" = $2, role = $3::"UserRole", "branchId" = $4, "updatedAt" = NOW()
           WHERE id = $5`,
          [staffHashedPassword, staff.fullName, staff.role, branchId, staffId]
        )
        console.log(`   ✅ Güncellendi: ${staff.fullName}`)
      } else {
        // Yeni kullanıcı oluştur
        await client.query(
          `INSERT INTO users (id, username, password, "fullName", role, "branchId", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4::"UserRole", $5, NOW(), NOW())`,
          [staff.username, staffHashedPassword, staff.fullName, staff.role, branchId]
        )
        console.log(`   ✅ Oluşturuldu: ${staff.fullName}`)
      }
    }

    console.log('\n✅ Tüm işlemler tamamlandı!')
    console.log('\n📋 Özet:')
    console.log(`   Şube: Mehmetçik Şubesi (ID: ${branchId})`)
    console.log(`   Yönetici: İslim KILIÇ (ID: ${managerId})`)
    console.log(`   Personel: ${staffMembers.length - 1} kişi`)
    console.log('\n📝 Giriş bilgileri:')
    staffMembers.forEach(s => {
      console.log(`   ${s.username} / ${s.password} (${s.fullName} - ${s.role})`)
    })

    await client.end()
  } catch (error) {
    console.error('\n❌ Hata:', error.message)
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  PostgreSQL bağlantı hatası!')
      console.error('   Lütfen PostgreSQL servisinin çalıştığından emin olun.')
    } else if (error.code === '42P01') {
      console.error('\n⚠️  Tablo bulunamadı!')
      console.error('   Önce Prisma schema\'yı veritabanına push edin: npx prisma db push')
    }
    process.exit(1)
  }
}

seedMehmetcikBranch()
