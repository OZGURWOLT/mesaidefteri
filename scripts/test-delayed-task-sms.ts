/**
 * Geciken görev SMS testi
 * Müslüm DİLDAŞ için 30+ dakika önce atanmış bir görev oluşturup SMS gönder
 */
import { Client } from 'pg'
import { sendAlert, logSms } from '../lib/sms'
import * as dotenv from 'dotenv'

// .env dosyasını yükle
dotenv.config({ path: '.env' })

async function testDelayedTaskSMS() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    await client.connect()
    console.log('✅ Veritabanına bağlanıldı...')

    // Müslüm DİLDAŞ'ı bul
    const userResult = await client.query(
      'SELECT id, username, "fullName", phone FROM users WHERE username = $1',
      ['muslumdildas']
    )

    if (userResult.rows.length === 0) {
      console.error('❌ Müslüm DİLDAŞ bulunamadı!')
      await client.end()
      process.exit(1)
    }

    const user = userResult.rows[0]
    console.log(`✓ Kullanıcı bulundu: ${user.fullName} (${user.username})`)
    console.log(`  Telefon: ${user.phone || 'YOK'}`)

    if (!user.phone) {
      console.error('❌ Kullanıcının telefon numarası yok!')
      await client.end()
      process.exit(1)
    }

    // 35 dakika önce atanmış bir görev oluştur
    const assignedAt = new Date()
    assignedAt.setMinutes(assignedAt.getMinutes() - 35) // 35 dakika önce

    const taskId = crypto.randomUUID()

    await client.query(
      `INSERT INTO tasks (id, title, description, status, "assignedTo", "assignedAt", "taskType", photos, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text[], NOW(), NOW())`,
      [
        taskId,
        'Test: Geciken Görev',
        'Bu bir test görevidir. 35 dakika önce atandı ve SMS gönderilmesi gerekiyor.',
        'in_progress', // YAPILIYOR durumu
        user.id,
        assignedAt,
        'MARKET_GOREV:test',
        [] // PostgreSQL array
      ]
    )

    console.log(`✓ Görev oluşturuldu: ${taskId}`)
    console.log(`  Başlık: Test: Geciken Görev`)
    console.log(`  Atanma Zamanı: ${assignedAt.toLocaleString('tr-TR')}`)
    console.log(`  Durum: in_progress (YAPILIYOR)`)
    console.log(`  Gecikme: 35 dakika\n`)

    await client.end()

    // Direkt SMS gönder
    console.log('📱 SMS gönderiliyor...\n')

    const delayMinutes = 35
    const message = `Merhaba ${user.fullName}, "Test: Geciken Görev" göreviniz ${delayMinutes} dakikadır devam ediyor. Lütfen görevi tamamlayın veya durumunu güncelleyin.`

    const smsResult = await sendAlert({
      phone: user.phone,
      message,
      encoding: 'TR'
    })

    // SMS log kaydet
    await logSms({
      userId: user.id,
      taskId: taskId,
      phone: user.phone,
      message,
      type: 'alert',
      status: smsResult.success ? 'success' : 'failed',
      jobId: smsResult.jobId,
      errorCode: smsResult.code,
      errorMessage: smsResult.error
    })

    if (smsResult.success) {
      console.log('✅ SMS başarıyla gönderildi!')
      console.log(`   Job ID: ${smsResult.jobId}`)
      console.log(`   Mesaj: ${message}`)
      console.log(`\n📱 ${user.fullName} (0${user.phone}) numarasına SMS gönderildi!`)
    } else {
      console.error('❌ SMS gönderilemedi!')
      console.error(`   Hata: ${smsResult.error || smsResult.description}`)
      console.error(`   Kod: ${smsResult.code}`)
    }

    console.log('\n✅ Test tamamlandı!')
  } catch (error: any) {
    console.error('❌ Hata:', error.message)
    console.error(error)
    await client.end().catch(() => {})
    process.exit(1)
  }
}

testDelayedTaskSMS()
