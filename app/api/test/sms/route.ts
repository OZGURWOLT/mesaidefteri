import { NextRequest, NextResponse } from 'next/server'
import { sendOTP, sendAlert } from '@/lib/sms'

/**
 * SMS Test Endpoint
 * GET /api/test/sms?type=otp|alert&phone=5xxxxxxxxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'otp'
    const phone = searchParams.get('phone')

    if (!phone) {
      return NextResponse.json(
        { error: 'Telefon numarası gerekli (phone parametresi)' },
        { status: 400 }
      )
    }

    let result

    if (type === 'otp') {
      // OTP test
      const testCode = Math.floor(100000 + Math.random() * 900000).toString()
      result = await sendOTP({
        phone,
        code: testCode,
        appname: 'Mesaidefteri Test'
      })
      
      return NextResponse.json({
        success: result.success,
        type: 'OTP',
        code: testCode,
        message: result.success 
          ? `Test OTP kodu gönderildi: ${testCode}`
          : 'OTP gönderilemedi',
        details: result
      })
    } else {
      // Alert test
      result = await sendAlert({
        phone,
        message: 'Bu bir test mesajıdır. Mesaidefteri SMS sistemi çalışıyor!',
        encoding: 'TR'
      })

      return NextResponse.json({
        success: result.success,
        type: 'Alert',
        message: result.success
          ? 'Test uyarı mesajı gönderildi'
          : 'Uyarı mesajı gönderilemedi',
        details: result
      })
    }
  } catch (error: any) {
    console.error('SMS test error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'SMS test sırasında bir hata oluştu',
        details: error
      },
      { status: 500 }
    )
  }
}
