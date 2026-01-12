'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Bike, Navigation, Package, MapPin, CheckCircle2, Camera, ArrowLeft, Send, Loader2, AlertCircle, Clock, Home, Building2, List, TrendingUp, CalendarCheck, Plus, X, UserCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import LogoutButton from '@/components/auth/LogoutButton'
import ImageUploader from '@/components/ui/ImageUploader'

type ModeType = 'waiting' | 'delivery' // waiting = Market İçi Görevler, delivery = Navigasyon ve Teslimat

interface DeliveryTask {
  id: string
  title: string
  customerName: string
  customerAddress: string
  deliveryAddress: string
  status: 'pending' | 'in_progress' | 'completed'
  createdAt: string
}

interface MarketTask {
  id: string
  title: string
  description: string
  type: 'reyon' | 'temizlik' | 'stok' | 'diger'
  priority: 'high' | 'normal'
  deadline?: string
  status: 'pending' | 'in_progress' | 'completed'
}

interface TaskSubmission {
  taskId: string
  description: string
  photos: string[]
  deliveryStatus?: 'delivered' | 'failed'
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

export default function KuryePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [mode, setMode] = useState<ModeType>('waiting')
  const [deliveryTasks, setDeliveryTasks] = useState<DeliveryTask[]>([])
  const [marketTasks, setMarketTasks] = useState<MarketTask[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [selectedTask, setSelectedTask] = useState<MarketTask | DeliveryTask | null>(null)
  const [submissionForm, setSubmissionForm] = useState<TaskSubmission>({
    taskId: '',
    description: '',
    photos: []
  })
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  
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

  // Konum takibi
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Konum hatası:', error)
        },
        { enableHighAccuracy: true, maximumAge: 10000 }
      )

      return () => navigator.geolocation.clearWatch(watchId)
    }
  }, [])
  
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

  // Görevleri yükle
  useEffect(() => {
    const fetchTasks = async () => {
      if (!session?.user?.id) return

      try {
        setLoading(true)
        
        // Teslimat görevlerini çek (TESLIMAT tipinde)
        const deliveryResponse = await fetch(`/api/tasks/assigned?userId=${session.user.id}&taskType=delivery`)
        if (deliveryResponse.ok) {
          const deliveryData = await deliveryResponse.json()
          const activeDeliveries = (deliveryData.tasks || []).filter((t: any) => {
            // Delivery task formatını kontrol et
            return t.status === 'pending' || t.status === 'in_progress'
          }).map((t: any) => ({
            id: t.id,
            title: t.title || 'Teslimat Görevi',
            customerName: t.customerName || 'Müşteri',
            customerAddress: t.customerAddress || '',
            deliveryAddress: t.deliveryAddress || t.description || 'Adres belirtilmemiş',
            status: t.status,
            createdAt: t.assignedAt || new Date().toISOString()
          }))
          setDeliveryTasks(activeDeliveries)
          
          // Aktif teslimat varsa delivery moduna geç
          if (activeDeliveries.length > 0) {
            setMode('delivery')
          }
        }

        // Market içi görevleri çek (TESLIMAT dışındaki görevler)
        const marketResponse = await fetch(`/api/tasks/assigned?userId=${session.user.id}&taskType=market`)
        if (marketResponse.ok) {
          const marketData = await marketResponse.json()
          const marketTasksParsed = (marketData.tasks || []).filter((t: any) => t.status === 'pending' || t.status === 'in_progress').map((t: any) => ({
            id: t.id,
            title: t.title || 'Market Görevi',
            description: t.description || '',
            type: t.type || 'diger',
            priority: t.priority || 'normal',
            deadline: t.deadline || null,
            status: t.status,
            assignedAt: t.assignedAt || new Date().toISOString()
          }))
          setMarketTasks(marketTasksParsed)
        }
      } catch (err) {
        console.error('Error fetching tasks:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
    
    // Her 30 saniyede bir görevleri yenile
    const interval = setInterval(fetchTasks, 30000)
    return () => clearInterval(interval)
  }, [session])

  // Görev türü ikonu
  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'reyon':
        return <Package className="w-5 h-5 text-blue-600" />
      case 'temizlik':
        return <Home className="w-5 h-5 text-green-600" />
      case 'stok':
        return <Building2 className="w-5 h-5 text-orange-600" />
      default:
        return <List className="w-5 h-5 text-gray-600" />
    }
  }

  // Market görevi gönder
  const handleMarketTaskSubmit = async (task: MarketTask) => {
    if (!submissionForm.description.trim()) {
      setError('Lütfen iş açıklaması girin')
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
          title: task.title,
          description: submissionForm.description,
          taskType: `MARKET_GOREV:${task.type}`,
          photos: submissionForm.photos,
          taskId: task.id
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Görev başarıyla gönderildi!')
        setMarketTasks(marketTasks.filter(t => t.id !== task.id))
        setSelectedTask(null)
        setSubmissionForm({ taskId: '', description: '', photos: [] })
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

  // Teslimat görevi tamamla
  const handleDeliveryComplete = async (task: DeliveryTask) => {
    if (!submissionForm.photos.length) {
      setError('Teslimat kanıtı için fotoğraf ekleyin')
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
          title: task.title,
          description: `Teslimat tamamlandı: ${task.customerName} - ${task.deliveryAddress}`,
          taskType: 'TESLIMAT',
          photos: submissionForm.photos,
          taskId: task.id
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Teslimat başarıyla tamamlandı!')
        setDeliveryTasks(deliveryTasks.filter(t => t.id !== task.id))
        
        // Tüm teslimatlar tamamlandıysa market moduna geç
        if (deliveryTasks.length === 1) {
          setMode('waiting')
        }
        
        setSelectedTask(null)
        setSubmissionForm({ taskId: '', description: '', photos: [] })
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Teslimat gönderilirken bir hata oluştu')
      }
    } catch (error) {
      console.error('Error completing delivery:', error)
      setError('Teslimat gönderilirken bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  // İstatistikler
  const stats = {
    totalDeliveries: deliveryTasks.length,
    totalMarketTasks: marketTasks.length,
    completedToday: 0 // TODO: API'den çek
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
                  <Bike className="w-6 h-6 text-blue-600" />
                  <h1 className="text-xl font-bold text-gray-800">Sahadaki Aktif Personel</h1>
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
              {currentLocation && (
                <div className="flex items-center gap-1 text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                  <MapPin className="w-3 h-3" />
                  <span>Konum aktif</span>
                </div>
              )}
              <span className="text-sm text-gray-600 font-medium">
                {session?.user?.name || 'Personel'}
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

      {/* Mode Indicator */}
      <div className="px-4 pt-4">
        <div className={`rounded-xl shadow-sm border-2 p-4 ${
          mode === 'delivery' 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {mode === 'delivery' ? (
                <>
                  <Navigation className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-blue-900">Navigasyon ve Teslimat Modu</h3>
                    <p className="text-sm text-blue-700">{deliveryTasks.length} aktif teslimat</p>
                  </div>
                </>
              ) : (
                <>
                  <Building2 className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-900">Market İçi Görevler Modu</h3>
                    <p className="text-sm text-green-700">Market içi görevleriniz</p>
                  </div>
                </>
              )}
            </div>
            {mode === 'delivery' && (
              <button
                onClick={() => {
                  if (deliveryTasks.length === 0) setMode('waiting')
                }}
                disabled={deliveryTasks.length > 0}
                className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Market Moduna Dön
              </button>
            )}
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
      <div className="px-4 py-6 space-y-6">
        {/* Vardiya Bilgisi ve İzin Talebi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 shadow-sm border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-blue-900">Bugünkü Vardiyanız</h4>
                  <p className="text-lg font-bold text-blue-700">{todayShift.start} - {todayShift.end}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-600 font-medium">Haftalık Toplam</p>
                <p className="text-lg font-bold text-blue-700">{weeklyWorkHours} saat</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-4 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            <span>İzin Talebi Oluştur</span>
          </button>
        </div>
        
        {/* Yönetici Bilgisi */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Yöneticim</p>
              <p className="text-sm font-bold text-gray-800">{manager.name}</p>
              <p className="text-[10px] text-gray-400">{manager.role}</p>
            </div>
          </div>
        </div>
        
        {/* İzin Talepleri Listesi */}
        {leaveRequests.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-blue-500" />
              İzin Taleplerim
            </h4>
            <div className="space-y-2">
              {leaveRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-3 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-sm transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-600">
                          {getLeaveTypeLabel(request.type)}
                        </span>
                        {getLeaveStatusBadge(request.status)}
                      </div>
                      <p className="text-sm font-medium text-gray-800">
                        {new Date(request.startDate).toLocaleDateString('tr-TR')} - {new Date(request.endDate).toLocaleDateString('tr-TR')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{request.description}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Gönderildi: {new Date(request.submittedAt).toLocaleDateString('tr-TR')} {new Date(request.submittedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* İstatistik Kartları */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalDeliveries}</div>
            <div className="text-xs text-gray-500 mt-1">Teslimat</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-green-600">{stats.totalMarketTasks}</div>
            <div className="text-xs text-gray-500 mt-1">Market Görevi</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.completedToday}</div>
            <div className="text-xs text-gray-500 mt-1">Tamamlanan</div>
          </div>
        </div>

        {/* Delivery Mode - Teslimat Görevleri */}
        {mode === 'delivery' && deliveryTasks.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-blue-50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-600" />
                Aktif Teslimatlar
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {deliveryTasks.map((task) => (
                <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">{task.title}</h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Müşteri:</span>
                          <span>{task.customerName}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                          <span>{task.deliveryAddress}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedTask(task)
                        setSubmissionForm({ taskId: task.id, description: '', photos: [] })
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold whitespace-nowrap"
                    >
                      Teslim Et
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waiting Mode - Market İçi Görevler */}
        {mode === 'waiting' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-green-50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-green-600" />
                Market İçi Görevler
              </h2>
            </div>

            {marketTasks.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium mb-2">Henüz görev atanmamış</p>
                <p className="text-sm text-gray-400">Yöneticiden görev atandığında burada görünecek</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {marketTasks.map((task) => (
                  <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getTaskTypeIcon(task.type)}
                          <h3 className="font-semibold text-gray-900">{task.title}</h3>
                          {task.priority === 'high' && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded">
                              Acil
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        {task.deadline && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>Bitiş: {task.deadline}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTask(task)
                          setSubmissionForm({ taskId: task.id, description: '', photos: [] })
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold whitespace-nowrap"
                      >
                        Görevi Gönder
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Submission Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {mode === 'delivery' ? 'Teslimat Tamamla' : 'Görevi Gönder'}
              </h3>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{selectedTask.title}</p>
                {'customerName' in selectedTask && (
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedTask.customerName} - {selectedTask.deliveryAddress}
                  </p>
                )}
              </div>

              {mode === 'delivery' ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Camera className="w-4 h-4 inline mr-1" />
                      Teslimat Kanıt Fotoğrafı <span className="text-red-500">*</span>
                    </label>
                    <ImageUploader
                      value={submissionForm.photos}
                      onChange={(photos) => setSubmissionForm({ ...submissionForm, photos })}
                      maxImages={3}
                      folder="mesaidefteri/kurye/teslimat"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedTask(null)
                        setSubmissionForm({ taskId: '', description: '', photos: [] })
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      İptal
                    </button>
                    <button
                      onClick={() => handleDeliveryComplete(selectedTask as DeliveryTask)}
                      disabled={submitting || submissionForm.photos.length === 0}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Gönderiliyor...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Teslim Et</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      İş Açıklaması <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={submissionForm.description}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, description: e.target.value })}
                      placeholder="Yaptığınız işi açıklayın..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm resize-none"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Camera className="w-4 h-4 inline mr-1" />
                      Kanıt Fotoğrafları
                    </label>
                    <ImageUploader
                      value={submissionForm.photos}
                      onChange={(photos) => setSubmissionForm({ ...submissionForm, photos })}
                      maxImages={10}
                      folder="mesaidefteri/kurye/market"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedTask(null)
                        setSubmissionForm({ taskId: '', description: '', photos: [] })
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      İptal
                    </button>
                    <button
                      onClick={() => handleMarketTaskSubmit(selectedTask as MarketTask)}
                      disabled={submitting || !submissionForm.description.trim()}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Gönderiliyor...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Gönder</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
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
