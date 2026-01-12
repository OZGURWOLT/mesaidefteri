'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  User,
  Lock,
  Phone,
  Save,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import LogoutButton from '@/components/auth/LogoutButton'
import RouteGuard from '@/components/auth/RouteGuard'

export default function HesabimPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Kullanıcı bilgilerini yükle
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true)
        if (session?.user?.id) {
          const response = await fetch(`/api/admin/users/${session.user.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.user) {
              setFormData({
                fullName: data.user.fullName || '',
                username: data.user.username || '',
                phone: data.user.phone || '',
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
              })
            } else {
              setError(data.error || 'Kullanıcı bilgileri yüklenemedi')
            }
          } else {
            const errorData = await response.json()
            setError(errorData.error || 'Kullanıcı bilgileri yüklenemedi')
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err)
        setError('Kullanıcı bilgileri yüklenirken bir hata oluştu')
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      fetchUserData()
    }
  }, [session])

  // Form gönder
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      // Şifre değiştirme kontrolü
      if (formData.newPassword || formData.confirmPassword) {
        if (!formData.currentPassword) {
          setError('Şifre değiştirmek için mevcut şifrenizi girmelisiniz')
          setSubmitting(false)
          return
        }

        if (formData.newPassword.length < 6) {
          setError('Yeni şifre en az 6 karakter olmalıdır')
          setSubmitting(false)
          return
        }

        if (formData.newPassword !== formData.confirmPassword) {
          setError('Yeni şifre ve şifre tekrarı eşleşmiyor')
          setSubmitting(false)
          return
        }
      }

      // Telefon numarası format kontrolü
      let formattedPhone: string | null = null
      if (formData.phone) {
        const cleaned = formData.phone.replace(/[\s\-\(\)\+]/g, '')
        let processed = cleaned
        if (cleaned.startsWith('90')) {
          processed = cleaned.substring(2)
        } else if (cleaned.startsWith('0')) {
          processed = cleaned.substring(1)
        }
        
        if (processed.length !== 10 || !processed.startsWith('5')) {
          setError('Geçerli bir telefon numarası giriniz (5xxXXXxxxx formatında)')
          setSubmitting(false)
          return
        }
        formattedPhone = processed
      }

      // Mevcut şifre kontrolü (eğer şifre değiştiriliyorsa)
      if (formData.newPassword && formData.currentPassword) {
        const verifyResponse = await fetch('/api/auth/verify-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session?.user?.id,
            password: formData.currentPassword
          })
        })

        if (!verifyResponse.ok) {
          const verifyData = await verifyResponse.json()
          setError(verifyData.error || 'Mevcut şifre hatalı')
          setSubmitting(false)
          return
        }
      }

      // Güncelleme isteği
      const response = await fetch(`/api/admin/users/${session?.user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          phone: formattedPhone || undefined,
          password: formData.newPassword || undefined
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess('Hesap bilgileriniz başarıyla güncellendi')
        
        // Session'ı güncelle
        await update()
        
        // Form'u temizle
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }))

        // Başarı mesajını 3 saniye sonra temizle
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Güncelleme sırasında bir hata oluştu')
      }
    } catch (err) {
      console.error('Error updating account:', err)
      setError('Güncelleme sırasında bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <RouteGuard requiredRoles={['SUPERVIZOR']}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Yükleniyor...</p>
          </div>
        </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard requiredRoles={['SUPERVIZOR']}>
      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Header */}
        <div className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-200">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/panel/supervizor')}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2">
                  <User className="w-6 h-6 text-blue-600" />
                  <h1 className="text-xl font-bold text-gray-800">Hesabım</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <LogoutButton variant="icon" />
              </div>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mx-4 mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Content */}
        <div className="px-4 py-6 max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Kişisel Bilgiler */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Kişisel Bilgiler
              </h2>

              <div className="space-y-4">
                {/* Ad Soyad */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ad Soyad <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                    required
                  />
                </div>

                {/* Kullanıcı Adı */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Kullanıcı Adı
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 text-sm cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">Kullanıcı adı değiştirilemez</p>
                </div>

                {/* Telefon */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Telefon Numarası <span className="text-gray-400 font-normal">(SMS için)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d\s\-\(\)\+]/g, '')
                        setFormData({ ...formData, phone: value })
                      }}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                      placeholder="5xxXXXxxxx"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">SMS doğrulama için telefon numarası</p>
                </div>
              </div>
            </div>

            {/* Şifre Değiştirme */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-600" />
                Şifre Değiştir
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Şifrenizi değiştirmek istemiyorsanız bu bölümü boş bırakabilirsiniz.
              </p>

              <div className="space-y-4">
                {/* Mevcut Şifre */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mevcut Şifre
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                      placeholder="Şifre değiştirmek için gerekli"
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

                {/* Yeni Şifre */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Yeni Şifre
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                      placeholder="En az 6 karakter"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Şifre Tekrar */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Yeni Şifre (Tekrar)
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                      placeholder="Yeni şifreyi tekrar girin"
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
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push('/panel/supervizor')}
                className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Kaydet</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </RouteGuard>
  )
}
