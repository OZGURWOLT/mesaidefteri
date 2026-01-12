/**
 * Phone unique constraint'ini kaldır
 */
import { Client } from 'pg'

async function removePhoneUnique() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    await client.connect()
    console.log('Veritabanına bağlanıldı...')

    // Unique constraint'i kaldır
    await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key;')
    console.log('✅ Phone unique constraint kaldırıldı')

    await client.end()
  } catch (error: any) {
    console.error('❌ Hata:', error.message)
    await client.end().catch(() => {})
    process.exit(1)
  }
}

removePhoneUnique()
