'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  ArrowLeft,
  Smartphone,
  Mail
} from 'lucide-react'
import Link from 'next/link'

type Step = 'username' | 'otp' | 'reset'

export default function SifremiUnuttumPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('username')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Şifre validasyonu
  const validatePassword = (password: string): { valid: boolean; error?: string } => {
    if (password.length < 6) return { valid: false, error: 'Şifre en az 6 karakter olmalıdır' }
    if (!/[A-Z]/.test(password)) return { valid: false, error: 'Şifre en az bir büyük harf içermelidir' }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { valid: false, error: 'Şifre en az bir noktalama işareti içermelidir' }
    }
    return { valid: true }
  }

  // Kullanıcı adı veya telefon ile OTP gönder
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!username.trim() && !phone.trim()) {
      setError('Lütfen kullanıcı adı veya telefon numarası girin')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() || undefined, phone: phone.trim() || undefined })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setUserId(data.userId)
        setPhone(data.phone || phone)
        setOtpSent(true)
        setOtpExpiresAt(new Date(data.expiresAt))
        setSuccess('Doğrulama kodu telefon numaranıza gönderildi')
        setStep('otp')
      } else {
        setError(data.error || 'OTP gönderilemedi. Lütfen tekrar deneyin.')
      }
    } catch (err: any) {
      console.error('OTP request error:', err)
      setError('OTP gönderilirken bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  // OTP doğrula
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (otpCode.length !== 6) {
      setError('Lütfen 6 haneli kodu giriniz')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/forgot-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: otpCode })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess('Kod doğrulandı. Yeni şifrenizi girin.')
        setStep('reset')
      } else {
        setError(data.error || 'Kod hatalı veya süresi dolmuş')
      }
    } catch (err: any) {
      console.error('OTP verify error:', err)
      setError('Kod doğrulanırken bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  // Şifre sıfırla
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!newPassword || !confirmPassword) {
      setError('Lütfen tüm alanları doldurun')
      setLoading(false)
      return
    }

    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || 'Şifre geçersiz')
      setLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Yeni şifre ve şifre tekrarı eşleşmiyor')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess('Şifreniz başarıyla güncellendi. Giriş sayfasına yönlendiriliyorsunuz...')
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        setError(data.error || 'Şifre güncellenirken bir hata oluştu')
      }
    } catch (err: any) {
      console.error('Reset password error:', err)
      setError('Şifre güncellenirken bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  // OTP yeniden gönder
  const handleResendOTP = async () => {
    setLoading(true)
    setError('')
    setOtpCode('')

    try {
      const response = await fetch('/api/auth/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setOtpExpiresAt(new Date(data.expiresAt))
        setSuccess('Yeni doğrulama kodu gönderildi')
      } else {
        setError(data.error || 'Kod gönderilemedi. Lütfen tekrar deneyin.')
      }
    } catch (err: any) {
      console.error('Resend OTP error:', err)
      setError('Kod gönderilirken bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {step === 'username' && 'Şifremi Unuttum'}
              {step === 'otp' && 'Doğrulama Kodu'}
              {step === 'reset' && 'Yeni Şifre Belirle'}
            </h1>
            <p className="text-gray-600 text-sm">
              {step === 'username' && 'Kullanıcı adı veya telefon numaranızı girin'}
              {step === 'otp' && 'Telefonunuza gönderilen 6 haneli kodu girin'}
              {step === 'reset' && 'Yeni şifrenizi belirleyin'}
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Step 1: Username/Phone */}
          {step === 'username' && (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Kullanıcı Adı veya Telefon Numarası
                </label>
                <div className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                      placeholder="Kullanıcı adı"
                    />
                  </div>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                      placeholder="+90 5XX XXX XX XX"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Kullanıcı adı veya telefon numaranızdan birini girin
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || (!username.trim() && !phone.trim())}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gönderiliyor...</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    <span>Doğrulama Kodu Gönder</span>
                  </>
                )}
              </button>

              <Link
                href="/"
                className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Giriş sayfasına dön</span>
              </Link>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  6 Haneli Doğrulama Kodu
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setOtpCode(value)
                    setError('')
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-center text-2xl font-bold tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
                {otpExpiresAt && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Kod {new Date(otpExpiresAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} tarihine kadar geçerlidir
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Doğrulanıyor...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Doğrula</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep('username')
                    setOtpCode('')
                    setError('')
                  }}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Geri Dön</span>
                </button>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  Kodu Yeniden Gönder
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Reset Password */}
          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Yeni Şifre <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                    placeholder="Yeni şifrenizi girin"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Yeni Şifre (Tekrar) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                    placeholder="Yeni şifreyi tekrar girin"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800 font-medium mb-1">Şifre Gereksinimleri:</p>
                <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
                  <li>En az 6 karakter</li>
                  <li>En az bir büyük harf (A-Z)</li>
                  <li>En az bir noktalama işareti (!@#$%^&*()_+-=[]{}|;:,. vb.)</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Güncelleniyor...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Şifreyi Güncelle</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('otp')
                  setNewPassword('')
                  setConfirmPassword('')
                  setError('')
                }}
                className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Geri Dön</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
