/**
 * Müslüm DİLDAŞ'ın rolünü düzelt - Satınalma için
 * Satınalma paneli için özel bir rol yok, bu yüzden default olması için
 * rolünü mevcut rollere göre ayarlayacağız.
 * 
 * Çözüm: UserRole enum'ında SATINALMA rolü yok, bu yüzden rolü NULL yapamayız.
 * En iyi çözüm: Kullanıcıyı satınalma paneline yönlendirmek için bir çözüm bulmak.
 * 
 * Şu an için: Satınalma paneli default durumda yönlendiriliyor, bu yüzden
 * kullanıcının rolünü kontrol edip, eğer STAFF ise ve satınalma istiyorsa,
 * belki başka bir çözüm bulmalıyız.
 * 
 * Ama schema'da SATINALMA rolü yok, bu yüzden şu an için kullanıcıyı olduğu gibi bırakıp,
 * satınalma paneli için bir çözüm bulmak daha mantıklı.
 * 
 * Alternatif: Schema'ya SATINALMA rolü ekleyebiliriz.
 */
import { Client } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })

async function fixMuslumRole() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    await client.connect()
    console.log('✅ Veritabanına bağlanıldı...\n')

    // Önce kullanıcının mevcut rolünü kontrol et
    const userResult = await client.query(
      'SELECT id, username, "fullName", role FROM users WHERE username = $1',
      ['muslumdildas']
    )

    if (userResult.rows.length === 0) {
      console.log('❌ Müslüm DİLDAŞ bulunamadı!')
      await client.end()
      process.exit(1)
    }

    const user = userResult.rows[0]
    console.log(`Mevcut rol: ${user.role}`)
    console.log(`Satınalma paneline yönlendirmek için...\n`)

    console.log('💡 Schema\'da SATINALMA rolü olmadığı için,')
    console.log('   login sayfasında satınalma için özel bir kontrol ekleyebiliriz.')
    console.log('   Veya schema\'ya SATINALMA rolü ekleyebiliriz.\n')

    console.log('⚠️  Şu an yapabileceğimiz:')
    console.log('   1. Schema\'ya SATINALMA rolü eklemek (migration gerekir)')
    console.log('   2. Login sayfasında kullanıcı adına göre özel yönlendirme yapmak')
    console.log('   3. Kullanıcıyı olduğu gibi bırakmak ve middleware\'de özel kontrol eklemek\n')

    await client.end()

    console.log('✅ Kontrol tamamlandı. Lütfen hangi yöntemi tercih ettiğinizi belirtin.')

  } catch (error: any) {
    console.error('❌ Hata:', error.message)
    await client.end().catch(() => {})
    process.exit(1)
  }
}

fixMuslumRole()
