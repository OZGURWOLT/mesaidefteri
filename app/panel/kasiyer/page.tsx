'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { CreditCard, Package, CheckCircle2, Camera, ArrowLeft, Send, Loader2, AlertCircle, CalendarCheck, Plus, X, UserCheck, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import LogoutButton from '@/components/auth/LogoutButton'
import ImageUploader from '@/components/ui/ImageUploader'
import Modal from '@/components/ui/Modal'

type TabType = 'kasa' | 'reyon'

interface KasaForm {
  photos: string[]
  kasaAcildi: boolean
  zRaporuAlindi: boolean
}

interface ReyonForm {
  reyon: string
  description: string
  photos: string[]
}

interface LeaveRequest {
  id: string
  startDate: string
  endDate: string
  type: 'annual' | 'health' | 'excuse'
  description: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
}

export default function KasiyerPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<TabType>('kasa')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  
  // Vardiya ve izin sistemi
  const [isShiftActive, setIsShiftActive] = useState(false)
  const [shiftStartTime, setShiftStartTime] = useState<string | null>(null)
  const [todayShift, setTodayShift] = useState({ start: '08:00', end: '18:00' })
  const [weeklyWorkHours, setWeeklyWorkHours] = useState(40)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [leaveForm, setLeaveForm] = useState({
    startDate: '',
    endDate: '',
    type: 'annual' as 'annual' | 'health' | 'excuse',
    description: ''
  })
  const [showRejectedNotification, setShowRejectedNotification] = useState(false)
  const [loadingShift, setLoadingShift] = useState(true)
  
  // Yönetici bilgisi
  const manager = { name: 'İslim KILIÇ', role: 'Yönetici' }
  
  // Günün tarihi
  const today = new Date()
  const formattedDate = today.toLocaleDateString('tr-TR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  const [kasaForm, setKasaForm] = useState<KasaForm>({
    photos: [],
    kasaAcildi: false,
    zRaporuAlindi: false
  })

  const [reyonForm, setReyonForm] = useState<ReyonForm>({
    reyon: '',
    description: '',
    photos: []
  })

  const reyonOptions = [
    { value: 'İçecek', label: 'İçecek' },
    { value: 'Temizlik', label: 'Temizlik' },
    { value: 'Gıda', label: 'Gıda' },
    { value: 'Şarküteri', label: 'Şarküteri' },
    { value: 'Manav', label: 'Manav' },
    { value: 'Kahvaltılık', label: 'Kahvaltılık' }
  ]
  
  // Bugünkü vardiyayı ve izin taleplerini çek
  useEffect(() => {
    const fetchShiftAndLeaves = async () => {
      if (!session?.user?.id) return

      try {
        setLoadingShift(true)
        
        const shiftResponse = await fetch(`/api/shifts/current?userId=${session.user.id}`)
        if (shiftResponse.ok) {
          const shiftData = await shiftResponse.json()
          if (shiftData.shift) {
            setTodayShift({ start: shiftData.shift.startTime || '08:00', end: shiftData.shift.endTime || '18:00' })
            setWeeklyWorkHours(shiftData.shift.weeklyHours || 40)
            setIsShiftActive(shiftData.shift.isActive || false)
            if (shiftData.shift.actualStart) {
              const startTime = new Date(shiftData.shift.actualStart)
              setShiftStartTime(`${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`)
            }
          }
        }

        const leaveResponse = await fetch(`/api/leave-requests?userId=${session.user.id}`)
        if (leaveResponse.ok) {
          const leaveData = await leaveResponse.json()
          setLeaveRequests(leaveData.leaveRequests || [])
          
          const rejectedRequest = leaveData.leaveRequests?.find((lr: any) => 
            lr.status === 'rejected' && !lr.reviewedAt
          )
          if (rejectedRequest) {
            setShowRejectedNotification(true)
          }
        }
      } catch (error) {
        console.error('Error fetching shift and leaves:', error)
      } finally {
        setLoadingShift(false)
      }
    }

    if (session?.user?.id) {
      fetchShiftAndLeaves()
      const interval = setInterval(fetchShiftAndLeaves, 30000)
      return () => clearInterval(interval)
    }
  }, [session])
  
  // Mesai toggle
  const toggleShift = async () => {
    if (!session?.user?.id) return

    const newShiftState = !isShiftActive
    const action = newShiftState ? 'start' : 'end'

    try {
      const response = await fetch('/api/shifts/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsShiftActive(newShiftState)
        if (newShiftState) {
          const now = new Date()
          setShiftStartTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
        } else {
          setShiftStartTime(null)
        }
      } else {
        alert(data.error || 'Mesai işlemi sırasında bir hata oluştu')
      }
    } catch (error) {
      console.error('Error toggling shift:', error)
      alert('Mesai işlemi sırasında bir hata oluştu')
    }
  }

  // İzin talebi oluşturma
  const handleCreateLeaveRequest = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.description) {
      alert('Lütfen tüm alanları doldurun')
      return
    }

    if (!session?.user?.id) {
      alert('Kullanıcı bilgisi bulunamadı')
      return
    }

    try {
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: leaveForm.startDate,
          endDate: leaveForm.endDate,
          type: leaveForm.type,
          description: leaveForm.description
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const leaveResponse = await fetch(`/api/leave-requests?userId=${session.user.id}`)
        if (leaveResponse.ok) {
          const leaveData = await leaveResponse.json()
          setLeaveRequests(leaveData.leaveRequests || [])
        }
        
        setLeaveForm({ startDate: '', endDate: '', type: 'annual', description: '' })
        setIsLeaveModalOpen(false)
        alert('İzin talebiniz yöneticiye gönderildi. Onay bekleniyor.')
      } else {
        alert(data.error || 'İzin talebi oluşturulurken bir hata oluştu')
      }
    } catch (error) {
      console.error('Error creating leave request:', error)
      alert('İzin talebi oluşturulurken bir hata oluştu')
    }
  }

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'annual': return 'Yıllık İzin'
      case 'health': return 'Sağlık İzni'
      case 'excuse': return 'Mazeret İzni'
      default: return type
    }
  }

  const getLeaveStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-300">Beklemede</span>
      case 'approved':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 border border-green-300">Onaylandı</span>
      case 'rejected':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-300">Reddedildi</span>
      default:
        return null
    }
  }

  const handleKasaSubmit = async () => {
    if (kasaForm.photos.length === 0 && !kasaForm.kasaAcildi && !kasaForm.zRaporuAlindi) {
      setError('Lütfen en az bir işlem seçin veya fotoğraf ekleyin')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const description = [
        kasaForm.kasaAcildi ? 'Kasa açılışı yapıldı' : '',
        kasaForm.zRaporuAlindi ? 'Z raporu alındı' : '',
        kasaForm.photos.length > 0 ? `${kasaForm.photos.length} fotoğraf eklendi` : ''
      ].filter(Boolean).join(', ')

      const response = await fetch('/api/tasks/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Kasa İşlemleri',
          description,
          taskType: 'KASIYER_GOREV:Kasa',
          photos: kasaForm.photos
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Kasa işlemleri başarıyla gönderildi!')
        setKasaForm({ photos: [], kasaAcildi: false, zRaporuAlindi: false })
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Görev gönderilirken bir hata oluştu')
      }
    } catch (error) {
      console.error('Error submitting task:', error)
      setError('Görev gönderilirken bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReyonSubmit = async () => {
    if (!reyonForm.reyon) {
      setError('Lütfen reyon seçin')
      return
    }

    if (!reyonForm.description.trim()) {
      setError('Lütfen yapılan işlemin açıklamasını girin')
      return
    }

    if (reyonForm.photos.length === 0) {
      setError('Lütfen kanıt fotoğrafı ekleyin')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/tasks/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Reyon Faaliyeti - ${reyonForm.reyon}`,
          description: reyonForm.description,
          taskType: `KASIYER_GOREV:Reyon:${reyonForm.reyon}`,
          photos: reyonForm.photos
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Reyon faaliyeti başarıyla gönderildi!')
        setReyonForm({ reyon: '', description: '', photos: [] })
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Görev gönderilirken bir hata oluştu')
      }
    } catch (error) {
      console.error('Error submitting task:', error)
      setError('Görev gönderilirken bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/panel/supervizor')}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                  <h1 className="text-xl font-bold text-gray-800">Kasiyer Paneli</h1>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 ml-12">{formattedDate}</p>
            </div>
            
            {/* Mesai Kartı */}
            <div className={`rounded-2xl px-4 py-2.5 transition-all duration-300 ${
              isShiftActive
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30'
                : 'bg-gradient-to-r from-red-400 to-red-500 text-white shadow-md'
            }`}>
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-xs font-medium opacity-90">Mesai</span>
                  <span className="text-sm font-bold">
                    {isShiftActive ? 'Açık' : 'Kapalı'}
                  </span>
                  {isShiftActive && shiftStartTime && (
                    <span className="text-[10px] opacity-80 mt-0.5">Başladı: {shiftStartTime}</span>
                  )}
                </div>
                {isShiftActive && shiftStartTime && (
                  <div className="h-8 w-px bg-white/30"></div>
                )}
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium opacity-80">Haftalık</span>
                  <span className="text-xs font-semibold">{weeklyWorkHours} saat</span>
                </div>
                <button
                  onClick={toggleShift}
                  className={`ml-2 relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 touch-manipulation ${
                    isShiftActive
                      ? 'bg-white/20 hover:bg-white/30'
                      : 'bg-white/20 hover:bg-white/30'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                      isShiftActive ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">
                {session?.user?.name || 'Kasiyer'}
              </span>
              <LogoutButton variant="icon" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Reddedilme Bildirimi */}
      {showRejectedNotification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-50 border-2 border-red-300 rounded-2xl p-4 shadow-xl max-w-sm mx-4 animate-pulse">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1">İzin Talebi Reddedildi</h4>
              <p className="text-sm text-red-700">Yönetici tarafından reddedildi.</p>
            </div>
            <button
              onClick={() => setShowRejectedNotification(false)}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

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

      {/* Tabs */}
      <div className="px-4 pt-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('kasa')}
              className={`flex-1 px-4 py-3 text-center font-semibold transition-colors ${
                activeTab === 'kasa'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span>Kasa İşlemleri</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('reyon')}
              className={`flex-1 px-4 py-3 text-center font-semibold transition-colors border-l border-gray-200 ${
                activeTab === 'reyon'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Package className="w-4 h-4" />
                <span>Reyon Faaliyetleri</span>
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'kasa' ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Kasa İşlemleri</h3>
                  
                  {/* Checkbox Options */}
                  <div className="space-y-3 mb-6">
                    <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={kasaForm.kasaAcildi}
                        onChange={(e) => setKasaForm({ ...kasaForm, kasaAcildi: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Kasa Açılışı Yapıldı</span>
                    </label>

                    <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={kasaForm.zRaporuAlindi}
                        onChange={(e) => setKasaForm({ ...kasaForm, zRaporuAlindi: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Z Raporu Alındı</span>
                    </label>
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Camera className="w-4 h-4 inline mr-1" />
                      Kasa Temizliği ve Çekmece Düzeni Fotoğrafları
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Kasa temizliği ve çekmece düzeni için fotoğraf ekleyin (Opsiyonel)
                    </p>
                    <ImageUploader
                      value={kasaForm.photos}
                      onChange={(photos) => setKasaForm({ ...kasaForm, photos })}
                      maxImages={5}
                      folder="mesaidefteri/kasiyer/kasa"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleKasaSubmit}
                    disabled={submitting || (kasaForm.photos.length === 0 && !kasaForm.kasaAcildi && !kasaForm.zRaporuAlindi)}
                    className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Gönderiliyor...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Kasa İşlemlerini Gönder</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Reyon Faaliyetleri</h3>
                  
                  {/* Reyon Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Sorumlu Reyon <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={reyonForm.reyon}
                      onChange={(e) => setReyonForm({ ...reyonForm, reyon: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                      required
                    >
                      <option value="">Reyon Seçin</option>
                      {reyonOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Yapılan İşlem Açıklaması <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={reyonForm.description}
                      onChange={(e) => setReyonForm({ ...reyonForm, description: e.target.value })}
                      placeholder="Örn: Reyon düzenlendi, eksik ürünler tamamlandı, fiyat etiketleri kontrol edildi..."
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm resize-none"
                      required
                    />
                  </div>

                  {/* Photo Upload */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Camera className="w-4 h-4 inline mr-1" />
                      Kanıt Fotoğrafları <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Yapılan işin kanıtı olarak fotoğraf ekleyin (Zorunlu)
                    </p>
                    <ImageUploader
                      value={reyonForm.photos}
                      onChange={(photos) => setReyonForm({ ...reyonForm, photos })}
                      maxImages={10}
                      folder="mesaidefteri/kasiyer/reyon"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleReyonSubmit}
                    disabled={submitting || !reyonForm.reyon || !reyonForm.description.trim() || reyonForm.photos.length === 0}
                    className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Gönderiliyor...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Reyon Faaliyetini Gönder</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* İzin Talebi Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-purple-600" />
                İzin Talebi Oluştur
              </h3>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCreateLeaveRequest(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İzin Başlangıç
                </label>
                <input
                  type="date"
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İzin Bitiş
                </label>
                <input
                  type="date"
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                  required
                  min={leaveForm.startDate}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İzin Türü
                </label>
                <select
                  value={leaveForm.type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value as 'annual' | 'health' | 'excuse' })}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="annual">Yıllık İzin</option>
                  <option value="health">Sağlık İzni</option>
                  <option value="excuse">Mazeret İzni</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Açıklama
                </label>
                <textarea
                  value={leaveForm.description}
                  onChange={(e) => setLeaveForm({ ...leaveForm, description: e.target.value })}
                  required
                  rows={4}
                  placeholder="İzin talebinizin açıklamasını yazın..."
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
