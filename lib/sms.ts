/**
 * NetGSM SMS Servis Modülü
 * OTP ve Alert SMS gönderimi için
 */

interface SmsResponse {
  success: boolean
  jobId?: string
  code?: string
  description?: string
  error?: string
}

interface SendOTPParams {
  phone: string
  code: string
  appname?: string
}

interface SendAlertParams {
  phone: string
  message: string
  encoding?: 'TR' | 'default'
}

/**
 * NetGSM OTP SMS gönderimi
 * @param params - OTP gönderim parametreleri
 * @returns SMS gönderim sonucu
 */
export async function sendOTP(params: SendOTPParams): Promise<SmsResponse> {
  const { phone, code, appname = 'Mesaidefteri' } = params

  // .env'den NetGSM bilgilerini al
  const username = process.env.NETGSM_USERNAME
  const password = process.env.NETGSM_PASSWORD
  const msgheader = process.env.NETGSM_MSGHEADER || username || ''

  if (!username || !password || !msgheader) {
    console.error('NetGSM credentials missing in .env')
    return {
      success: false,
      error: 'NetGSM yapılandırması eksik. Lütfen .env dosyasını kontrol edin.'
    }
  }

  // Telefon numarası formatını düzelt (5xxXXXxxxx formatına çevir)
  const formattedPhone = formatPhoneNumber(phone)
  if (!formattedPhone) {
    return {
      success: false,
      error: 'Geçersiz telefon numarası formatı'
    }
  }

  // OTP mesajı oluştur (Türkçe karakter içermemeli)
  const message = `Kodunuz: ${code}. Bu kodu kimseyle paylasmayin.`

  try {
    const url = 'https://api.netgsm.com.tr/sms/rest/v2/otp'
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
      },
      body: JSON.stringify({
        msgheader,
        appname,
        msg: message,
        no: formattedPhone
      })
    })

    const data = await response.json()

    if (data.code === '00' && data.description === 'success') {
      return {
        success: true,
        jobId: data.jobid,
        code: data.code,
        description: data.description
      }
    } else {
      return {
        success: false,
        code: data.code,
        description: data.description,
        error: getErrorMessage(data.code, data.description)
      }
    }
  } catch (error: any) {
    console.error('NetGSM OTP SMS error:', error)
    return {
      success: false,
      error: error.message || 'SMS gönderilirken bir hata oluştu'
    }
  }
}

/**
 * NetGSM Alert SMS gönderimi (Genel uyarı mesajları)
 * @param params - Alert gönderim parametreleri
 * @returns SMS gönderim sonucu
 */
export async function sendAlert(params: SendAlertParams): Promise<SmsResponse> {
  const { phone, message, encoding = 'TR' } = params

  // .env'den NetGSM bilgilerini al
  const username = process.env.NETGSM_USERNAME
  const password = process.env.NETGSM_PASSWORD
  const msgheader = process.env.NETGSM_MSGHEADER || username || ''

  if (!username || !password || !msgheader) {
    console.error('NetGSM credentials missing in .env')
    return {
      success: false,
      error: 'NetGSM yapılandırması eksik. Lütfen .env dosyasını kontrol edin.'
    }
  }

  // Telefon numarası formatını düzelt
  const formattedPhone = formatPhoneNumber(phone)
  if (!formattedPhone) {
    return {
      success: false,
      error: 'Geçersiz telefon numarası formatı'
    }
  }

  try {
    const url = 'https://api.netgsm.com.tr/sms/rest/v2/send'
    
    const requestData: any = {
      msgheader,
      messages: [
        {
          msg: message,
          no: formattedPhone
        }
      ],
      encoding: encoding === 'TR' ? 'TR' : undefined,
      iysfilter: '0', // Bilgilendirme amaçlı (İYS kontrolü yok)
      partnercode: process.env.NETGSM_PARTNERCODE || ''
    }

    // encoding undefined ise objeden çıkar
    if (!requestData.encoding) {
      delete requestData.encoding
    }
    if (!requestData.partnercode) {
      delete requestData.partnercode
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
      },
      body: JSON.stringify(requestData)
    })

    const data = await response.json()

    if (data.code === '00' || (typeof data.code === 'string' && data.code.startsWith('17'))) {
      return {
        success: true,
        jobId: data.jobid || data.code,
        code: data.code,
        description: data.description || 'queued'
      }
    } else {
      return {
        success: false,
        code: data.code,
        description: data.description,
        error: getErrorMessage(data.code, data.description)
      }
    }
  } catch (error: any) {
    console.error('NetGSM Alert SMS error:', error)
    return {
      success: false,
      error: error.message || 'SMS gönderilirken bir hata oluştu'
    }
  }
}

/**
 * Telefon numarasını NetGSM formatına çevir (5xxXXXxxxx)
 * @param phone - Ham telefon numarası
 * @returns Formatlanmış telefon numarası veya null
 */
function formatPhoneNumber(phone: string): string | null {
  if (!phone) return null

  // Boşluk, tire, parantez gibi karakterleri temizle
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, '')

  // Türkiye ülke kodu varsa kaldır (90)
  if (cleaned.startsWith('90')) {
    cleaned = cleaned.substring(2)
  }

  // Başındaki 0'ı kaldır
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }

  // 10 haneli olmalı ve 5 ile başlamalı
  if (cleaned.length === 10 && cleaned.startsWith('5')) {
    return cleaned
  }

  // 11 haneli ise (0 ile başlıyorsa)
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return cleaned.substring(1)
  }

  return null
}

/**
 * NetGSM hata kodlarını Türkçe mesaja çevir
 * @param code - Hata kodu
 * @param description - Hata açıklaması
 * @returns Türkçe hata mesajı
 */
function getErrorMessage(code: string | number, description?: string): string {
  const errorMessages: Record<string, string> = {
    '20': 'Mesaj metni veya karakter sayısı hatası',
    '30': 'Geçersiz kullanıcı adı, şifre veya API erişim izni yok',
    '40': 'Mesaj başlığı (gönderici adı) sistemde tanımlı değil',
    '41': 'Mesaj başlığı (gönderici adı) sistemde tanımlı değil',
    '50': 'İYS kontrollü gönderim yapılamıyor',
    '51': 'İYS Marka bilgisi bulunamadı',
    '52': 'Gönderilen numara geçersiz',
    '60': 'OTP SMS Paketi tanımlı değil',
    '70': 'Hatalı parametre veya zorunlu alan eksik',
    '80': 'Gönderim sınır aşımı',
    '85': 'Mükerrer gönderim sınır aşımı (1 dakikada 20\'den fazla)',
    '100': 'Sistem hatası'
  }

  const codeStr = String(code)
  return errorMessages[codeStr] || description || 'Bilinmeyen hata'
}

/**
 * SMS log kaydı oluştur
 * @param logData - Log verileri
 */
export async function logSms(logData: {
  userId?: string
  taskId?: string
  phone: string
  message: string
  type: 'otp' | 'alert'
  status: 'success' | 'failed' | 'pending'
  jobId?: string
  errorCode?: string
  errorMessage?: string
}): Promise<void> {
  try {
    const response = await fetch('/api/sms/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logData),
    })

    if (!response.ok) {
      console.error('SMS log kaydedilemedi:', await response.text())
    }
  } catch (error) {
    console.error('SMS log kaydetme hatası:', error)
  }
}
