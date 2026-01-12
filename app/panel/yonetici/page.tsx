'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { 
  Users, 
  FileText, 
  User as UserIcon, 
  CheckCircle2, 
  XCircle,
  Send,
  MapPin,
  AlertCircle,
  Eye,
  TrendingUp,
  TrendingDown,
  Clock,
  MessageSquare,
  Loader2,
  Activity,
  Settings,
  CalendarCheck,
  UserCog,
  Zap,
  Calendar,
  Building2
} from 'lucide-react'
import { Staff, ApprovalItem, TaskAssignment, SystemLog, getShiftStatus, getShiftStatusColor } from './types'

export default function YoneticiDashboard() {
  const router = useRouter()
  const { data: session } = useSession()
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [approvalItems, setApprovalItems] = useState<ApprovalItem[]>([])
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [loadingApprovals, setLoadingApprovals] = useState(true)
  const [taskForm, setTaskForm] = useState<TaskAssignment>({
    staffId: '',
    taskType: 'routine',
    urgency: 'normal',
    description: ''
  })
  const [selectedApprovalItem, setSelectedApprovalItem] = useState<ApprovalItem | null>(null)
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [logFilter, setLogFilter] = useState<string>('all')
  const [loadingLogs, setLoadingLogs] = useState(true)

  const totalStaff = staffList.length
  const activeStaffCount = staffList.filter(s => s.shiftActive).length
  
  const totalTasks = staffList.reduce((sum, s) => sum + s.totalTasks, 0)
  const pendingApprovalsCount = approvalItems.filter(a => a.status === 'pending').length
  const incompleteTasks = staffList.reduce((sum, s) => sum + s.incompleteTasks, 0)
  const completionRate = totalTasks > 0 ? ((totalTasks - incompleteTasks) / totalTasks * 100).toFixed(1) : '0'

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskForm.staffId || !taskForm.description.trim()) {
      alert('Lütfen personel seçin ve görev açıklaması girin!')
      return
    }
    console.log('Görev atandı:', taskForm)
    alert('Görev başarıyla atandı!')
    setTaskForm({ staffId: '', taskType: 'routine', urgency: 'normal', description: '' })
  }

  const handleViewTask = (item: ApprovalItem) => {
    setSelectedApprovalItem(item)
  }

  const handleApproval = async (itemId: string, action: 'approve' | 'reject') => {
    try {
      const endpoint = action === 'approve' ? '/api/tasks/approve' : '/api/tasks/reject'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: itemId })
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Hata: ${error.error || 'İşlem başarısız'}`)
        return
      }

      // Approval listesini yeniden yükle
      fetchApprovalItems()
      setSelectedApprovalItem(null)
    } catch (error: any) {
      console.error('Approval error:', error)
      alert(`Hata: ${error.message || 'İşlem başarısız'}`)
    }
  }

  // Staff listesini yükle
  const fetchStaffList = async () => {
    try {
      setLoadingStaff(true)
      const response = await fetch('/api/admin/staff')
      if (!response.ok) throw new Error('Staff listesi yüklenemedi')
      const data = await response.json()
      setStaffList(data.staff || [])
    } catch (error: any) {
      console.error('Error fetching staff:', error)
      alert(`Hata: ${error.message || 'Personel listesi yüklenemedi'}`)
    } finally {
      setLoadingStaff(false)
    }
  }

  // Approval listesini yükle
  const fetchApprovalItems = async () => {
    try {
      setLoadingApprovals(true)
      const response = await fetch('/api/tasks/pending')
      if (!response.ok) throw new Error('Onay bekleyen görevler yüklenemedi')
      const data = await response.json()
      
      // API response'unu ApprovalItem formatına map et
      const mappedItems: ApprovalItem[] = (data.tasks || []).map((task: any) => ({
        id: task.id,
        staffName: task.staffName || 'Bilinmeyen',
        staffRole: task.staffRole || 'Bilinmeyen',
        taskType: task.taskType || 'Bilinmeyen',
        taskTitle: task.taskTitle || '',
        submittedAt: task.submittedAt || '',
        data: task.data || undefined,
        photos: task.photos || [],
        status: 'pending' as const
      }))
      
      setApprovalItems(mappedItems)
    } catch (error: any) {
      console.error('Error fetching approvals:', error)
      alert(`Hata: ${error.message || 'Onay bekleyen görevler yüklenemedi'}`)
    } finally {
      setLoadingApprovals(false)
    }
  }

  // Sayfa yüklendiğinde verileri çek
  useEffect(() => {
    fetchStaffList()
    fetchApprovalItems()
  }, [])

  // Sistem loglarını yükle - API zaten kendi personelleri ile ilgili olanları filtreliyor
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

  // Filtrelenmiş loglar
  const filteredLogs = useMemo(() => {
    let result = logs
    if (logFilter !== 'all') {
      result = result.filter(log => log.type === logFilter)
    }
    return result
  }, [logs, logFilter])

  // Log tipi ikonları
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

  // Log tipi renkleri
  const getLogTypeColor = (type: SystemLog['type']) => {
    switch (type) {
      case 'supervisor_override':
        return 'bg-yellow-100 text-yellow-600 border-yellow-300'
      case 'location_violation':
        return 'bg-red-100 text-red-600 border-red-300'
      case 'manager_approval':
      case 'task_approved':
        return 'bg-green-100 text-green-600 border-green-300'
      case 'manager_rejection':
      case 'task_rejected':
        return 'bg-red-100 text-red-600 border-red-300'
      case 'task_created':
      case 'task_assigned':
        return 'bg-blue-100 text-blue-600 border-blue-300'
      case 'task_completed':
      case 'task_submitted':
        return 'bg-green-100 text-green-600 border-green-300'
      case 'system_change':
        return 'bg-purple-100 text-purple-600 border-purple-300'
      case 'user_created':
        return 'bg-green-100 text-green-600 border-green-300'
      case 'user_updated':
        return 'bg-blue-100 text-blue-600 border-blue-300'
      case 'user_deleted':
        return 'bg-red-100 text-red-600 border-red-300'
      case 'shift_started':
        return 'bg-green-100 text-green-600 border-green-300'
      case 'shift_ended':
        return 'bg-orange-100 text-orange-600 border-orange-300'
      case 'login':
        return 'bg-green-100 text-green-600 border-green-300'
      case 'logout':
        return 'bg-gray-100 text-gray-600 border-gray-300'
      case 'leave_request_created':
      case 'leave_request_approved':
        return 'bg-blue-100 text-blue-600 border-blue-300'
      case 'leave_request_rejected':
        return 'bg-red-100 text-red-600 border-red-300'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Aktif Personel Kartı */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500">Personel Durumu</p>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Toplam Personel</span>
              <span className="text-2xl font-bold text-gray-900">{totalStaff}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="text-sm text-gray-600">Aktif Çalışan</span>
              <span className="text-2xl font-bold text-green-600">{activeStaffCount}</span>
            </div>
          </div>
        </div>

        {/* Görev Özeti Kartı */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500">Görev Özeti</p>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Toplam Görev</p>
              <p className="text-xl font-bold text-gray-900">{totalTasks}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Onay Bekleyen</p>
              <p className="text-xl font-bold text-yellow-600">{pendingApprovalsCount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Tamamlanmayan</p>
              <p className="text-xl font-bold text-red-600">{incompleteTasks}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Tamamlanma Oranı</p>
              <p className="text-xl font-bold text-blue-600">{completionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Status Table - Süpervizör ile aynı yapı */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Personel Durumu</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Personel</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Şube</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Rol</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Mesai Türü</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Mesai Başlangıç</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Mesai Giriş</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Mesai Bitiş</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Mesai Çıkış</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Mevcut Görev</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Yapılmayan Görev</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Onay Bekleyen Görev</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Tamamlanma Oranı</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingStaff ? (
                <tr>
                  <td colSpan={12} className="px-4 py-4 text-center">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 mx-auto" />
                    <p className="text-gray-500 mt-1 text-sm">Yükleniyor...</p>
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-4 text-center text-gray-500 text-sm">
                    Personel bulunamadı
                  </td>
                </tr>
              ) : (
                staffList.map((person) => {
                  // Personel durumunu belirle
                  const isActive = person.shiftActive || (person.loginTime && !person.logoutTime)
                  const isShiftEnded = person.logoutTime && !person.shiftActive
                  const isOnLeave = (person as any).onLeave || false
                  
                  // Renk sınıflarını belirle
                  let rowBgClass = ''
                  if (isOnLeave || isShiftEnded) {
                    // İzinli veya mesaisi dolan: Mavi
                    rowBgClass = 'bg-blue-50 border-l-[6px] border-blue-500'
                  } else if (isActive) {
                    // Aktif: Yeşil, yanıp sönsün
                    rowBgClass = 'bg-green-50 border-l-[6px] border-green-500 animate-pulse'
                  } else {
                    // Aktif olmayan: Kırmızı
                    rowBgClass = 'bg-red-50 border-l-[6px] border-red-500'
                  }
                  
                  return (
                    <tr 
                      key={person.id} 
                      className={`${rowBgClass} hover:opacity-80 transition-all cursor-pointer`}
                      onClick={() => router.push(`/panel/yonetici/personel/${person.id}`)}
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                            {person.name?.charAt(0) || '?'}
                          </div>
                          <span className="font-medium text-gray-900 text-sm">
                            {person.name} {person.surname}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-gray-600 text-sm">
                        {person.branchName || '-'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <span className="text-gray-900 font-medium text-sm">{(person as any).displayRole || person.role}</span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <span className={`text-xs font-medium ${
                          person.workScheduleType === 'SABIT_MESAI' ? 'text-blue-600' :
                          person.workScheduleType === 'VARDIYALI_MESAI' ? 'text-purple-600' :
                          'text-gray-500'
                        }`}>
                          {(person as any).workScheduleTypeDisplay || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <span className={`text-sm font-medium ${
                          (person as any).shiftStartTimeDisplay === 'İzinli' ? 'text-orange-600' :
                          'text-gray-700'
                        }`}>
                          {(person as any).shiftStartTimeDisplay || person.shiftStartTime || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <span className={`text-sm font-medium ${
                          person.loginTime ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {person.loginTime || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <span className={`text-sm font-medium ${
                          (person as any).workEndTimeDisplay === 'İzinli' ? 'text-orange-600' :
                          (person as any).workEndTimeDisplay ? 'text-blue-600' :
                          'text-gray-500'
                        }`}>
                          {(person as any).workEndTimeDisplay === 'İzinli' ? 'İzinli' :
                           (person as any).workEndTimeDisplay || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <span className={`text-sm font-medium ${
                          person.logoutTime ? 'text-orange-600' : 'text-gray-500'
                        }`}>
                          {person.logoutTime || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <span className="text-gray-700 text-sm font-medium">
                          {person.totalTasks || 0}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <span className={`text-sm font-medium ${
                          person.incompleteTasks > 0 ? 'text-yellow-600' : 'text-gray-700'
                        }`}>
                          {person.incompleteTasks || 0}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <span className={`text-sm font-medium ${
                          person.pendingApprovals >= 5 ? 'text-red-600' :
                          person.pendingApprovals >= 2 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {person.pendingApprovals || 0}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <TrendingDown className={`w-3 h-3 ${
                            person.successRate >= 95 ? 'text-green-600' :
                            person.successRate >= 90 ? 'text-yellow-600' :
                            'text-red-600'
                          }`} />
                          <span className={`font-semibold text-sm ${
                            person.successRate >= 95 ? 'text-green-600' :
                            person.successRate >= 90 ? 'text-yellow-600' :
                            'text-red-600'
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

      {/* Olaylar - Sadece kendi personelleri ile ilgili */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Olaylar
          </h3>
          
          {/* Log Filtresi */}
          <div className="flex items-center gap-2">
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">Tümü</option>
              <option value="task_created">Görev Oluşturma</option>
              <option value="task_assigned">Görev Atama</option>
              <option value="task_completed">Görev Tamamlama</option>
              <option value="task_submitted">Görev Teslim</option>
              <option value="task_approved">Görev Onayı</option>
              <option value="task_rejected">Görev Reddi</option>
              <option value="shift_started">Mesai Başlangıç</option>
              <option value="shift_ended">Mesai Bitiş</option>
              <option value="login">Giriş</option>
              <option value="logout">Çıkış</option>
              <option value="leave_request_created">İzin Talebi</option>
              <option value="leave_request_approved">İzin Onayı</option>
              <option value="leave_request_rejected">İzin Reddi</option>
            </select>
            {loadingLogs && (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            )}
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {loadingLogs ? (
            <div className="text-center py-8 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Olaylar yükleniyor...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Seçilen kriterlere uygun olay bulunamadı</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-gray-50 border rounded-lg p-3 hover:bg-gray-100 transition-colors border-gray-200"
              >
                <div className="flex items-start gap-2">
                  <div className={`p-1.5 rounded-lg border ${getLogTypeColor(log.type)}`}>
                    {getLogTypeIcon(log.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900">{log.description}</p>
                      <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      {log.staffName && (
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          {log.staffName}
                        </span>
                      )}
                      {log.branch && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {log.branch}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    {log.details && (
                      <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                        <details>
                          <summary className="cursor-pointer hover:text-gray-700">Detaylar</summary>
                          <pre className="mt-1.5 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
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

      {/* Quick Task Assignment Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hızlı Görev Atama</h3>
        <form onSubmit={handleTaskSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personel Seç
              </label>
              <select
                value={taskForm.staffId}
                onChange={(e) => setTaskForm({ ...taskForm, staffId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Personel Seçin</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} {staff.surname} ({staff.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Görev Türü
              </label>
              <select
                value={taskForm.taskType}
                onChange={(e) => setTaskForm({ ...taskForm, taskType: e.target.value as 'routine' | 'one-time' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="routine">Rutin</option>
                <option value="one-time">Tek Seferlik</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                Aciliyet
                {taskForm.urgency === 'urgent' && (
                  <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                )}
              </label>
              <select
                value={taskForm.urgency}
                onChange={(e) => setTaskForm({ ...taskForm, urgency: e.target.value as 'normal' | 'urgent' })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                  taskForm.urgency === 'urgent' 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300'
                }`}
              >
                <option value="normal">Normal</option>
                <option value="urgent">Acil</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Görev Açıklaması
            </label>
            <textarea
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              rows={3}
              placeholder="Görev detaylarını yazın..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Send className="w-4 h-4" />
            Gönder
          </button>
        </form>
      </div>

      {/* Approval Feed */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Onay Bekleyenler</h3>
          {pendingApprovalsCount > 0 && (
            <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
              {pendingApprovalsCount} bekleyen
            </span>
          )}
        </div>
        <div className="space-y-4">
          {approvalItems.filter(item => item.status === 'pending').map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">{item.staffName}</span>
                    <span className="text-xs text-gray-500">({item.staffRole})</span>
                  </div>
                  <p className="text-sm text-gray-600">{item.taskType}: {item.taskTitle}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.submittedAt}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  item.taskType.includes('Acil') || item.taskType.includes('Urgent')
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {item.taskType}
                </span>
              </div>

              {item.data && (
                <div className="bg-gray-50 rounded p-3 mb-3 text-sm text-gray-600">
                  <p>Satır Sayısı: {item.data.rows}</p>
                  {item.data.margin && <p>Ortalama Marj: %{item.data.margin}</p>}
                </div>
              )}

              {item.photos && item.photos.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {item.photos.map((photo, idx) => (
                    <div key={idx} className="w-full h-32 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                      Fotoğraf {idx + 1}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-gray-200">
                <button
                  onClick={() => handleViewTask(item)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Eye className="w-4 h-4" />
                  Görevi İncele
                </button>
              </div>
            </div>
          ))}

          {approvalItems.filter(item => item.status === 'pending').length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Bekleyen onay bulunmamaktadır</p>
            </div>
          )}
        </div>
      </div>

      {/* Görev Detay Modal */}
      {selectedApprovalItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Görev Detayları</h3>
              <button
                onClick={() => setSelectedApprovalItem(null)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Personel Bilgileri */}
              <div className="border-b border-gray-200 pb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Personel Bilgileri</h4>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedApprovalItem.staffName}</p>
                    <p className="text-sm text-gray-500">{selectedApprovalItem.staffRole}</p>
                  </div>
                </div>
              </div>

              {/* Görev Bilgileri */}
              <div className="border-b border-gray-200 pb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Görev Bilgileri</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Görev Türü:</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {selectedApprovalItem.taskType}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{selectedApprovalItem.taskTitle}</p>
                  <p className="text-xs text-gray-400">Gönderim: {selectedApprovalItem.submittedAt}</p>
                </div>
              </div>

              {/* Veri Özeti */}
              {selectedApprovalItem.data && (
                <div className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Veri Özeti</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {Object.entries(selectedApprovalItem.data).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-600 capitalize">{key}:</span>
                        <span className="font-medium text-gray-900">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fotoğraflar */}
              {selectedApprovalItem.photos && selectedApprovalItem.photos.length > 0 && (
                <div className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Fotoğraflar</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedApprovalItem.photos.map((photo, idx) => (
                      <div key={idx} className="relative w-full h-48 bg-gray-200 rounded-lg overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                          Fotoğraf {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Onay/Reddet Butonları */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={() => handleApproval(selectedApprovalItem.id, 'approve')}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex-1 justify-center"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Onayla
                </button>
                <button
                  onClick={() => handleApproval(selectedApprovalItem.id, 'reject')}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex-1 justify-center"
                >
                  <XCircle className="w-5 h-5" />
                  Reddet / İade Et
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
