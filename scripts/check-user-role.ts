/**
 * Kullanıcı rolünü kontrol et
 */
import { Client } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })

async function checkUserRole() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    await client.connect()
    console.log('✅ Veritabanına bağlanıldı...\n')

    const result = await client.query(
      'SELECT username, "fullName", role FROM users WHERE username = $1',
      ['muslumdildas']
    )

    if (result.rows.length === 0) {
      console.log('❌ Kullanıcı bulunamadı')
      await client.end()
      return
    }

    const user = result.rows[0]
    console.log('Müslüm DİLDAŞ bilgileri:')
    console.log('='.repeat(50))
    console.log(`Username: ${user.username}`)
    console.log(`Ad Soyad: ${user.fullName}`)
    console.log(`Rol: ${user.role}`)
    console.log('\nMevcut rol yönlendirmesi:')
    
    switch (user.role) {
      case 'STAFF':
        console.log('  → /panel/kurye (Kurye Paneli)')
        break
      case 'SUPERVIZOR':
        console.log('  → /panel/supervizor')
        break
      case 'MANAGER':
        console.log('  → /panel/yonetici')
        break
      case 'DEVELOPER':
        console.log('  → /panel/yazilimci')
        break
      case 'KASIYER':
        console.log('  → /panel/kasiyer')
        break
      default:
        console.log('  → /panel/satinalma (Satınalma Paneli) - DEFAULT')
    }

    console.log('\n💡 Satınalma paneline yönlendirmek için:')
    console.log('   Rolü NULL yapın veya mevcut rollere ek olarak satınalma için özel bir rol ekleyin')
    console.log('   Şu an default durumda satınalma paneline yönlendiriliyor.')

    await client.end()
  } catch (error: any) {
    console.error('❌ Hata:', error.message)
    await client.end().catch(() => {})
    process.exit(1)
  }
}

checkUserRole()
