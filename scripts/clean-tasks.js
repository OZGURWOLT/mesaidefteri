// Mevcut Task verilerini temizle
const { Client } = require('pg')

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'

const client = new Client({
  connectionString: DATABASE_URL,
})

async function cleanTasks() {
  try {
    await client.connect()
    console.log('✅ Veritabanına bağlandı\n')

    // İlişkili tabloları önce temizle
    console.log('🧹 İlişkili tablolar temizleniyor...')
    await client.query('DELETE FROM price_logs')
    await client.query('DELETE FROM notifications WHERE "taskId" IS NOT NULL')
    await client.query('DELETE FROM sms_logs WHERE "taskId" IS NOT NULL')
    await client.query('DELETE FROM user_scores WHERE "taskId" IS NOT NULL')
    console.log('✅ İlişkili tablolar temizlendi\n')

    // Task tablosunu temizle
    console.log('🧹 Task tablosu temizleniyor...')
    const result = await client.query('DELETE FROM tasks RETURNING id')
    console.log(`✅ ${result.rowCount} görev silindi\n`)

    await client.end()
    console.log('✅ Temizlik tamamlandı!')
  } catch (error) {
    console.error('❌ Hata:', error.message)
    process.exit(1)
  }
}

cleanTasks()
