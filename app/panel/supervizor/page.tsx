'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Building2,
  Users,
  AlertCircle,
  Activity,
  Shield,
  Clock,
  TrendingDown,
  AlertTriangle,
  Settings,
  FileText,
  Eye,
  CheckCircle2,
  XCircle,
  Zap,
  MapPin,
  Calendar,
  Filter,
  Save,
  RefreshCw,
  UserCog,
  CalendarCheck,
  Search,
  Loader2,
  User as UserIcon,
  MessageSquare,
  Smartphone
} from 'lucide-react'
import { Branch, ManagerAudit, SystemLog, GlobalSettings, mockSystemLogs } from '../yonetici/types'
import LogoutButton from '@/components/auth/LogoutButton'
import RouteGuard from '@/components/auth/RouteGuard'

export default function SupervizorDashboard() {
  const router = useRouter()
  const { data: session } = useSession()
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [settings, setSettings] = useState<GlobalSettings>({
    locationTolerance: 100,
    delayAlarmMinutes: 15,
    penaltyPoints: {
      minor: 5,
      moderate: 15,
      major: 30
    },
    netgsmOtpEnabled: false,
    netgsmAlertEnabled: false,
    netgsmAlertMessage: ''
  })
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [logFilter, setLogFilter] = useState<string>('all')
  const [loadingLogs, setLoadingLogs] = useState(true)
  
  // Vardiya ve İzin Durumu
  const [shifts, setShifts] = useState<any[]>([])
  const [leaveRequests, setLeaveRequests] = useState<any[]>([])
  const [loadingShifts, setLoadingShifts] = useState(true)
  const [shiftSearchQuery, setShiftSearchQuery] = useState('')
  const [leaveSearchQuery, setLeaveSearchQuery] = useState('')
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>('all')
  
  // Şube ve personel verileri
  const [branches, setBranches] = useState<Branch[]>([])
  const [loadingBranches, setLoadingBranches] = useState(true)
  const [mehmetcikStaff, setMehmetcikStaff] = useState<any[]>([])
  const [loadingStaff, setLoadingStaff] = useState(true)

  // Global ayarları yükle
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const data = await response.json()
          if (data.settings) {
            setSettings(data.settings)
          }
        }
      } catch (error) {
        console.error('Ayarlar yüklenirken hata:', error)
      }
    }
    fetchSettings()
  }, [])

  // Sistem loglarını yükle
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoadingLogs(true)
        const response = await fetch('/api/system/logs?limit=200')
        if (response.ok) {
          const data = await response.json()
          if (data.logs) {
            setLogs(data.logs)
          }
        }
      } catch (error) {
        console.error('Loglar yüklenirken hata:', error)
      } finally {
        setLoadingLogs(false)
      }
    }
    fetchLogs()
    
    // Her 30 saniyede bir güncelle
    const interval = setInterval(fetchLogs, 30000)
    return () => clearInterval(interval)
  }, [])

  // Şubeleri yükle
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setLoadingBranches(true)
        const response = await fetch('/api/branches')
        if (!response.ok) throw new Error('Şubeler yüklenemedi')
        const data = await response.json()
        setBranches(data.branches || [])
      } catch (err: any) {
        console.error('Error fetching branches:', err)
        setBranches([])
      } finally {
        setLoadingBranches(false)
      }
    }

    fetchBranches()
  }, [])

  // Mehmetçik Şubesi personellerini yükle
  useEffect(() => {
    const fetchMehmetcikStaff = async () => {
      try {
        setLoadingStaff(true)
        const mehmetcikBranch = branches.find(b => b.name === 'Mehmetçik Şubesi')
        
        if (!mehmetcikBranch) {
          setMehmetcikStaff([])
          setLoadingStaff(false)
          return
        }

        // BranchId ile filtrele - Tüm personelleri göster (filtreleme kaldırıldı)
        const response = await fetch(`/api/admin/staff?branchId=${mehmetcikBranch.id}`)
        if (!response.ok) throw new Error('Personel listesi yüklenemedi')
        const data = await response.json()
        
        // Tüm personelleri göster (filtreleme kaldırıldı)
        setMehmetcikStaff(data.staff || [])
      } catch (err: any) {
        console.error('Error fetching staff:', err)
        setMehmetcikStaff([])
      } finally {
        setLoadingStaff(false)
      }
    }

    if (branches.length > 0) {
      fetchMehmetcikStaff()
    }
  }, [branches])

  // Filtrelenmiş şube verileri
  const filteredBranches = useMemo(() => {
    if (selectedBranch === 'all') return branches
    return branches.filter(b => b.id === selectedBranch)
  }, [selectedBranch, branches])

  // Toplam istatistikler
  const totalStats = useMemo(() => {
    if (branches.length === 0) return { totalStaff: 0, criticalPending: 0, avgActiveRate: 0 }
    return {
      totalStaff: branches.reduce((sum, b) => sum + b.totalStaff, 0),
      criticalPending: branches.reduce((sum, b) => sum + b.criticalPending, 0),
      avgActiveRate: branches.length > 0 
        ? branches.reduce((sum, b) => sum + b.activeRate, 0) / branches.length 
        : 0
    }
  }, [branches])

  // Filtrelenmiş loglar
  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return logs
    return logs.filter(log => log.type === logFilter)
  }, [logs, logFilter])

  // Vardiya ve izin verilerini yükle
  useEffect(() => {
    const fetchShiftAndLeaveData = async () => {
      try {
        setLoadingShifts(true)
        
        // Tüm vardiyaları çek (süpervizör tüm vardiyaları görebilir)
        const shiftsResponse = await fetch('/api/shifts')
        if (shiftsResponse.ok) {
          const shiftsData = await shiftsResponse.json()
          setShifts(shiftsData.shifts || [])
        }

        // Tüm izin taleplerini çek (süpervizör tüm izinleri görebilir)
        const leavesResponse = await fetch('/api/leave-requests')
        if (leavesResponse.ok) {
          const leavesData = await leavesResponse.json()
          setLeaveRequests(leavesData.leaveRequests || [])
        }
      } catch (error) {
        console.error('Error fetching shift and leave data:', error)
      } finally {
        setLoadingShifts(false)
      }
    }

    fetchShiftAndLeaveData()
    
    // Her 30 saniyede bir güncelle
    const interval = setInterval(fetchShiftAndLeaveData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Filtrelenmiş vardiyalar
  const filteredShifts = useMemo(() => {
    let result = shifts
    if (shiftSearchQuery) {
      result = result.filter(shift => 
        shift.userName?.toLowerCase().includes(shiftSearchQuery.toLowerCase()) ||
        shift.userRole?.toLowerCase().includes(shiftSearchQuery.toLowerCase())
      )
    }
    return result
  }, [shifts, shiftSearchQuery])

  // Filtrelenmiş izin talepleri
  const filteredLeaves = useMemo(() => {
    let result = leaveRequests
    if (leaveSearchQuery) {
      result = result.filter(leave => 
        leave.userName?.toLowerCase().includes(leaveSearchQuery.toLowerCase()) ||
        leave.userRole?.toLowerCase().includes(leaveSearchQuery.toLowerCase())
      )
    }
    if (leaveStatusFilter !== 'all') {
      result = result.filter(leave => leave.status === leaveStatusFilter)
    }
    return result
  }, [leaveRequests, leaveSearchQuery, leaveStatusFilter])
  
  // Vardiya istatistikleri
  const shiftStats = useMemo(() => {
    const activeShifts = shifts.filter(s => s.isActive).length
    const todayShifts = shifts.filter(s => {
      const shiftDate = new Date(s.shiftDate)
      const today = new Date()
      return shiftDate.toDateString() === today.toDateString()
    }).length
    return { total: shifts.length, active: activeShifts, today: todayShifts }
  }, [shifts])
  
  // İzin istatistikleri
  const leaveStats = useMemo(() => {
    const pending = leaveRequests.filter(l => l.status === 'pending').length
    const approved = leaveRequests.filter(l => l.status === 'approved').length
    const rejected = leaveRequests.filter(l => l.status === 'rejected').length
    return { total: leaveRequests.length, pending, approved, rejected }
  }, [leaveRequests])

  const handleOverride = (taskId: string, action: 'approve' | 'reject') => {
    console.log(`Zorla ${action === 'approve' ? 'Onaylandı' : 'Reddedildi'}:`, taskId)
    alert(`Görev ${action === 'approve' ? 'zorla onaylandı' : 'zorla reddedildi'}!`)
    
    // Log ekle
    const newLog: SystemLog = {
      id: `l${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      type: 'supervisor_override',
      description: `Görev ${action === 'approve' ? 'zorla onaylandı' : 'zorla reddedildi'}`,
      taskId: taskId,
      branch: selectedBranch === 'all' ? 'Tüm Şubeler' : mockBranches.find(b => b.id === selectedBranch)?.name || '',
      details: { action, reason: 'Süpervizör müdahalesi' }
    }
    setLogs(prev => [newLog, ...prev])
  }


  // Konum Toleransı ve Gecikme Alarm kaydet
  const handleLocationDelaySave = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locationTolerance: settings.locationTolerance,
          delayAlarmMinutes: settings.delayAlarmMinutes,
          penaltyPoints: settings.penaltyPoints,
          netgsmOtpEnabled: settings.netgsmOtpEnabled,
          netgsmAlertEnabled: settings.netgsmAlertEnabled,
          netgsmAlertMessage: settings.netgsmAlertMessage
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        alert('Ayarlar kaydedilirken bir hata oluştu: ' + (errorData.error || 'Bilinmeyen hata'))
        return
      }

      const data = await response.json()
      
      // Güncellenmiş ayarları state'e kaydet
      if (data.settings) {
        setSettings(data.settings)
      }

      alert('Konum Toleransı ve Gecikme Alarm ayarları başarıyla kaydedildi!')
      
      // Log ekle
      const newLog: SystemLog = {
        id: `l${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        type: 'system_change',
        description: 'Konum Toleransı ve Gecikme Alarm ayarları güncellendi',
        branch: 'Tüm Şubeler',
        details: { locationTolerance: settings.locationTolerance, delayAlarmMinutes: settings.delayAlarmMinutes }
      }
      setLogs(prev => [newLog, ...prev])
    } catch (error: any) {
      console.error('Ayarlar kaydetme hatası:', error)
      alert('Ayarlar kaydedilirken bir hata oluştu: ' + error.message)
    }
  }

  // Ceza Puanı Baremleri kaydet
  const handlePenaltyPointsSave = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locationTolerance: settings.locationTolerance,
          delayAlarmMinutes: settings.delayAlarmMinutes,
          penaltyPoints: settings.penaltyPoints,
          netgsmOtpEnabled: settings.netgsmOtpEnabled,
          netgsmAlertEnabled: settings.netgsmAlertEnabled,
          netgsmAlertMessage: settings.netgsmAlertMessage
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        alert('Ayarlar kaydedilirken bir hata oluştu: ' + (errorData.error || 'Bilinmeyen hata'))
        return
      }

      const data = await response.json()
      
      // Güncellenmiş ayarları state'e kaydet
      if (data.settings) {
        setSettings(data.settings)
      }

      alert('Ceza Puanı Baremleri başarıyla kaydedildi!')
      
      // Log ekle
      const newLog: SystemLog = {
        id: `l${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        type: 'system_change',
        description: 'Ceza Puanı Baremleri güncellendi',
        branch: 'Tüm Şubeler',
        details: { penaltyPoints: settings.penaltyPoints }
      }
      setLogs(prev => [newLog, ...prev])
    } catch (error: any) {
      console.error('Ayarlar kaydetme hatası:', error)
      alert('Ayarlar kaydedilirken bir hata oluştu: ' + error.message)
    }
  }

  // NetGSM ayarları kaydet
  const handleNetGSMSave = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locationTolerance: settings.locationTolerance,
          delayAlarmMinutes: settings.delayAlarmMinutes,
          penaltyPoints: settings.penaltyPoints,
          netgsmOtpEnabled: settings.netgsmOtpEnabled,
          netgsmAlertEnabled: settings.netgsmAlertEnabled,
          netgsmAlertMessage: settings.netgsmAlertMessage
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        alert('Ayarlar kaydedilirken bir hata oluştu: ' + (errorData.error || 'Bilinmeyen hata'))
        return
      }

      const data = await response.json()
      
      // Güncellenmiş ayarları state'e kaydet
      if (data.settings) {
        setSettings(data.settings)
      }

      alert('NetGSM ayarları başarıyla kaydedildi!')
      
      // Log ekle
      const newLog: SystemLog = {
        id: `l${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        type: 'system_change',
        description: 'NetGSM ayarları güncellendi',
        branch: 'Tüm Şubeler',
        details: { 
          netgsmOtpEnabled: settings.netgsmOtpEnabled,
          netgsmAlertEnabled: settings.netgsmAlertEnabled,
          netgsmAlertMessage: settings.netgsmAlertMessage
        }
      }
      setLogs(prev => [newLog, ...prev])
    } catch (error: any) {
      console.error('Ayarlar kaydetme hatası:', error)
      alert('Ayarlar kaydedilirken bir hata oluştu: ' + error.message)
    }
  }

  const getLogTypeIcon = (type: SystemLog['type']) => {
    switch (type) {
      case 'supervisor_override':
        return <Zap className="w-3 h-3 text-yellow-500" />
      case 'location_violation':
        return <MapPin className="w-3 h-3 text-red-500" />
      case 'manager_approval':
      case 'task_approved':
        return <CheckCircle2 className="w-3 h-3 text-green-500" />
      case 'manager_rejection':
      case 'task_rejected':
        return <XCircle className="w-3 h-3 text-red-500" />
      case 'task_created':
      case 'task_assigned':
        return <FileText className="w-3 h-3 text-blue-500" />
      case 'task_completed':
      case 'task_submitted':
        return <CheckCircle2 className="w-3 h-3 text-green-500" />
      case 'system_change':
        return <Settings className="w-3 h-3 text-purple-500" />
      case 'user_created':
        return <UserCog className="w-3 h-3 text-green-500" />
      case 'user_updated':
        return <UserCog className="w-3 h-3 text-blue-500" />
      case 'user_deleted':
        return <UserCog className="w-3 h-3 text-red-500" />
      case 'shift_started':
        return <Clock className="w-3 h-3 text-green-500" />
      case 'shift_ended':
        return <Clock className="w-3 h-3 text-orange-500" />
      case 'login':
        return <Activity className="w-3 h-3 text-green-500" />
      case 'logout':
        return <Activity className="w-3 h-3 text-gray-500" />
      case 'leave_request_created':
      case 'leave_request_approved':
        return <CalendarCheck className="w-3 h-3 text-blue-500" />
      case 'leave_request_rejected':
        return <CalendarCheck className="w-3 h-3 text-red-500" />
      default:
        return <AlertCircle className="w-3 h-3 text-gray-500" />
    }
  }

  const getLogTypeColor = (type: SystemLog['type']) => {
    switch (type) {
      case 'supervisor_override':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'location_violation':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'manager_approval':
      case 'task_approved':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'manager_rejection':
      case 'task_rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'task_created':
      case 'task_assigned':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'task_completed':
      case 'task_submitted':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'system_change':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'user_created':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'user_updated':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'user_deleted':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'shift_started':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'shift_ended':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'login':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'logout':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      case 'leave_request_created':
      case 'leave_request_approved':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'leave_request_rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }


  return (
    <RouteGuard requiredRoles={['SUPERVIZOR']}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
        {/* Header - %35 küçültülmüş */}
        <header className="bg-gradient-to-r from-amber-900/30 via-yellow-900/20 to-amber-900/30 border-b border-amber-700/30 backdrop-blur-md sticky top-0 z-50 -mt-2">
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-amber-400">Süpervizör Komuta Merkezi</h1>
                <p className="text-[10px] text-amber-200/70">En Üst Yetki Seviyesi</p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Şube Seçici */}
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="bg-gray-800/50 border border-amber-700/50 rounded-lg px-3 py-1.5 text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-xs h-[32px]"
                  disabled={loadingBranches}
                >
                  <option value="all">Tüm Şubeler</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>

              {/* İzin Vardiya Yönetimi Butonu */}
              <button
                onClick={() => router.push('/panel/supervizor/vardiya-yonetimi')}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-xs min-w-[80px] h-[32px]"
                title="İzin Vardiya Yönetimi"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">İzin Vardiya</span>
              </button>

              {/* Görev Ekle Butonu */}
              <button
                onClick={() => router.push('/panel/gorev-ekle')}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-xs min-w-[80px] h-[32px]"
                title="Görev Ekle"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">Görev Ekle</span>
              </button>

              {/* Kullanıcı Yönetimi Butonu */}
              <button
                onClick={() => router.push('/panel/supervizor/kullanicilar')}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium text-xs min-w-[80px] h-[32px]"
                title="Kullanıcı Yönetimi"
              >
                <UserCog className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">Kullanıcılar</span>
              </button>

              {/* Hesabım Butonu - En Sağda */}
              <button
                onClick={() => router.push('/panel/supervizor/hesabim')}
                className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-xs min-w-[80px] h-[32px]"
                title="Hesabım"
              >
                <div className="flex items-center gap-1">
                  <UserIcon className="w-3 h-3" />
                  <span className="hidden sm:inline text-[10px]">Hesabım</span>
                </div>
                {session?.user?.name && (
                  <span className="text-[8px] text-blue-100 font-normal leading-tight">
                    {session.user.name}
                  </span>
                )}
              </button>

              {/* Logout Button - Supervisor için mesai bitiş butonu yok */}
              <LogoutButton variant="icon" showShiftEnd={false} />
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Şube Bazlı Özet Kartı - Küçültülmüş ve Yatay */}
        <div className="flex gap-6">
          {/* Mehmetçik Şubesi (Küçültülmüş) */}
          {loadingBranches ? (
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl border border-amber-700/30 p-3 backdrop-blur-sm">
              <div className="flex items-center justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              </div>
            </div>
          ) : filteredBranches.length > 0 ? (
            filteredBranches.slice(0, 1).map((branch) => {
              // Şubenin yöneticilerini göster - birden fazla yönetici olabilir
              const managersText = branch.managers && branch.managers.length > 0
                ? branch.managers.map(m => m.name).join(', ')
                : 'Yönetici atanmamış'
              
              return (
                <div
                  key={branch.id}
                  className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl border border-amber-700/30 p-3 backdrop-blur-sm shadow-xl hover:border-amber-600/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-600 to-yellow-600 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-amber-400 truncate">
                        {branch.name}
                      </h3>
                      <p className="text-[10px] text-gray-400">
                        {branch.managers && branch.managers.length > 0 
                          ? `Yönetici${branch.managers.length > 1 ? 'ler' : ''}: ${managersText}`
                          : 'Yönetici atanmamış'
                        }
                      </p>
                    </div>
                    {branch.criticalPending > 0 && (
                      <div className="px-1.5 py-0.5 bg-red-600/20 border border-red-500/50 rounded text-[10px] font-semibold text-red-400 animate-pulse flex-shrink-0">
                        {branch.criticalPending}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{branch.totalStaff}</p>
                      <p className="text-[9px] text-gray-400 mt-0.5">Personel</p>
                    </div>
                    <div className="text-center border-x border-gray-700/50">
                      <p className="text-lg font-bold text-blue-400">
                        {(branch as any).onLeaveNames ? (branch as any).onLeaveNames.length : 0}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-0.5">İzinli</p>
                    </div>
                    <div className="text-center">
                      <div className="min-h-[20px]">
                        {(branch as any).activeNames && (branch as any).activeNames.length > 0 ? (
                          <div className="space-y-0.5">
                            {(branch as any).activeNames.slice(0, 2).map((name: string, idx: number) => (
                              <p key={idx} className="text-[8px] text-orange-400 font-medium truncate" title={name}>
                                {name.split(' ')[0]}
                              </p>
                            ))}
                            {(branch as any).activeNames.length > 2 && (
                              <p className="text-[8px] text-orange-400">+{(branch as any).activeNames.length - 2}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[8px] text-gray-500">Mesaide personel yok</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl border border-amber-700/30 p-3 backdrop-blur-sm">
              <div className="text-center py-3 text-gray-500">
                <Building2 className="w-6 h-6 mx-auto mb-1 text-gray-600" />
                <p className="text-xs">Şube bulunamadı</p>
              </div>
            </div>
          )}
        </div>

        {/* Yönetici Denetim Paneli */}
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl border border-amber-700/30 p-3 backdrop-blur-sm shadow-xl">
          <div className="flex items-center mb-2.5">
            <h2 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Mehmetçik Şubesi Personel Listesi
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="px-4 py-2.5 text-left text-[9px] font-semibold text-amber-400 uppercase tracking-wider">Personel</th>
                  <th className="px-4 py-2.5 text-left text-[9px] font-semibold text-amber-400 uppercase tracking-wider">Şube</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-semibold text-amber-400 uppercase tracking-wider">Rol</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-semibold text-amber-400 uppercase tracking-wider">Mesai Türü</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-semibold text-amber-400 uppercase tracking-wider">Mesai Başlangıç</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-semibold text-amber-400 uppercase tracking-wider">Mesai Giriş</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-semibold text-amber-400 uppercase tracking-wider">Mesai Bitiş</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-semibold text-amber-400 uppercase tracking-wider">Mesai Çıkış</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-semibold text-amber-400 uppercase tracking-wider">Mevcut Görev</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-semibold text-amber-400 uppercase tracking-wider">Yapılmayan Görev</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-semibold text-amber-400 uppercase tracking-wider">Onay Bekleyen Görev</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-semibold text-amber-400 uppercase tracking-wider">Tamamlanma Oranı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {loadingStaff ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-4 text-center">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 mx-auto" />
                      <p className="text-gray-400 mt-1 text-[10px]">Yükleniyor...</p>
                    </td>
                  </tr>
                ) : mehmetcikStaff.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-4 text-center text-gray-500 text-[10px]">
                      Personel bulunamadı
                    </td>
                  </tr>
                ) : (
                  mehmetcikStaff.map((person) => {
                    // Personel durumunu belirle
                    const isActive = person.shiftActive || (person.loginTime && !person.logoutTime)
                    const isShiftEnded = person.logoutTime && !person.shiftActive
                    const isOnLeave = (person as any).onLeave || false
                    
                    // Renk sınıflarını belirle
                    let rowBgClass = ''
                    if (isOnLeave || isShiftEnded) {
                      // İzinli veya mesaisi dolan: Mavi
                      rowBgClass = 'bg-blue-900/20 border-l-[6px] border-blue-500'
                    } else if (isActive) {
                      // Aktif: Yeşil, yanıp sönsün
                      rowBgClass = 'bg-green-900/20 border-l-[6px] border-green-500 animate-pulse'
                    } else {
                      // Aktif olmayan: Kırmızı
                      rowBgClass = 'bg-red-900/20 border-l-[6px] border-red-500'
                    }
                    
                    return (
                    <tr 
                      key={person.id} 
                      className={`${rowBgClass} hover:opacity-80 transition-all cursor-pointer`}
                      onClick={() => router.push(`/panel/supervizor/personel/${person.id}`)}
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-600 to-yellow-600 flex items-center justify-center text-[9px] font-bold">
                            {person.name?.charAt(0) || '?'}
                          </div>
                          <span className="font-medium text-white text-[10px]">
                            {person.name} {person.surname}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-gray-300 text-[10px]">
                        {person.branchName || 'Mehmetçik Şubesi'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <span className="text-white font-medium text-[10px]">{person.displayRole || person.role}</span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <span className={`text-[9px] font-medium ${
                          person.workScheduleType === 'SABIT_MESAI' ? 'text-blue-400' :
                          person.workScheduleType === 'VARDIYALI_MESAI' ? 'text-purple-400' :
                          'text-gray-500'
                        }`}>
                          {(person as any).workScheduleTypeDisplay || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <span className={`text-[10px] font-medium ${
                          (person as any).shiftStartTimeDisplay === 'İzinli' ? 'text-orange-400' :
                          'text-gray-300'
                        }`}>
                          {(person as any).shiftStartTimeDisplay || person.shiftStartTime || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <span className={`text-[10px] font-medium ${
                          person.loginTime ? 'text-green-400' : 'text-gray-500'
                        }`}>
                          {person.loginTime || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <span className={`text-[10px] font-medium ${
                          (person as any).workEndTimeDisplay === 'İzinli' ? 'text-orange-400' :
                          (person as any).workEndTimeDisplay ? 'text-blue-400' :
                          'text-gray-500'
                        }`}>
                          {(person as any).workEndTimeDisplay === 'İzinli' ? 'İzinli' :
                           (person as any).workEndTimeDisplay || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <span className={`text-[10px] font-medium ${
                          person.logoutTime ? 'text-orange-400' : 'text-gray-500'
                        }`}>
                          {person.logoutTime || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <span className="text-gray-300 text-[10px] font-medium">
                          {person.totalTasks || 0}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <span className={`text-[10px] font-medium ${
                          person.incompleteTasks > 0 ? 'text-yellow-400' : 'text-gray-300'
                        }`}>
                          {person.incompleteTasks || 0}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <span className={`text-[10px] font-medium ${
                          person.pendingApprovals >= 5 ? 'text-red-400' :
                          person.pendingApprovals >= 2 ? 'text-yellow-400' :
                          'text-green-400'
                        }`}>
                          {person.pendingApprovals || 0}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <TrendingDown className={`w-2.5 h-2.5 ${
                            person.successRate >= 95 ? 'text-green-400' :
                            person.successRate >= 90 ? 'text-yellow-400' :
                            'text-red-400'
                          }`} />
                          <span className={`font-semibold text-[10px] ${
                            person.successRate >= 95 ? 'text-green-400' :
                            person.successRate >= 90 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            %{person.successRate?.toFixed(1) || '0.0'}
                          </span>
                        </div>
                      </td>
                    </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kritik İşlem Kayıtları */}
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl border border-amber-700/30 p-3 backdrop-blur-sm shadow-xl">
          <div className="flex items-center mb-2.5">
            <h2 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Kritik İşlem Kayıtları
            </h2>
            
            {/* Log Filtresi */}
            <div className="ml-auto">
              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="bg-gray-900/50 border border-gray-700/50 rounded-lg px-2 py-1 text-white text-[9px] focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              >
                <option value="all">Tümü</option>
                <option value="task_created">Görev Oluşturma</option>
                <option value="task_assigned">Görev Atama</option>
                <option value="task_completed">Görev Tamamlama</option>
                <option value="task_submitted">Görev Teslim</option>
                <option value="task_approved">Görev Onayı</option>
                <option value="task_rejected">Görev Reddi</option>
                <option value="user_created">Kullanıcı Ekleme</option>
                <option value="user_updated">Kullanıcı Güncelleme</option>
                <option value="shift_started">Mesai Başlangıç</option>
                <option value="shift_ended">Mesai Bitiş</option>
                <option value="login">Giriş</option>
                <option value="logout">Çıkış</option>
                <option value="leave_request_created">İzin Talebi</option>
                <option value="leave_request_approved">İzin Onayı</option>
                <option value="leave_request_rejected">İzin Reddi</option>
                <option value="supervisor_override">Süpervizör Müdahalesi</option>
                <option value="location_violation">Konum İhlali</option>
                <option value="system_change">Sistem Değişikliği</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {loadingLogs ? (
              <div className="text-center py-8 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-[10px]">Loglar yükleniyor...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-700" />
                <p className="text-[10px]">Seçilen kriterlere uygun kayıt bulunamadı</p>
              </div>
            ) : (
              filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-gray-900/50 border rounded-lg p-2.5 hover:bg-gray-900/70 transition-colors border-gray-700/50"
              >
                <div className="flex items-start gap-2">
                  <div className={`p-1.5 rounded-lg border ${getLogTypeColor(log.type)}`}>
                    {getLogTypeIcon(log.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-[10px] font-medium text-white">{log.description}</p>
                      <span className="text-[9px] text-gray-400 whitespace-nowrap flex-shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-gray-400 mt-1">
                      {log.staffName && (
                        <span className="flex items-center gap-0.5">
                          <Users className="w-2.5 h-2.5" />
                          {log.staffName}
                        </span>
                      )}
                      {log.branch && (
                        <span className="flex items-center gap-0.5">
                          <Building2 className="w-2.5 h-2.5" />
                          {log.branch}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(log.timestamp).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    {log.details && (
                      <div className="mt-1.5 pt-1.5 border-t border-gray-700/50 text-[9px] text-gray-500">
                        <details>
                          <summary className="cursor-pointer hover:text-gray-400">Detaylar</summary>
                          <pre className="mt-1.5 p-1.5 bg-gray-800/50 rounded text-[9px] overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
        </div>

        {/* Vardiya & İzin Yönetimi - Tüm Personel Görünümü */}
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl border border-amber-700/30 p-3 backdrop-blur-sm shadow-xl">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <CalendarCheck className="w-3.5 h-3.5" />
              Tüm Personel Vardiya & İzin Durumu
            </h2>
            <button
              onClick={() => {
                const fetchData = async () => {
                  setLoadingShifts(true)
                  const shiftsResponse = await fetch('/api/shifts')
                  if (shiftsResponse.ok) {
                    const shiftsData = await shiftsResponse.json()
                    setShifts(shiftsData.shifts || [])
                  }
                  const leavesResponse = await fetch('/api/leave-requests')
                  if (leavesResponse.ok) {
                    const leavesData = await leavesResponse.json()
                    setLeaveRequests(leavesData.leaveRequests || [])
                  }
                  setLoadingShifts(false)
                }
                fetchData()
              }}
              className="flex items-center gap-1.5 px-2 py-1 bg-amber-600/20 border border-amber-500/50 rounded-lg text-amber-400 hover:bg-amber-600/30 transition-colors text-[9px]"
            >
              <RefreshCw className="w-3 h-3" />
              Yenile
            </button>
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2.5">
            <div className="bg-gray-900/50 rounded-lg p-2 border border-gray-700/50">
              <p className="text-[9px] text-gray-400 mb-0.5">Toplam Vardiya</p>
              <p className="text-lg font-bold text-white">{shiftStats.total}</p>
            </div>
            <div className="bg-green-900/30 rounded-lg p-2 border border-green-700/50">
              <p className="text-[9px] text-green-400 mb-0.5">Aktif Vardiya</p>
              <p className="text-lg font-bold text-green-400">{shiftStats.active}</p>
            </div>
            <div className="bg-blue-900/30 rounded-lg p-2 border border-blue-700/50">
              <p className="text-[9px] text-blue-400 mb-0.5">Bugünkü Vardiya</p>
              <p className="text-lg font-bold text-blue-400">{shiftStats.today}</p>
            </div>
            <div className="bg-orange-900/30 rounded-lg p-2 border border-orange-700/50">
              <p className="text-[9px] text-orange-400 mb-0.5">Bekleyen İzin</p>
              <p className="text-lg font-bold text-orange-400">{leaveStats.pending}</p>
            </div>
            <div className="bg-purple-900/30 rounded-lg p-2 border border-purple-700/50">
              <p className="text-[9px] text-purple-400 mb-0.5">Toplam İzin</p>
              <p className="text-lg font-bold text-purple-400">{leaveStats.total}</p>
            </div>
          </div>

          {/* Vardiyalar Tablosu */}
          <div className="mb-2.5">
            <h3 className="text-xs font-semibold text-amber-300 mb-2 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Vardiyalar
            </h3>
            <div className="mb-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Personel ara..."
                  value={shiftSearchQuery}
                  onChange={(e) => setShiftSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 bg-gray-900/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-[10px]"
                />
              </div>
            </div>
            {loadingShifts ? (
              <div className="text-center py-4 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                <p className="text-[10px]">Yükleniyor...</p>
              </div>
            ) : filteredShifts.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <Clock className="w-6 h-6 mx-auto mb-1 text-gray-700" />
                <p className="text-[10px]">Vardiya bulunamadı</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700/50">
                      <th className="px-2 py-1.5 text-left text-[9px] font-semibold text-amber-400 uppercase">Personel</th>
                      <th className="px-2 py-1.5 text-left text-[9px] font-semibold text-amber-400 uppercase">Tarih</th>
                      <th className="px-2 py-1.5 text-left text-[9px] font-semibold text-amber-400 uppercase">Başlangıç</th>
                      <th className="px-2 py-1.5 text-left text-[9px] font-semibold text-amber-400 uppercase">Bitiş</th>
                      <th className="px-2 py-1.5 text-left text-[9px] font-semibold text-amber-400 uppercase">Haftalık Saat</th>
                      <th className="px-2 py-1.5 text-left text-[9px] font-semibold text-amber-400 uppercase">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {filteredShifts.slice(0, 10).map((shift) => (
                      <tr key={shift.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-gray-400" />
                            <div>
                              <p className="text-[10px] font-medium text-white">{shift.userName}</p>
                              <p className="text-[9px] text-gray-400">{shift.userRole}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-[10px] text-gray-300">
                          {new Date(shift.shiftDate).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-2 py-1.5 text-[10px] text-gray-300">{shift.startTime}</td>
                        <td className="px-2 py-1.5 text-[10px] text-gray-300">{shift.endTime}</td>
                        <td className="px-2 py-1.5 text-[10px] text-gray-300">{shift.weeklyHours} saat</td>
                        <td className="px-2 py-1.5">
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${
                            shift.isActive
                              ? 'bg-green-900/50 text-green-400 border border-green-700/50'
                              : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'
                          }`}>
                            {shift.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredShifts.length > 10 && (
                  <p className="text-[9px] text-gray-400 mt-1 text-center">
                    {filteredShifts.length - 10} vardiya daha var. Detaylar için yönetici paneline bakın.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* İzin Talepleri Listesi */}
          <div>
            <h3 className="text-xs font-semibold text-amber-300 mb-2 flex items-center gap-1.5">
              <CalendarCheck className="w-3 h-3" />
              İzin Talepleri
            </h3>
            <div className="mb-4 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Personel ara..."
                  value={leaveSearchQuery}
                  onChange={(e) => setLeaveSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 bg-gray-900/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-[10px]"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setLeaveStatusFilter('all')}
                  className={`px-2 py-1 rounded-lg text-[9px] font-medium transition-colors ${
                    leaveStatusFilter === 'all'
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Tümü ({leaveStats.total})
                </button>
                <button
                  onClick={() => setLeaveStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    leaveStatusFilter === 'pending'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Bekleyen ({leaveStats.pending})
                </button>
                <button
                  onClick={() => setLeaveStatusFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    leaveStatusFilter === 'approved'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Onaylanan ({leaveStats.approved})
                </button>
                <button
                  onClick={() => setLeaveStatusFilter('rejected')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    leaveStatusFilter === 'rejected'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Reddedilen ({leaveStats.rejected})
                </button>
              </div>
            </div>
            {loadingShifts ? (
              <div className="text-center py-8 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p>Yükleniyor...</p>
              </div>
            ) : filteredLeaves.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CalendarCheck className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                <p className="text-sm">İzin talebi bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {filteredLeaves.slice(0, 20).map((leave) => (
                  <div
                    key={leave.id}
                    className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-2 hover:bg-gray-900/70 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-semibold text-white">{leave.userName}</p>
                            <p className="text-xs text-gray-400">{leave.userRole}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            leave.type === 'annual' ? 'bg-blue-900/50 text-blue-400 border border-blue-700/50' :
                            leave.type === 'health' ? 'bg-red-900/50 text-red-400 border border-red-700/50' :
                            'bg-purple-900/50 text-purple-400 border border-purple-700/50'
                          }`}>
                            {leave.type === 'annual' ? 'Yıllık İzin' : leave.type === 'health' ? 'Sağlık İzni' : 'Mazeret İzni'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            leave.status === 'pending' ? 'bg-orange-900/50 text-orange-400 border border-orange-700/50' :
                            leave.status === 'approved' ? 'bg-green-900/50 text-green-400 border border-green-700/50' :
                            'bg-red-900/50 text-red-400 border border-red-700/50'
                          }`}>
                            {leave.status === 'pending' ? 'Beklemede' : leave.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-300 mb-1">
                          {new Date(leave.startDate).toLocaleDateString('tr-TR')} - {new Date(leave.endDate).toLocaleDateString('tr-TR')}
                        </p>
                        {leave.description && (
                          <p className="text-[10px] text-gray-400 mb-1">{leave.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-[9px] text-gray-500 mt-1">
                          <span>Gönderildi: {new Date(leave.submittedAt).toLocaleString('tr-TR')}</span>
                          {leave.reviewedAt && (
                            <span>{leave.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}: {new Date(leave.reviewedAt).toLocaleString('tr-TR')} - {leave.reviewedByName || 'Yönetici'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredLeaves.length > 20 && (
                  <p className="text-[9px] text-gray-400 text-center py-1">
                    {filteredLeaves.length - 20} izin talebi daha var. Detaylar için yönetici paneline bakın.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sistem Genel Kuralları */}
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl border border-amber-700/30 p-3 backdrop-blur-sm shadow-xl">
          <div className="flex items-center mb-2.5">
            <h2 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              Sistem Genel Kuralları
            </h2>
          </div>
            
          <div className="space-y-2.5">
            {/* Konum Toleransı ve Gecikme Alarm */}
            <div className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  Konum Toleransı (metre)
                </label>
                <input
                  type="number"
                  value={settings.locationTolerance}
                  onChange={(e) => setSettings({ ...settings, locationTolerance: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 bg-gray-900/50 border border-gray-700/50 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-[10px]"
                  min="0"
                />
                <p className="text-[9px] text-gray-400 mt-0.5">Personel görev konumundan bu mesafe kadar uzaklaşabilir</p>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-amber-400" />
                  Gecikme Alarm Süresi (dakika)
                </label>
                <input
                  type="number"
                  value={settings.delayAlarmMinutes}
                  onChange={(e) => setSettings({ ...settings, delayAlarmMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 bg-gray-900/50 border border-gray-700/50 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-[10px]"
                  min="0"
                />
                <p className="text-[9px] text-gray-400 mt-0.5">Görev teslim süresinden bu kadar geç kalırsa alarm verilir</p>
              </div>

              <button
                type="button"
                onClick={handleLocationDelaySave}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded-lg hover:from-amber-700 hover:to-yellow-700 transition-all font-semibold shadow-lg text-[10px]"
              >
                <Save className="w-3 h-3" />
                Konum & Gecikme Ayarlarını Kaydet
              </button>
            </div>

            {/* Ceza Puanı Baremleri */}
            <div className="border-t border-gray-700/50 pt-2.5">
              <label className="block text-[10px] font-medium text-gray-300 mb-2">
                Ceza Puanı Baremleri
              </label>
              <div className="space-y-2 bg-gray-900/30 rounded-lg p-2 border border-gray-700/30">
                <div>
                  <label className="block text-[9px] text-gray-400 mb-0.5">Hafif İhlal</label>
                  <input
                    type="number"
                    value={settings.penaltyPoints.minor}
                    onChange={(e) => setSettings({
                      ...settings,
                      penaltyPoints: { ...settings.penaltyPoints, minor: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-2 py-1 bg-gray-900/50 border border-gray-700/50 rounded-lg text-white text-[10px] focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-gray-400 mb-0.5">Orta İhlal</label>
                  <input
                    type="number"
                    value={settings.penaltyPoints.moderate}
                    onChange={(e) => setSettings({
                      ...settings,
                      penaltyPoints: { ...settings.penaltyPoints, moderate: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-2 py-1 bg-gray-900/50 border border-gray-700/50 rounded-lg text-white text-[10px] focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-gray-400 mb-0.5">Ağır İhlal</label>
                  <input
                    type="number"
                    value={settings.penaltyPoints.major}
                    onChange={(e) => setSettings({
                      ...settings,
                      penaltyPoints: { ...settings.penaltyPoints, major: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-2 py-1 bg-gray-900/50 border border-gray-700/50 rounded-lg text-white text-[10px] focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    min="0"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handlePenaltyPointsSave}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded-lg hover:from-amber-700 hover:to-yellow-700 transition-all font-semibold shadow-lg text-[10px] mt-2"
              >
                <Save className="w-3 h-3" />
                Ceza Puanı Baremlerini Kaydet
              </button>
            </div>

            {/* NetGSM Ayarları */}
            <div className="border-t border-gray-700/50 pt-2.5 mt-2.5">
              <label className="block text-[10px] font-medium text-gray-300 mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3 text-amber-400" />
                NetGSM Ayarları
              </label>
              
              <div className="space-y-2.5 bg-gray-900/30 rounded-lg p-2 border border-gray-700/30">
                {/* OTP Doğrulama */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-medium text-gray-300 flex items-center gap-1.5">
                      <Smartphone className="w-3 h-3 text-amber-400" />
                      Giriş Doğrulama (OTP)
                    </label>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, netgsmOtpEnabled: !settings.netgsmOtpEnabled })}
                      className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                        settings.netgsmOtpEnabled ? 'bg-green-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          settings.netgsmOtpEnabled ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-400">Kullanıcılar giriş yaparken SMS ile doğrulama kodu alır</p>
                </div>

                {/* Uyarı Mesajı */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-medium text-gray-300 flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3 text-amber-400" />
                      Personel Uyarı Mesajı
                    </label>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, netgsmAlertEnabled: !settings.netgsmAlertEnabled })}
                      className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                        settings.netgsmAlertEnabled ? 'bg-green-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          settings.netgsmAlertEnabled ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  <textarea
                    value={settings.netgsmAlertMessage}
                    onChange={(e) => setSettings({ ...settings, netgsmAlertMessage: e.target.value })}
                    placeholder="Örn: Görevinizde gecikme var. Lütfen durumu kontrol edin."
                    className="w-full px-2 py-1.5 bg-gray-900/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-[10px] resize-none"
                    rows={3}
                    disabled={!settings.netgsmAlertEnabled}
                  />
                  <p className="text-[9px] text-gray-400 mt-0.5">
                    {settings.netgsmAlertEnabled 
                      ? 'Personellere gönderilecek uyarı mesajı içeriği' 
                      : 'Uyarı mesajı gönderimi kapalı'}
                  </p>
                </div>
              </div>
            </div>

            {/* NetGSM Ayarları Kaydet Butonu */}
            <div className="border-t border-gray-700/50 pt-2.5">
              <button
                type="button"
                onClick={handleNetGSMSave}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded-lg hover:from-amber-700 hover:to-yellow-700 transition-all font-semibold shadow-lg text-[10px]"
              >
                <Save className="w-3 h-3" />
                NetGSM Ayarlarını Kaydet
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </RouteGuard>
  )
}
