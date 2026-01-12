'use client'
export const dynamic = 'force-dynamic'

import { useState, useMemo, useEffect } from 'react'
import { Clock, Camera, History, User, List, ArrowLeft, MapPin, Radio, ArrowRight, BarChart3, FileText, CheckCircle2, AlertCircle, TrendingUp, Bell, CalendarCheck, UserCheck, Send, X, Plus, CheckCircle, XCircle, ChevronRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import LogoutButton from '@/components/auth/LogoutButton'
import Modal from '@/components/ui/Modal'

interface Task {
  id: string
  title: string
  description?: string
  type: 'FIYAT_ARASTIRMASI' | 'STANDART_GOREV' | 'urgent' | 'routine' // Eski format uyumluluğu için
  priority?: 'high' | 'normal'
  time?: string
  deadline?: string
  location?: string
  completed: boolean
  completedAt?: string
  routePath?: string
  status?: string
  hasCustomDuration?: boolean
  durationMinutes?: number
  assignedAt?: string
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

interface Notification {
  id: string
  userId: string
  taskId?: string
  title: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  isRead: boolean
  createdAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [todayShift, setTodayShift] = useState({ start: '08:00', end: '18:00' })
  const [weeklyWorkHours, setWeeklyWorkHours] = useState(40)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [showRejectedNotification, setShowRejectedNotification] = useState(false)
  const [leaveForm, setLeaveForm] = useState({
    startDate: '',
    endDate: '',
    type: 'annual' as 'annual' | 'health' | 'excuse',
    description: ''
  })
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingShift, setLoadingShift] = useState(true)
  
  const { data: session } = useSession()
  const currentUser = session?.user
  
  // Yönetici bilgisi (API'den çekilecek, şimdilik mock)
  const manager = { name: 'İslim KILIÇ', role: 'Yönetici' }

  // Bugünkü vardiyayı ve izin taleplerini çek
  useEffect(() => {
    const fetchShiftAndLeaves = async () => {
      if (!currentUser?.id) return

      try {
        setLoadingShift(true)
        
        // Bugünkü vardiyayı çek
        const shiftResponse = await fetch(`/api/shifts/current?userId=${currentUser.id}`)
        if (shiftResponse.ok) {
          const shiftData = await shiftResponse.json()
          if (shiftData.shift) {
            setTodayShift({ start: shiftData.shift.startTime || '08:00', end: shiftData.shift.endTime || '18:00' })
            setWeeklyWorkHours(shiftData.shift.weeklyHours || 40)
          }
        }

        // İzin taleplerini çek
        const leaveResponse = await fetch(`/api/leave-requests?userId=${currentUser.id}`)
        if (leaveResponse.ok) {
          const leaveData = await leaveResponse.json()
          setLeaveRequests(leaveData.leaveRequests || [])
          
          // Reddedilme bildirimi varsa göster
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

    if (currentUser?.id) {
      fetchShiftAndLeaves()
      const interval = setInterval(fetchShiftAndLeaves, 30000)
      return () => clearInterval(interval)
    }
  }, [currentUser?.id])

  // Bildirimleri çek ve anlık güncelle
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!currentUser?.id) return

      try {
        const response = await fetch(`/api/notifications?userId=${currentUser.id}`)
        if (response.ok) {
          const data = await response.json()
          setNotifications(data.notifications || [])
        }
      } catch (error) {
        console.error('Error fetching notifications:', error)
      }
    }

    if (currentUser?.id) {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 5000)
      return () => clearInterval(interval)
    }
  }, [currentUser?.id])

  // Bildirimi okundu olarak işaretle
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      })

      if (response.ok) {
        setNotifications(prev => prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        ))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }
  
  const [tasks, setTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [activeTab, setActiveTab] = useState<'tasks' | 'history' | 'profile'>('tasks')

  // Görevleri API'den yükle
  useEffect(() => {
    const fetchTasks = async () => {
      if (!currentUser?.id) return

      try {
        setLoadingTasks(true)
        const response = await fetch(`/api/tasks/assigned?userId=${currentUser.id}`)
        if (!response.ok) throw new Error('Görevler yüklenemedi')
        const data = await response.json()
        
        // API'den gelen görevleri formatla
        const formattedTasks: Task[] = (data.tasks || []).map((task: any) => {
          // Süre hesaplama
          let deadline: string | undefined
          if (task.hasCustomDuration && task.durationMinutes && task.assignedAt) {
            const assignedTime = new Date(task.assignedAt)
            const deadlineTime = new Date(assignedTime.getTime() + task.durationMinutes * 60000)
            deadline = `${deadlineTime.getHours().toString().padStart(2, '0')}:${deadlineTime.getMinutes().toString().padStart(2, '0')}`
          } else if (todayShift.end) {
            deadline = todayShift.end
          }

          return {
            id: task.id,
            title: task.title,
            description: task.description || '',
            type: task.type || 'STANDART_GOREV',
            priority: 'normal',
            deadline,
            completed: task.status === 'ONAYLANDI' || task.status === 'completed',
            completedAt: task.status === 'ONAYLANDI' ? task.submittedAt : undefined,
            routePath: `/panel/gorev/${task.id}`, // Görev detay sayfasına yönlendir
            status: task.status,
            hasCustomDuration: task.hasCustomDuration,
            durationMinutes: task.durationMinutes,
            assignedAt: task.assignedAt
          }
        })

        setTasks(formattedTasks)
      } catch (err: any) {
        console.error('Error fetching tasks:', err)
        setTasks([]) // Hata durumunda boş liste
      } finally {
        setLoadingTasks(false)
      }
    }

    if (currentUser?.id) {
      fetchTasks()
      // Her 30 saniyede bir güncelle
      const interval = setInterval(fetchTasks, 30000)
      return () => clearInterval(interval)
    }
  }, [currentUser?.id, todayShift.end])

  // Yönetici notu/duyuru
  const managerNote = 'Bugün Saray Gross fiyatlarına öncelik verilsin.'

  // Günün tarihi
  const today = new Date()
  const formattedDate = today.toLocaleDateString('tr-TR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  const completeTask = (taskId: string) => {
    const now = new Date()
    const completedAt = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: true, completedAt } : task
    ))
  }

  // İstatistikler hesaplama
  const todayStats = useMemo(() => {
    const todayTasks = tasks.filter(task => task.time || task.deadline)
    const completed = tasks.filter(task => task.completed && task.completedAt)
    const pending = tasks.filter(task => !task.completed)
    
    // Haftalık performans puanı (örnek: %94)
    const weeklyPerformance = 94
    const weeklyPoints = 450

    return {
      total: todayTasks.length,
      completed: completed.length,
      pending: pending.length,
      performancePercentage: weeklyPerformance,
      performancePoints: weeklyPoints
    }
  }, [tasks])

  // Kalan süre hesaplama
  const getTimeRemaining = (deadline?: string): string | null => {
    if (!deadline) return null
    
    const now = new Date()
    const [deadlineHour, deadlineMinute] = deadline.split(':').map(Number)
    const deadlineTime = new Date()
    deadlineTime.setHours(deadlineHour, deadlineMinute, 0, 0)
    
    if (deadlineTime < now) {
      deadlineTime.setDate(deadlineTime.getDate() + 1)
    }
    
    const diffMs = deadlineTime.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 0) {
      return `${diffHours} saat ${diffMinutes > 0 ? `${diffMinutes} dakika` : ''} kaldı`
    } else if (diffMinutes > 0) {
      return `${diffMinutes} dakika kaldı`
    } else {
      return 'Süre dolmak üzere!'
    }
  }

  // İzin talebi oluşturma
  const handleCreateLeaveRequest = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.description) {
      alert('Lütfen tüm alanları doldurun')
      return
    }

    if (!currentUser?.id) {
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
        const leaveResponse = await fetch(`/api/leave-requests?userId=${currentUser.id}`)
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

  // Görevleri filtrele (yeni schema'ya göre)
  // BEKLIYOR veya pending durumundaki görevler bekleyen görevlerdir
  const allPendingTasks = useMemo(() => 
    tasks.filter(task => 
      !task.completed && 
      (task.status === 'BEKLIYOR' || task.status === 'pending' || task.status === 'in_progress')
    ), 
    [tasks]
  )
  const urgentTasks = useMemo(() => 
    allPendingTasks.filter(task => 
      task.hasCustomDuration && task.durationMinutes && task.durationMinutes < 60
    ), 
    [allPendingTasks]
  )
  const routineTasks = useMemo(() => 
    allPendingTasks.filter(task => !urgentTasks.includes(task)), 
    [allPendingTasks, urgentTasks]
  )

  // İzin türü etiketleri
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
      case 'approved':
        return <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Onaylandı</span>
      case 'rejected':
        return <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded-full">Reddedildi</span>
      default:
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">Beklemede</span>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Basitleştirilmiş */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Merhaba, {currentUser?.name || 'Kullanıcı'}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{formattedDate}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      {/* Reddedilme Bildirimi */}
      {showRejectedNotification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-50 border-2 border-red-300 rounded-xl p-4 shadow-xl max-w-sm mx-4">
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

      {/* İçerik Alanı */}
      <div className="px-4 py-6 pb-24">
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {/* Üst Blok: Vardiya ve Performans Kartı */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Vardiya Saati</p>
                    <p className="text-base font-bold text-gray-900">{todayShift.start} - {todayShift.end}</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-gray-200"></div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-medium">Performans</p>
                    <p className="text-base font-bold text-gray-900">%{todayStats.performancePercentage}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hızlı İşlemler Menüsü */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="flex flex-col items-center gap-1.5 flex-1 bg-white rounded-xl p-3 shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-xs font-medium text-gray-700">İzin Al</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className="flex flex-col items-center gap-1.5 flex-1 bg-white rounded-xl p-3 shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <History className="w-5 h-5 text-gray-600" />
                </div>
                <span className="text-xs font-medium text-gray-700">Geçmiş</span>
              </button>

              <div className="flex flex-col items-center gap-1.5 flex-1 bg-white rounded-xl p-3 shadow-sm border border-gray-200">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="text-xs font-medium text-gray-700">{manager.name}</span>
              </div>

              {notifications.filter(n => !n.isRead).length > 0 && (
                <button
                  onClick={() => {/* Bildirimler modalı açılabilir */}}
                  className="flex flex-col items-center gap-1.5 flex-1 bg-white rounded-xl p-3 shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all relative"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">Bildirimler</span>
                  <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                </button>
              )}
            </div>

            {/* Ana Blok: Bekleyen Görevler */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Bekleyen Görevler</h2>
              
              {loadingTasks ? (
                <div className="flex items-center justify-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">Görevler yükleniyor...</span>
                </div>
              ) : allPendingTasks.length > 0 ? (
                <div className="space-y-3">
                  {allPendingTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={completeTask}
                      getTimeRemaining={getTimeRemaining}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg font-semibold">Bekleyen görev bulunmuyor</p>
                  <p className="text-gray-400 text-sm mt-2">Tüm görevler tamamlandı veya henüz görev atanmadı</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setActiveTab('tasks')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h3 className="text-lg font-bold text-gray-800">Geçmiş Görevler</h3>
            </div>
            <div className="space-y-3">
              {tasks.filter(task => task.completed).map(task => (
                <div
                  key={task.id}
                  className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-800">{task.title}</h4>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                      {task.completedAt && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{task.completedAt} - Tamamlandı</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {tasks.filter(task => task.completed).length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Henüz tamamlanan görev yok</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <User className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">{currentUser?.name || 'Kullanıcı'}</h3>
              <p className="text-gray-500">Satınalma</p>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-500">E-posta</p>
                <p className="font-bold text-gray-800 mt-1">{currentUser?.username || 'N/A'}@mesaidefteri.com</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-500">Telefon</p>
                <p className="font-bold text-gray-800 mt-1">+90 533 131 01 63</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm">
                <p className="text-sm text-blue-600 font-medium">Haftalık Performans</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">%{todayStats.performancePercentage}</p>
                <p className="text-xs text-blue-500 mt-1">{todayStats.performancePoints} Puan</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* İzin Talebi Modal */}
      {isLeaveModalOpen && (
        <Modal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          title="İzin Talebi Oluştur"
          size="md"
        >
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
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İzin Türü
              </label>
              <select
                value={leaveForm.type}
                onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value as 'annual' | 'health' | 'excuse' })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder="İzin talebinizin sebebini açıklayın..."
              />
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Gönder
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Alt Navigasyon */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-around px-4 py-3">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'tasks'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-blue-500'
            }`}
          >
            <List className="w-6 h-6" />
            <span className="text-[10px] font-medium">Görevlerim</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'history'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-blue-500'
            }`}
          >
            <History className="w-6 h-6" />
            <span className="text-[10px] font-medium">Geçmiş</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'profile'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-blue-500'
            }`}
          >
            <User className="w-6 h-6" />
            <span className="text-[10px] font-medium">Profil</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Görev Kartı Bileşeni - Modern ve Odaklı
function TaskCard({ 
  task, 
  onComplete, 
  getTimeRemaining 
}: { 
  task: Task
  onComplete: (id: string) => void
  getTimeRemaining: (deadline?: string) => string | null
}) {
  const router = useRouter()

  const handleCardClick = () => {
    if (task.routePath) {
      router.push(task.routePath)
    }
  }

  // Görev türüne göre ikon seçimi
  const getTaskIcon = () => {
    if (task.type === 'FIYAT_ARASTIRMASI' || task.title.toLowerCase().includes('fiyat') || task.title.toLowerCase().includes('araştırma')) {
      return <BarChart3 className="w-5 h-5" />
    } else if (task.type === 'STANDART_GOREV' || task.title.toLowerCase().includes('faaliyet') || task.title.toLowerCase().includes('rapor')) {
      return <FileText className="w-5 h-5" />
    }
    return <List className="w-5 h-5" />
  }

  const timeRemaining = getTimeRemaining(task.deadline)
  const isUrgent = task.priority === 'high' || task.type === 'urgent' || (task.hasCustomDuration && task.durationMinutes && task.durationMinutes < 60)

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative overflow-hidden ${
        isUrgent ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-blue-500'
      }`}
    >
      {/* Kalan Süre Badge (Sağ Üst) */}
      {timeRemaining && (
        <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold ${
          timeRemaining.includes('dakika kaldı') || timeRemaining.includes('Süre dolmak')
            ? 'bg-red-100 text-red-700'
            : 'bg-orange-100 text-orange-700'
        }`}>
          {timeRemaining}
        </div>
      )}

      <div className="p-4 pr-20">
        {/* Görev Başlığı ve İkon */}
        <div className="flex items-start gap-3 mb-2">
          <div className={`p-2 rounded-lg flex-shrink-0 ${
            isUrgent ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
          }`}>
            {getTaskIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-base text-gray-900 mb-1">
              {task.title}
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              {task.description}
            </p>
          </div>
        </div>

        {/* Öncelik Badge */}
        {isUrgent && (
          <div className="flex items-center gap-2 mt-3">
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
              ACİL
            </span>
          </div>
        )}

        {/* Sağ Ok İkonu */}
        <div className="absolute bottom-4 right-4 text-gray-400">
          <ChevronRight className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
