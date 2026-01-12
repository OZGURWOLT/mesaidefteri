const { Client } = require('pg')

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
})

async function updateBranchManagers() {
  try {
    console.log('🔌 Veritabanına bağlanılıyor...')
    await client.connect()
    console.log('✅ Veritabanına bağlandı\n')

    // Tüm şubeleri çek
    const branchesResult = await client.query('SELECT id, name, "managerId" FROM branches')
    console.log(`📋 ${branchesResult.rows.length} şube bulundu\n`)

    for (const branch of branchesResult.rows) {
      console.log(`🏢 Şube: ${branch.name} (ID: ${branch.id})`)
      
      // Eğer branch'in managerId'si yoksa, o şubeye atanmış MANAGER rolündeki ilk kullanıcıyı bul
      if (!branch.managerId) {
        const managerResult = await client.query(
          'SELECT id, "fullName", role FROM users WHERE "branchId" = $1 AND role = $2 ORDER BY "createdAt" ASC LIMIT 1',
          [branch.id, 'MANAGER']
        )
        
        if (managerResult.rows.length > 0) {
          const manager = managerResult.rows[0]
          console.log(`   👤 Yönetici bulundu: ${manager.fullName} (ID: ${manager.id})`)
          
          // Branch'in managerId'sini güncelle
          await client.query(
            'UPDATE branches SET "managerId" = $1, "updatedAt" = NOW() WHERE id = $2',
            [manager.id, branch.id]
          )
          console.log(`   ✅ Şube yöneticisi atandı: ${manager.fullName}\n`)
        } else {
          console.log(`   ⚠️  Bu şubeye atanmış yönetici bulunamadı\n`)
        }
      } else {
        // ManagerId varsa, bu yöneticinin hala o şubeye atanmış olduğunu kontrol et
        const managerCheck = await client.query(
          'SELECT id, "fullName", "branchId", role FROM users WHERE id = $1',
          [branch.managerId]
        )
        
        if (managerCheck.rows.length > 0) {
          const manager = managerCheck.rows[0]
          if (manager.branchId === branch.id && manager.role === 'MANAGER') {
            console.log(`   ✅ Yönetici zaten atanmış: ${manager.fullName}\n`)
          } else {
            console.log(`   ⚠️  Yönetici şubeye atanmamış veya rolü değişmiş. Yeni yönetici aranıyor...`)
            
            // Yeni yönetici bul
            const newManagerResult = await client.query(
              'SELECT id, "fullName", role FROM users WHERE "branchId" = $1 AND role = $2 ORDER BY "createdAt" ASC LIMIT 1',
              [branch.id, 'MANAGER']
            )
            
            if (newManagerResult.rows.length > 0) {
              const newManager = newManagerResult.rows[0]
              await client.query(
                'UPDATE branches SET "managerId" = $1, "updatedAt" = NOW() WHERE id = $2',
                [newManager.id, branch.id]
              )
              console.log(`   ✅ Yeni yönetici atandı: ${newManager.fullName}\n`)
            } else {
              // Yönetici yoksa managerId'yi null yap
              await client.query(
                'UPDATE branches SET "managerId" = NULL, "updatedAt" = NOW() WHERE id = $1',
                [branch.id]
              )
              console.log(`   ⚠️  Yönetici bulunamadı, managerId NULL yapıldı\n`)
            }
          }
        } else {
          console.log(`   ⚠️  Yönetici bulunamadı (ID: ${branch.managerId}), yeni yönetici aranıyor...`)
          
          // Yeni yönetici bul
          const newManagerResult = await client.query(
            'SELECT id, "fullName", role FROM users WHERE "branchId" = $1 AND role = $2 ORDER BY "createdAt" ASC LIMIT 1',
            [branch.id, 'MANAGER']
          )
          
          if (newManagerResult.rows.length > 0) {
            const newManager = newManagerResult.rows[0]
            await client.query(
              'UPDATE branches SET "managerId" = $1, "updatedAt" = NOW() WHERE id = $2',
              [newManager.id, branch.id]
            )
            console.log(`   ✅ Yeni yönetici atandı: ${newManager.fullName}\n`)
          } else {
            // Yönetici yoksa managerId'yi null yap
            await client.query(
              'UPDATE branches SET "managerId" = NULL, "updatedAt" = NOW() WHERE id = $1',
              [branch.id]
            )
            console.log(`   ⚠️  Yönetici bulunamadı, managerId NULL yapıldı\n`)
          }
        }
      }
    }

    // Sonuçları kontrol et
    console.log('\n📊 Güncellenmiş Şube-Yönetici İlişkileri:')
    const finalResult = await client.query(`
      SELECT 
        b.id,
        b.name,
        b."managerId",
        u."fullName" as "managerName"
      FROM branches b
      LEFT JOIN users u ON b."managerId" = u.id
      ORDER BY b.name
    `)
    
    for (const row of finalResult.rows) {
      console.log(`   ${row.name}: ${row.managerName || 'Yönetici atanmamış'}`)
    }

    await client.end()
    console.log('\n✅ İşlem tamamlandı!')
  } catch (error) {
    await client.end().catch(() => {})
    console.error('❌ Hata:', error)
    process.exit(1)
  }
}

updateBranchManagers()
