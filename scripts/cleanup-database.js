// Veritabanı temizleme scripti
// SUPERVIZOR rolüne sahip kullanıcılar hariç tüm kullanıcıları ve ilişkili verileri siler

const { Client } = require('pg')

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'

const client = new Client({
  connectionString: DATABASE_URL,
})

async function cleanupDatabase() {
  try {
    console.log('🔌 Veritabanına bağlanılıyor...')
    await client.connect()
    console.log('✅ Veritabanına bağlandı\n')

    // 1. SUPERVIZOR olmayan kullanıcıların ID'lerini al
    console.log('📋 SUPERVIZOR olmayan kullanıcılar tespit ediliyor...')
    const nonSupervisorResult = await client.query(
      'SELECT id, username, "fullName", role FROM users WHERE role != $1',
      ['SUPERVIZOR']
    )
    
    const nonSupervisorIds = nonSupervisorResult.rows.map(row => row.id)
    
    if (nonSupervisorIds.length === 0) {
      console.log('✅ Silinecek kullanıcı bulunamadı. Veritabanı zaten temiz.\n')
      await client.end()
      return
    }

    console.log(`📊 ${nonSupervisorIds.length} kullanıcı bulundu:`)
    nonSupervisorResult.rows.forEach(user => {
      console.log(`   - ${user.fullName} (${user.username}) - ${user.role}`)
    })
    console.log('')

    // 2. İlişkili verileri sil (Foreign key sırasına göre)

    // UUID array'i PostgreSQL formatına çevir
    const uuidArray = nonSupervisorIds.map(id => `'${id}'`).join(',')

    // 2.1. Price Logs (Task'lara bağlı)
    console.log('🧹 Price Logs temizleniyor...')
    const priceLogsResult = await client.query(
      `DELETE FROM price_logs 
       WHERE "taskId" IN (
         SELECT id FROM tasks 
         WHERE "assignedTo"::text IN (${uuidArray})
         OR "assignedBy"::text IN (${uuidArray})
       )`
    )
    console.log(`   ✅ ${priceLogsResult.rowCount} price log silindi`)

    // 2.2. SMS Logs (User veya Task'a bağlı)
    console.log('🧹 SMS Logs temizleniyor...')
    const smsLogsResult = await client.query(
      `DELETE FROM sms_logs 
       WHERE "userId"::text IN (${uuidArray})
       OR "taskId" IN (
         SELECT id FROM tasks 
         WHERE "assignedTo"::text IN (${uuidArray})
         OR "assignedBy"::text IN (${uuidArray})
       )`
    )
    console.log(`   ✅ ${smsLogsResult.rowCount} SMS log silindi`)

    // 2.3. Notifications (User veya Task'a bağlı)
    console.log('🧹 Notifications temizleniyor...')
    const notificationsResult = await client.query(
      `DELETE FROM notifications 
       WHERE "userId"::text IN (${uuidArray})
       OR "taskId" IN (
         SELECT id FROM tasks 
         WHERE "assignedTo"::text IN (${uuidArray})
         OR "assignedBy"::text IN (${uuidArray})
       )`
    )
    console.log(`   ✅ ${notificationsResult.rowCount} bildirim silindi`)

    // 2.4. User Scores
    console.log('🧹 User Scores temizleniyor...')
    const userScoresResult = await client.query(
      `DELETE FROM user_scores WHERE "userId"::text IN (${uuidArray})`
    )
    console.log(`   ✅ ${userScoresResult.rowCount} kullanıcı puanı silindi`)

    // 2.5. User Activities
    console.log('🧹 User Activities temizleniyor...')
    const userActivitiesResult = await client.query(
      `DELETE FROM user_activities WHERE "userId"::text IN (${uuidArray})`
    )
    console.log(`   ✅ ${userActivitiesResult.rowCount} kullanıcı aktivitesi silindi`)

    // 2.6. SMS Codes
    console.log('🧹 SMS Codes temizleniyor...')
    const smsCodesResult = await client.query(
      `DELETE FROM sms_codes WHERE "userId"::text IN (${uuidArray})`
    )
    console.log(`   ✅ ${smsCodesResult.rowCount} SMS kodu silindi`)

    // 2.7. Tasks (assignedTo veya assignedBy)
    console.log('🧹 Tasks temizleniyor...')
    const tasksResult = await client.query(
      `DELETE FROM tasks WHERE "assignedTo"::text IN (${uuidArray}) OR "assignedBy"::text IN (${uuidArray})`
    )
    console.log(`   ✅ ${tasksResult.rowCount} görev silindi`)

    // 2.8. Leave Requests
    console.log('🧹 Leave Requests temizleniyor...')
    const leaveRequestsResult = await client.query(
      `DELETE FROM leave_requests WHERE "userId"::text IN (${uuidArray})`
    )
    console.log(`   ✅ ${leaveRequestsResult.rowCount} izin talebi silindi`)

    // 2.9. Shifts (userId veya assignedBy)
    console.log('🧹 Shifts temizleniyor...')
    const shiftsResult = await client.query(
      `DELETE FROM shifts WHERE "userId"::text IN (${uuidArray}) OR "assignedBy"::text IN (${uuidArray})`
    )
    console.log(`   ✅ ${shiftsResult.rowCount} vardiya silindi`)

    // 2.10. Branch managerId'leri null yap (SUPERVIZOR olmayan kullanıcılar için)
    console.log('🧹 Branch managerId güncelleniyor...')
    const branchUpdateResult = await client.query(
      `UPDATE branches SET "managerId" = NULL WHERE "managerId"::text IN (${uuidArray})`
    )
    console.log(`   ✅ ${branchUpdateResult.rowCount} şube güncellendi`)

    // 2.11. Branch branchId'leri null yap (SUPERVIZOR olmayan kullanıcılar için)
    console.log('🧹 User branchId güncelleniyor...')
    const userBranchUpdateResult = await client.query(
      `UPDATE users SET "branchId" = NULL WHERE id::text IN (${uuidArray})`
    )
    console.log(`   ✅ ${userBranchUpdateResult.rowCount} kullanıcı branchId güncellendi`)

    // 2.12. NextAuth Accounts (onDelete: Cascade olabilir ama yine de kontrol edelim)
    console.log('🧹 NextAuth Accounts temizleniyor...')
    const accountsResult = await client.query(
      `DELETE FROM accounts WHERE "userId"::text IN (${uuidArray})`
    )
    console.log(`   ✅ ${accountsResult.rowCount} NextAuth hesabı silindi`)

    // 2.13. NextAuth Sessions (onDelete: Cascade olabilir ama yine de kontrol edelim)
    console.log('🧹 NextAuth Sessions temizleniyor...')
    const sessionsResult = await client.query(
      `DELETE FROM sessions WHERE "userId"::text IN (${uuidArray})`
    )
    console.log(`   ✅ ${sessionsResult.rowCount} NextAuth oturumu silindi`)

    // 3. Son olarak SUPERVIZOR olmayan kullanıcıları sil
    console.log('\n🧹 Kullanıcılar siliniyor...')
    const usersResult = await client.query(
      `DELETE FROM users WHERE id::text IN (${uuidArray})`
    )
    console.log(`   ✅ ${usersResult.rowCount} kullanıcı silindi\n`)

    // 4. Doğrulama - Kalan kullanıcıları kontrol et
    console.log('✅ Doğrulama yapılıyor...')
    const remainingUsersResult = await client.query(
      'SELECT id, username, "fullName", role FROM users ORDER BY role, "fullName"'
    )
    
    console.log(`\n📊 Kalan kullanıcılar (${remainingUsersResult.rows.length}):`)
    if (remainingUsersResult.rows.length === 0) {
      console.log('   ⚠️  Hiç kullanıcı kalmadı!')
    } else {
      remainingUsersResult.rows.forEach(user => {
        console.log(`   - ${user.fullName} (${user.username}) - ${user.role}`)
      })
    }

    // Tablo istatistikleri
    console.log('\n📊 Tablo İstatistikleri:')
    const tableStats = [
      { name: 'users', table: 'users' },
      { name: 'tasks', table: 'tasks' },
      { name: 'shifts', table: 'shifts' },
      { name: 'leave_requests', table: 'leave_requests' },
      { name: 'notifications', table: 'notifications' },
      { name: 'user_scores', table: 'user_scores' },
      { name: 'user_activities', table: 'user_activities' },
      { name: 'sms_codes', table: 'sms_codes' },
      { name: 'sms_logs', table: 'sms_logs' },
      { name: 'price_logs', table: 'price_logs' },
      { name: 'branches', table: 'branches' }
    ]

    for (const stat of tableStats) {
      const countResult = await client.query(`SELECT COUNT(*) as count FROM ${stat.table}`)
      console.log(`   ${stat.name}: ${countResult.rows[0].count} kayıt`)
    }

    await client.end()
    console.log('\n✅ Temizlik işlemi başarıyla tamamlandı!')
  } catch (error) {
    await client.end().catch(() => {})
    console.error('\n❌ Hata:', error.message)
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  PostgreSQL bağlantı hatası!')
      console.error('   Lütfen PostgreSQL servisinin çalıştığından emin olun.')
    } else if (error.code === '42P01') {
      console.error('\n⚠️  Tablo bulunamadı!')
      console.error('   Lütfen Prisma schema\'nın veritabanına push edildiğinden emin olun.')
    } else {
      console.error('\n⚠️  Detaylı hata:', error)
    }
    process.exit(1)
  }
}

// Script'i çalıştır
cleanupDatabase()
