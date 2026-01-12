/**
 * Kullanıcı telefon numaralarını kontrol et
 */
import { Client } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })

async function checkUserPhones() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    await client.connect()
    console.log('✅ Veritabanına bağlanıldı...\n')

    const result = await client.query(
      'SELECT username, "fullName", phone, LENGTH(phone) as phone_length FROM users ORDER BY username'
    )

    console.log('Kullanıcılar ve telefon numaraları:')
    console.log('='.repeat(80))
    
    result.rows.forEach(u => {
      const phoneStatus = u.phone ? `✓ ${u.phone} (${u.phone_length} karakter)` : '❌ YOK'
      console.log(`${u.username.padEnd(20)} | ${u.fullName.padEnd(25)} | ${phoneStatus}`)
    })

    console.log('\n' + '='.repeat(80))
    console.log(`Toplam: ${result.rows.length} kullanıcı`)
    
    const withPhone = result.rows.filter(u => u.phone).length
    const withoutPhone = result.rows.filter(u => !u.phone).length
    
    console.log(`Telefon numarası olan: ${withPhone}`)
    console.log(`Telefon numarası olmayan: ${withoutPhone}`)

    await client.end()
  } catch (error: any) {
    console.error('❌ Hata:', error.message)
    await client.end().catch(() => {})
    process.exit(1)
  }
}

checkUserPhones()
