'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  X, 
  Search, 
  Clock, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Check
} from 'lucide-react'
import RouteGuard from '@/components/auth/RouteGuard'

interface User {
  id: string
  fullName: string
  role: string
  username: string
}

export default function GorevEklePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'FIYAT_ARASTIRMASI' | 'STANDART_GOREV'>('STANDART_GOREV')
  const [repetition, setRepetition] = useState<'TEK_SEFERLIK' | 'GUNLUK' | 'HAFTALIK'>('TEK_SEFERLIK')
  const [hasCustomDuration, setHasCustomDuration] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('')
  const [assignedTo, setAssignedTo] = useState('')
  const [isTemplate, setIsTemplate] = useState(false)

  // Personel listesi ve arama
  const [staffList, setStaffList] = useState<User[]>([])
  const [staffSearchQuery, setStaffSearchQuery] = useState('')
  const [showStaffDropdown, setShowStaffDropdown] = useState(false)
  const staffInputRef = useRef<HTMLInputElement>(null)
  const staffDropdownRef = useRef<HTMLDivElement>(null)

  // Görev türü listesi ve arama
  const taskTypes = [
    { value: 'FIYAT_ARASTIRMASI', label: 'Fiyat Araştırması' },
    { value: 'STANDART_GOREV', label: 'Standart Görev' }
  ]
  const [typeSearchQuery, setTypeSearchQuery] = useState('')
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const typeInputRef = useRef<HTMLInputElement>(null)
  const typeDropdownRef = useRef<HTMLDivElement>(null)


  // Personel listesini yükle
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/users')
        if (!response.ok) throw new Error('Personel listesi yüklenemedi')
        const data = await response.json()
        
        // Tüm personelleri göster (sadece STAFF, DEVELOPER, KASIYER - MANAGER ve SUPERVIZOR hariç)
        // RouteGuard zaten yetki kontrolü yapıyor
        const filteredUsers = (data.users || []).filter((u: User) => 
          ['STAFF', 'DEVELOPER', 'KASIYER'].includes(u.role)
        )
        
        setStaffList(filteredUsers)
      } catch (err: any) {
        setError(err.message || 'Personel listesi yüklenemedi')
      } finally {
        setLoading(false)
      }
    }

    fetchStaff()
  }, [])

  // Filtrelenmiş personel listesi
  const filteredStaff = staffList.filter(staff =>
    staff.fullName.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
    staff.username.toLowerCase().includes(staffSearchQuery.toLowerCase())
  )

  // Filtrelenmiş görev türleri
  const filteredTaskTypes = taskTypes.filter(tt =>
    tt.label.toLowerCase().includes(typeSearchQuery.toLowerCase())
  )

  // Seçili personel bilgisi
  const selectedStaff = staffList.find(s => s.id === assignedTo)
  const selectedType = taskTypes.find(tt => tt.value === type)

  // Görev adı önerileri (personel rolüne göre)
  const getTaskSuggestions = (): string[] => {
    if (!selectedStaff) {
      return [
        'Market Temizliği',
        'Reyon Düzenleme',
        'Stok Kontrolü',
        'Fiyat Araştırması',
        'Müşteri Hizmetleri',
        'Kasa Kontrolü'
      ]
    }

    const role = selectedStaff.role
    const suggestions: Record<string, string[]> = {
      'STAFF': [
        'Market Temizliği',
        'Reyon Düzenleme',
        'Stok Kontrolü',
        'Ürün Yerleştirme',
        'Raf Düzenleme',
        'Temizlik Kontrolü'
      ],
      'KASIYER': [
        'Kasa Kontrolü',
        'Nakit Sayımı',
        'Müşteri Hizmetleri',
        'Fiş Kontrolü',
        'Kart Ödeme Testi',
        'Günlük Rapor'
      ],
      'DEVELOPER': [
        'Sistem Bakımı',
        'Yazılım Güncelleme',
        'Hata Düzeltme',
        'Veritabanı Kontrolü',
        'API Testi',
        'Performans Optimizasyonu'
      ],
      'MANAGER': [
        'Günlük Rapor',
        'Personel Değerlendirme',
        'Stok Analizi',
        'Satış Raporu',
        'Müşteri Şikayeti İnceleme'
      ]
    }

    return suggestions[role] || [
      'Günlük Görev',
      'Rutin Kontrol',
      'Sistem Bakımı'
    ]
  }

  const [showSuggestions, setShowSuggestions] = useState(false)
  const [titleInputFocused, setTitleInputFocused] = useState(false)

  // Dropdown dışına tıklanınca kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        staffDropdownRef.current &&
        !staffDropdownRef.current.contains(event.target as Node) &&
        staffInputRef.current &&
        !staffInputRef.current.contains(event.target as Node)
      ) {
        setShowStaffDropdown(false)
      }
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(event.target as Node) &&
        typeInputRef.current &&
        !typeInputRef.current.contains(event.target as Node)
      ) {
        setShowTypeDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Personel seçimi
  const handleStaffSelect = (staff: User) => {
    setAssignedTo(staff.id)
    setStaffSearchQuery(staff.fullName)
    setShowStaffDropdown(false)
  }

  // Görev türü seçimi
  const handleTypeSelect = (taskType: typeof taskTypes[0]) => {
    setType(taskType.value as 'FIYAT_ARASTIRMASI' | 'STANDART_GOREV')
    setTypeSearchQuery(taskType.label)
    setShowTypeDropdown(false)
  }

  // Form gönderimi
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      // Validasyon
      if (!title.trim()) {
        setError('Görev başlığı zorunludur')
        setSubmitting(false)
        return
      }

      if (!assignedTo) {
        setError('Lütfen bir personel seçin')
        setSubmitting(false)
        return
      }

      if (hasCustomDuration && (!durationMinutes || durationMinutes <= 0)) {
        setError('Özel süre belirtildiyse geçerli bir dakika değeri girin')
        setSubmitting(false)
        return
      }

      const response = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          type,
          repetition,
          hasCustomDuration,
          durationMinutes: hasCustomDuration ? Number(durationMinutes) : null,
          assignedTo,
          isTemplate
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Görev oluşturulurken bir hata oluştu')
        setSubmitting(false)
        return
      }

      setSuccess('Görev başarıyla oluşturuldu!')
      
      // Formu temizle
      setTitle('')
      setDescription('')
      setType('STANDART_GOREV')
      setRepetition('TEK_SEFERLIK')
      setHasCustomDuration(false)
      setDurationMinutes('')
      setAssignedTo('')
      setStaffSearchQuery('')
      setTypeSearchQuery('')
      setIsTemplate(false)

      // 2 saniye sonra yönlendir veya formu temizle
      setTimeout(() => {
        setSuccess('')
        // İsteğe bağlı: router.push('/panel/yonetici')
      }, 2000)

    } catch (err: any) {
      setError(err.message || 'Görev oluşturulurken bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RouteGuard requiredRoles={['MANAGER', 'SUPERVIZOR']}>
      <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Yeni Görev Oluştur</h1>
              <p className="text-sm text-gray-500 mt-1">Personellere görev atayın ve yönetin</p>
            </div>
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          {/* 1. SIRA: Personel Seçimi (En Üstte) */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Personel Seçimi <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
              <input
                ref={staffInputRef}
                type="text"
                value={selectedStaff ? selectedStaff.fullName : staffSearchQuery}
                onChange={(e) => {
                  setStaffSearchQuery(e.target.value)
                  setShowStaffDropdown(true)
                  if (assignedTo) {
                    setAssignedTo('')
                  }
                }}
                onFocus={() => {
                  if (!selectedStaff) {
                    setShowStaffDropdown(true)
                  }
                }}
                placeholder="Personel ara"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
              {selectedStaff && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setAssignedTo('')
                    setStaffSearchQuery('')
                    staffInputRef.current?.focus()
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Personel Dropdown */}
            {showStaffDropdown && (staffSearchQuery || !selectedStaff) && (
              <div
                ref={staffDropdownRef}
                className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
              >
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    Personel bulunamadı
                  </div>
                ) : (
                  filteredStaff.map((staff) => (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => handleStaffSelect(staff)}
                      className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                        assignedTo === staff.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{staff.fullName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{staff.role} • @{staff.username}</p>
                        </div>
                        {assignedTo === staff.id && (
                          <Check className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedStaff && (
              <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {selectedStaff.fullName} - Seçildi
              </p>
            )}
          </div>

          {/* 2. SIRA: Görev Türü (Combobox) */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Görev Türü <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
              <input
                ref={typeInputRef}
                type="text"
                value={selectedType ? selectedType.label : typeSearchQuery}
                onChange={(e) => {
                  setTypeSearchQuery(e.target.value)
                  setShowTypeDropdown(true)
                  // Eğer yazıyorsa seçimi temizle
                  if (type) {
                    setType('STANDART_GOREV' as any)
                  }
                }}
                onFocus={() => setShowTypeDropdown(true)}
                placeholder="Görev türü seçin veya ara..."
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer"
                required
              />
              {selectedType && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setType('STANDART_GOREV' as any)
                    setTypeSearchQuery('')
                    typeInputRef.current?.focus()
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Görev Türü Dropdown */}
            {showTypeDropdown && (
              <div
                ref={typeDropdownRef}
                className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg"
              >
                {filteredTaskTypes.length === 0 ? (
                  <div className="px-4 py-4 text-center text-gray-500 text-sm">
                    Sonuç bulunamadı
                  </div>
                ) : (
                  filteredTaskTypes.map((taskType) => (
                    <button
                      key={taskType.value}
                      type="button"
                      onClick={() => handleTypeSelect(taskType)}
                      className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                        type === taskType.value ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{taskType.label}</span>
                        {type === taskType.value && (
                          <Check className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedType && (
              <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {selectedType.label} - Seçildi
              </p>
            )}
          </div>

          {/* 3. SIRA: Görev Adı */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Görevin Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setShowSuggestions(e.target.value.length === 0 && titleInputFocused)
              }}
              onFocus={() => {
                setTitleInputFocused(true)
                setShowSuggestions(true)
              }}
              onBlur={() => {
                // Dropdown'a tıklanırsa blur olmasın
                setTimeout(() => {
                  setTitleInputFocused(false)
                  setShowSuggestions(false)
                }, 200)
              }}
              placeholder={selectedStaff ? `${selectedStaff.role} için görev adı...` : 'Görev adı girin...'}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
            
            {/* Görev Önerileri Dropdown */}
            {showSuggestions && title.length === 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-600">
                    {selectedStaff ? `${selectedStaff.fullName} için öneriler` : 'Önerilen görevler'}
                  </p>
                </div>
                {getTaskSuggestions().map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setTitle(suggestion)
                      setShowSuggestions(false)
                      setTitleInputFocused(false)
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <span className="font-medium text-gray-900">{suggestion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Açıklama */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Açıklama (Opsiyonel)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Görev detaylarını yazın..."
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* Tekrar Tipi */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Görevin Tekrarı <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'TEK_SEFERLIK', label: 'Tek Seferlik', icon: Calendar },
                { value: 'GUNLUK', label: 'Her Gün', icon: Clock },
                { value: 'HAFTALIK', label: 'Haftalık', icon: Calendar }
              ].map((rep) => {
                const Icon = rep.icon
                return (
                  <button
                    key={rep.value}
                    type="button"
                    onClick={() => setRepetition(rep.value as any)}
                    className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                      repetition === rep.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{rep.label}</span>
                  </button>
                )
              })}
            </div>
            {repetition !== 'TEK_SEFERLIK' && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  {repetition === 'GUNLUK' 
                    ? 'Bu görev her sabah 08:00\'de otomatik olarak personelin ekranına düşecek.'
                    : 'Bu görev atandığı günün haftalık tekrarında otomatik olarak oluşturulacak.'}
                </p>
              </div>
            )}
          </div>

          {/* Süre Ayarı */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Süre Ayarı
            </label>
            <div className="flex items-center gap-4 mb-3">
              <span className="text-sm text-gray-600">Göreve süre eklemek ister misiniz?</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setHasCustomDuration(false)
                    setDurationMinutes('')
                  }}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    !hasCustomDuration
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Hayır
                </button>
                <button
                  type="button"
                  onClick={() => setHasCustomDuration(true)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    hasCustomDuration
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Evet
                </button>
              </div>
            </div>
            {hasCustomDuration && (
              <div>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="Dakika cinsinden süre (örn: 45)"
                  min="1"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required={hasCustomDuration}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Personel bu süre içinde görevi tamamlamalıdır
                </p>
              </div>
            )}
            {!hasCustomDuration && (
              <p className="text-sm text-gray-500">
                Personelin mesai bitiş saatine kadar süresi olacak
              </p>
            )}
          </div>

          {/* Şablon Görev */}
          {repetition !== 'TEK_SEFERLIK' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="isTemplate"
                  checked={isTemplate}
                  onChange={(e) => setIsTemplate(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <label htmlFor="isTemplate" className="block text-sm font-semibold text-gray-900 mb-1">
                    Şablon Görev Oluştur
                  </label>
                  <p className="text-xs text-gray-600">
                    Bu görev şablon olarak kaydedilecek. Her gün/hafta otomatik olarak yeni bir kopyası oluşturulacak.
                    Şablon görevler personelin ekranına düşmez, sadece sistem tarafından kopyalanmak için kullanılır.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Oluşturuluyor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Görevi Oluştur</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              İptal
            </button>
          </div>
        </form>
      </div>
    </div>
    </RouteGuard>
  )
}
