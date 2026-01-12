'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export default function SifreDegistirPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (session) {
      if (!(session.user as any)?.mustChangePassword) {
        const role = session.user.role
        if (role === 'SUPERVIZOR') {
          router.push('/panel/supervizor')
        } else if (role === 'MANAGER') {
          router.push('/panel/yonetici')
        } else {
          router.push('/panel/satinalma')
        }
      } else {
        setLoading(false)
      }
    }
  }, [session, router])

  const validatePassword = (password: string): { valid: boolean; error?: string } => {
    if (password.length < 6) return { valid: false, error: 'Şifre en az 6 karakter olmalıdır' }
    if (!/[A-Z]/.test(password)) return { valid: false, error: 'Şifre en az bir büyük harf içermelidir' }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { valid: false, error: 'Şifre en az bir noktalama işareti içermelidir' }
    }
    return { valid: true }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    if (!formData.newPassword || !formData.confirmPassword) {
      setError('Lütfen tüm alanları doldurun')
      setSubmitting(false)
      return
    }

    const passwordValidation = validatePassword(formData.newPassword)
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || 'Şifre geçersiz')
      setSubmitting(false)
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Yeni şifre ve şifre tekrarı eşleşmiyor')
      setSubmitting(false)
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${session?.user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: formData.newPassword })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const updateResponse = await fetch(`/api/admin/users/${session?.user?.id}/reset-password-flag`, {
          method: 'POST'
        })

        if (updateResponse.ok) {
          await update()
          const role = session?.user?.role
          if (role === 'SUPERVIZOR') router.push('/panel/supervizor')
          else if (role === 'MANAGER') router.push('/panel/yonetici')
          else router.push('/panel/satinalma')
        } else {
          setError('Şifre güncellendi ancak sistem güncellemesi yapılamadı. Lütfen tekrar giriş yapın.')
        }
      } else {
        setError(data.error || 'Şifre güncellenirken bir hata oluştu')
      }
    } catch (err) {
      console.error('Error updating password:', err)
      setError('Şifre güncellenirken bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Şifre Değiştirme Zorunlu</h1>
            <p className="text-gray-600 text-sm">
              Güvenlik nedeniyle ilk girişinizde şifrenizi değiştirmeniz gerekmektedir.
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Yeni Şifre <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                  placeholder="Yeni şifrenizi girin"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
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
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                  placeholder="Yeni şifreyi tekrar girin"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
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
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
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
          </form>
        </div>
      </div>
    </div>
  )
}
