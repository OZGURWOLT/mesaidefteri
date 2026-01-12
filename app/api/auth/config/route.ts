import { NextRequest, NextResponse } from 'next/server'

/**
 * SMS yapılandırmasını getir
 * GET /api/auth/config
 */
export async function GET(request: NextRequest) {
  try {
    const smsEnabled = process.env.SMS_ENABLED !== 'false'
    
    return NextResponse.json({
      success: true,
      smsEnabled
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Yapılandırma getirilirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
