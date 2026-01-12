'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { UserRole } from '@prisma/client'
import Link from 'next/link'

function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'login' | 'otp'>('login') // Login adımları
  const [otpCode, setOtpCode] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [phone, setPhone] = useState('')
  const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL'den callbackUrl ve error parametrelerini al
  useEffect(() => {
    try {
      const errorParam = searchParams?.get('error') || null
      const messageParam = searchParams?.get('message') || null
      
      if (errorParam === 'unauthorized' && messageParam) {
        setError(messageParam)
      } else if (errorParam === 'unauthorized') {
        setError('Bu sayfaya erişim yetkiniz yok.')
      }
    } catch (err) {
      console.error('Search params error:', err)
    }
  }, [searchParams])

  // Rol bazlı yönlendirme
  const getRedirectPath = (role: UserRole, username?: string) => {
    // Özel kullanıcı yönlendirmeleri (satınalma için)
    if (username === 'muslumdildas') {
      return '/panel/satinalma'
    }

    switch (role) {
      case 'SUPERVIZOR':
        return '/panel/supervizor'
      case 'MANAGER':
        return '/panel/yonetici'
      case 'STAFF':
        return '/panel/kurye'
      case 'DEVELOPER':
        return '/panel/yazilimci'
      case 'KASIYER':
        return '/panel/kasiyer'
      default:
        return '/panel/satinalma'
    }
  }

  // Konum alma fonksiyonu
  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Tarayıcınız konum servisini desteklemiyor'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          reject(error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // 10 saniye timeout
          maximumAge: 0 // Cache kullanma, her zaman yeni konum al
        }
      )
    })
  }

  // Konum kaydetme fonksiyonu
  const logLocation = async (type: 'LOGIN' | 'LOGOUT', latitude: number | null, longitude: number | null) => {
    try {
      const response = await fetch('/api/user/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          latitude,
          longitude
        }),
      })

      if (!response.ok) {
        console.error('Konum kaydedilemedi:', await response.text())
      }
    } catch (error) {
      console.error('Konum kaydetme hatası:', error)
      // Konum kaydetme hatası girişi engellemez
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Önce konum al (ZORUNLU)
      let location: { latitude: number; longitude: number } | null = null
      
      try {
        location = await getCurrentLocation()
      } catch (locationError: any) {
        // Konum izni reddedildi veya hata oluştu
        setError('Konum izni olmadan sisteme giriş yapılamaz. Lütfen tarayıcı ayarlarınızdan konum iznini aktif edin.')
        setLoading(false)
        return
      }

      // Konum alındıktan sonra giriş işlemini yap
      const callbackUrl = searchParams?.get('callbackUrl') || undefined

      const result = await signIn('credentials', {
        username: username.toLowerCase().trim(),
        password: password,
        redirect: false,
        callbackUrl: callbackUrl || '/panel/satinalma'
      })

      if (result?.error) {
        setError('Kullanıcı adı veya şifre hatalı')
        setLoading(false)
        return
      }

      if (result?.ok) {
        // SMS doğrulama aktif mi kontrol et (global settings)
        let smsEnabled = false
        try {
          const settingsResponse = await fetch('/api/settings')
          if (settingsResponse.ok) {
            const settingsData = await settingsResponse.json()
            smsEnabled = settingsData.settings?.netgsmOtpEnabled || false
          }
        } catch (e) {
          // Settings alınamazsa varsayılan olarak kapalı
          console.warn('Global settings alınamadı, varsayılan olarak kapalı')
        }
        
        if (smsEnabled) {
          // SMS doğrulama aktif - OTP adımına geç
          const sessionResponse = await fetch('/api/auth/session')
          const session = await sessionResponse.json()

          // Kullanıcının telefon numarasını kontrol et
          try {
            const userResponse = await fetch(`/api/auth/user-phone?username=${encodeURIComponent(username.toLowerCase().trim())}`)
            
            if (!userResponse.ok) {
              const errorData = await userResponse.json()
              console.error('User phone fetch error:', errorData)
              setError(errorData.error || 'Kullanıcı bilgileri alınamadı')
              setLoading(false)
              return
            }

            const userData = await userResponse.json()

            if (!userData.success) {
              setError('Kullanıcı bilgileri alınamadı')
              setLoading(false)
              return
            }

            console.log('User phone data:', { phone: userData.phone })

            // Telefon numarası her zaman zorunlu - OTP doğrulama aktif
            if (userData?.phone) {
              // Telefon numarası varsa SMS doğrulama adımına geç
              setPhone(userData.phone)
              setStep('otp')
              setLoading(false)
              
              // OTP SMS gönder
              await sendOTPCode(userData.phone)
            } else {
              // Telefon numarası yoksa hata göster
              console.error('Phone number missing for username:', username)
              setError('Kullanıcı telefon numarası bulunamadı. Lütfen sistem yöneticisine başvurun.')
              setLoading(false)
            }
          } catch (fetchError: any) {
            console.error('Error fetching user phone:', fetchError)
            setError('Kullanıcı bilgileri alınırken bir hata oluştu: ' + fetchError.message)
            setLoading(false)
          }
        } else {
          // SMS doğrulama pasif - Direkt giriş yap
          if (location) {
            await logLocation('LOGIN', location.latitude, location.longitude)
          } else {
            await logLocation('LOGIN', null, null)
          }

          const sessionResponse = await fetch('/api/auth/session')
          const session = await sessionResponse.json()

          // İlk giriş kontrolü - şifre değiştirme zorunluluğu
          if (session?.user?.mustChangePassword) {
            router.push('/panel/sifre-degistir')
            router.refresh()
            return
          }

          const callbackUrl = searchParams?.get('callbackUrl') || undefined

          if (callbackUrl) {
            router.push(callbackUrl)
          } else if (session?.user?.role) {
            const redirectPath = getRedirectPath(session.user.role as UserRole, username.toLowerCase().trim())
            router.push(redirectPath)
          } else {
            router.push('/panel/satinalma')
          }
          router.refresh()
        }
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Giriş yapılırken bir hata oluştu')
      setLoading(false)
    }
  }

  // OTP SMS gönder
  const sendOTPCode = async (phoneNumber: string) => {
    setOtpLoading(true)
    setError('')

    try {
      const response = await fetch('/api/sms/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: phoneNumber }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setOtpSent(true)
        setOtpExpiresAt(new Date(data.expiresAt))
        setError('')
      } else {
        setError(data.error || 'SMS gönderilemedi. Lütfen tekrar deneyin.')
        setStep('login') // Login adımına geri dön
      }
    } catch (error: any) {
      console.error('OTP send error:', error)
      setError('SMS gönderilirken bir hata oluştu. Lütfen tekrar deneyin.')
      setStep('login')
    } finally {
      setOtpLoading(false)
    }
  }

  // OTP doğrula
  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setOtpLoading(true)

    if (otpCode.length !== 6) {
      setError('Lütfen 6 haneli kodu giriniz')
      setOtpLoading(false)
      return
    }

    try {
      const response = await fetch('/api/sms/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: otpCode }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // OTP doğrulandı, konumu kaydet ve yönlendir
        let location: { latitude: number; longitude: number } | null = null
        
        try {
          location = await getCurrentLocation()
        } catch (locationError) {
          // Konum izni reddedildi, null olarak kaydet
        }

        await logLocation('LOGIN', location?.latitude || null, location?.longitude || null)

        // Kullanıcı rolünü al
        const sessionResponse = await fetch('/api/auth/session')
        const session = await sessionResponse.json()

        // İlk giriş kontrolü - şifre değiştirme zorunluluğu
        if (session?.user?.mustChangePassword) {
          router.push('/panel/sifre-degistir')
          router.refresh()
          return
        }

        const callbackUrl = searchParams?.get('callbackUrl') || undefined

        // Yönlendir
        if (callbackUrl) {
          router.push(callbackUrl)
        } else if (session?.user?.role) {
          const redirectPath = getRedirectPath(session.user.role as UserRole, username.toLowerCase().trim())
          router.push(redirectPath)
        } else {
          router.push('/panel/satinalma')
        }
        router.refresh()
      } else {
        setError(data.error || 'Doğrulama kodu hatalı')
        setOtpCode('')
      }
    } catch (error: any) {
      console.error('OTP verify error:', error)
      setError('Doğrulama sırasında bir hata oluştu')
    } finally {
      setOtpLoading(false)
    }
  }

  // OTP kodunu yeniden gönder
  const handleResendOTP = async () => {
    if (!phone) return
    setOtpCode('')
    setOtpSent(false)
    await sendOTPCode(phone)
  }

  // OTP ekranı
  if (step === 'otp') {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative px-4 py-8 sm:px-6 sm:py-12"
        style={{
          backgroundImage: "url('/background.jpg')",
        }}
      >
        <div className="absolute inset-0 bg-black/20 sm:bg-black/15"></div>
        
        <div className="relative z-10 w-full max-w-[340px] sm:max-w-[360px] md:max-w-[380px] mx-auto">
          <div className="bg-white/50 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 md:p-7 border border-white/40">
            <div className="text-center mb-4 sm:mb-5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 tracking-tighter font-sans drop-shadow-lg">
                SMS Doğrulama
              </h1>
              <p className="text-sm text-gray-600 mt-2">
                {phone ? `${phone.slice(0, 3)}***${phone.slice(-2)}` : 'Telefon numaranıza'} gönderilen 6 haneli kodu giriniz
              </p>
            </div>

            <form onSubmit={handleOTPVerify} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm text-center animate-pulse shadow-sm">
                  {error}
                </div>
              )}

              {otpSent && otpExpiresAt && (
                <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded-lg text-sm text-center">
                  SMS gönderildi. Kod {new Date(otpExpiresAt).toLocaleTimeString('tr-TR', { minute: '2-digit', second: '2-digit' })}'a kadar geçerlidir.
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Doğrulama Kodu
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setOtpCode(value)
                    setError('')
                  }}
                  required
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white/50 backdrop-blur-sm text-gray-800 text-center text-2xl font-bold tracking-widest"
                  placeholder="000000"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={otpLoading || otpCode.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] text-sm sm:text-base touch-manipulation min-h-[44px] flex items-center justify-center gap-2"
              >
                {otpLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Doğrulanıyor...</span>
                  </>
                ) : (
                  <span>Doğrula</span>
                )}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setStep('login')
                    setOtpCode('')
                    setOtpSent(false)
                    setError('')
                  }}
                  className="text-gray-600 hover:text-gray-700 font-medium"
                >
                  ← Geri Dön
                </button>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={otpLoading}
                  className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  Kodu Yeniden Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative px-4 py-8 sm:px-6 sm:py-12"
      style={{
        backgroundImage: "url('/background.jpg')",
      }}
    >
      {/* Overlay for better contrast */}
      <div className="absolute inset-0 bg-black/20 sm:bg-black/15"></div>
      
      {/* Login Card */}
      <div className="relative z-10 w-full max-w-[340px] sm:max-w-[360px] md:max-w-[380px] mx-auto">
        <div className="bg-white/50 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 md:p-7 border border-white/40">
          {/* Logo/Title */}
          <div className="text-center mb-4 sm:mb-5">
            <h1 className="text-2xl sm:text-3xl md:text-3xl font-extrabold text-gray-800 tracking-tighter font-sans drop-shadow-lg" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.15), 0 0 20px rgba(255, 255, 255, 0.3)' }}>
              Mesaidefteri
            </h1>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Hata Mesajı */}
            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm text-center animate-pulse shadow-sm">
                {error}
              </div>
            )}

            {/* Kullanıcı Adı Input */}
            <div>
              <label 
                htmlFor="username" 
                className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2"
              >
                Kullanıcı Adı
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError('') // Hata mesajını temizle
                }}
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white/50 backdrop-blur-sm text-gray-800 placeholder-gray-400 text-sm sm:text-base touch-manipulation"
                placeholder="Kullanıcı adınızı girin"
              />
            </div>

            {/* Password Input */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2"
              >
                Şifre
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('') // Hata mesajını temizle
                }}
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white/50 backdrop-blur-sm text-gray-800 placeholder-gray-400 text-sm sm:text-base touch-manipulation"
                placeholder="••••••••"
              />
            </div>

            {/* Konum İzni Bilgilendirmesi */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              <p className="font-medium mb-1">📍 Konum İzni Gereklidir</p>
              <p>Sisteme giriş yapmak için konum izni vermeniz zorunludur.</p>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 sm:py-3.5 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] text-sm sm:text-base touch-manipulation min-h-[44px] sm:min-h-[48px] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Konum alınıyor ve giriş yapılıyor...</span>
                </>
              ) : (
                <>
                  <span>📍</span>
                  <span>Giriş Yap</span>
                </>
              )}
            </button>

            {/* Forgot Password Link */}
            <div className="text-center pt-2">
              <Link
                href="/sifremi-unuttum"
                className="text-xs sm:text-sm text-gray-600 hover:text-gray-700 font-normal transition-colors touch-manipulation"
              >
                Şifremi Unuttum
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
