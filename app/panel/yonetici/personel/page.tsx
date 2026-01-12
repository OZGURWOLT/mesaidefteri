'use client'

import { useState, useEffect } from 'react'
import { 
  User as UserIcon,
  MapPin,
  Eye,
  Send,
  ArrowRight,
  Search,
  Filter,
  UserPlus,
  AlertCircle,
  XCircle,
  CheckCircle2,
  TrendingUp,
  FileText,
  Clock,
  CheckCircle,
  X,
  Loader2
} from 'lucide-react'
import { Staff, TaskAssignment, getShiftStatus, getShiftStatusColor } from '../types'
import Modal from '@/components/ui/Modal'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  taskType?: string
  assignedAt?: string
  deadline?: string
  type?: string
  priority?: string
}

export default function PersonelListesi() {
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [quickTaskModalOpen, setQuickTaskModalOpen] = useState<string | null>(null)
  const [taskForm, setTaskForm] = useState<TaskAssignment>({
    staffId: '',
    taskType: 'routine',
    urgency: 'normal',
    description: ''
  })
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [userTasks, setUserTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Personel filtreleme
  const filteredStaff = staffList.filter(staff => {
    const matchesSearch = searchQuery === '' || 
      `${staff.name} ${staff.surname}`.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || staff.role === roleFilter
    return matchesSearch && matchesRole
  })

  const uniqueRoles = Array.from(new Set(staffList.map(s => s.role)))

  // Staff listesini yükle
  const fetchStaffList = async () => {
    try {
      setLoadingStaff(true)
      setError('')
      const response = await fetch('/api/admin/staff')
      const data = await response.json()
      
      if (!response.ok) {
        const errorMessage = data.error || `HTTP ${response.status}: Personel listesi yüklenemedi`
        setError(errorMessage)
        console.error('Error fetching staff:', errorMessage, data)
        return
      }
      
      if (data.success && data.staff) {
        setStaffList(data.staff || [])
      } else {
        setError('Personel listesi beklenmeyen formatta geldi')
        setStaffList([])
      }
    } catch (error: any) {
      console.error('Error fetching staff:', error)
      setError(error.message || 'Personel listesi yüklenirken bir hata oluştu')
      setStaffList([])
    } finally {
      setLoadingStaff(false)
    }
  }

  // Sayfa yüklendiğinde verileri çek
  useEffect(() => {
    fetchStaffList()
  }, [])

  const handleQuickTask = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId)
    if (staff) {
      setQuickTaskModalOpen(staffId)
      setTaskForm({ 
        staffId: staffId,
        taskType: 'routine',
        urgency: 'normal',
        description: ''
      })
    }
  }

  const handleQuickTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskForm.description.trim()) {
      alert('Lütfen görev açıklaması girin!')
      return
    }
    const staff = staffList.find(s => s.id === taskForm.staffId)
    console.log('Hızlı görev atandı:', { ...taskForm, staffName: staff?.name })
    alert(`${staff?.name} ${staff?.surname} adlı personele görev başarıyla atandı!`)
    setQuickTaskModalOpen(null)
    setTaskForm({ staffId: '', taskType: 'routine', urgency: 'normal', description: '' })
  }

  const handleMonitor = (staffId: string) => {
    console.log('İzle:', staffId)
    const staff = staffList.find(s => s.id === staffId)
    alert(`${staff?.name} ${staff?.surname} canlı izleme özelliği yakında eklenecek`)
  }

  // Kullanıcı detay modalını aç - Görevleri yükle
  const handleViewDetails = async (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId)
    if (!staff) return
    
    setSelectedStaff(staff)
    setDetailModalOpen(true)
    setLoadingTasks(true)
    setError('')
    setSuccess('')

    try {
      // Staff.id artık gerçek user ID (API'den geldiği için)
      const tasksResponse = await fetch(`/api/tasks/assigned?userId=${staffId}`)
      const tasksData = await tasksResponse.json()

      if (tasksResponse.ok && tasksData.success) {
        setUserTasks(tasksData.tasks || [])
        setError('')
      } else {
        setError(tasksData.error || 'Görevler yüklenirken bir hata oluştu')
        setUserTasks([])
      }
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError('Görevler yüklenirken bir hata oluştu')
      setUserTasks([])
    } finally {
      setLoadingTasks(false)
    }
  }

  // Görev durumunu güncelle
  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Görev listesini güncelle
        setUserTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === taskId
              ? { ...task, status: newStatus === 'ONAYLANDI' ? 'completed' : newStatus === 'REDDEDILDI' ? 'rejected' : 'in_progress' }
              : task
          )
        )
        setSuccess('Görev durumu başarıyla güncellendi')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Görev güncellenirken bir hata oluştu')
      }
    } catch (err) {
      console.error('Error updating task:', err)
      setError('Görev güncellenirken bir hata oluştu')
    }
  }

  // Görev durumunu al (Türkçe)
  const getTaskStatusLabel = (status: string) => {
    if (status === 'completed' || status === 'ONAYLANDI') return 'Onaylandı'
    if (status === 'rejected' || status === 'REDDEDILDI') return 'Reddedildi'
    if (status === 'pending' || status === 'BEKLIYOR') return 'Bekliyor'
    if (status === 'in_progress' || status === 'IN_PROGRESS') return 'Devam Ediyor'
    return status
  }

  // Görev durumu rengi
  const getTaskStatusColor = (status: string) => {
    if (status === 'completed' || status === 'ONAYLANDI') return 'bg-green-100 text-green-800 border-green-300'
    if (status === 'rejected' || status === 'REDDEDILDI') return 'bg-red-100 text-red-800 border-red-300'
    if (status === 'pending' || status === 'BEKLIYOR') return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    if (status === 'in_progress' || status === 'IN_PROGRESS') return 'bg-blue-100 text-blue-800 border-blue-300'
    return 'bg-gray-100 text-gray-800 border-gray-300'
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header & Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Personel Yönetimi</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              <UserPlus className="w-4 h-4" />
              Yeni Personel Ekle
            </button>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Arama */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="İsim ile ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Rol Filtresi */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none"
              >
                <option value="all">Tüm Roller</option>
                {uniqueRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Personel Tablosu */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Personel</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mesai Durumu</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Görev İstatistikleri</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Başarı Skoru</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loadingStaff ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        <span className="text-gray-600">Personel listesi yükleniyor...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <UserIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500">Arama kriterlerine uygun personel bulunamadı</p>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50 transition-colors">
                    {/* Personel Bilgisi */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {staff.avatar ? (
                          <img 
                            src={staff.avatar} 
                            alt={`${staff.name} ${staff.surname}`}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                            {staff.name.charAt(0)}{staff.surname.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{staff.name} {staff.surname}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {staff.lastLocation}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Rol */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        staff.role === 'Satınalma' || staff.role === 'STAFF' ? 'bg-purple-100 text-purple-800' :
                        staff.role === 'Kurye' ? 'bg-orange-100 text-orange-800' :
                        staff.role === 'Kasiyer' ? 'bg-green-100 text-green-800' :
                        staff.role === 'Garson' ? 'bg-blue-100 text-blue-800' :
                        staff.role === 'Yazılımcı' || staff.role === 'DEVELOPER' ? 'bg-indigo-100 text-indigo-800' :
                        staff.role === 'Yönetici' || staff.role === 'MANAGER' ? 'bg-blue-100 text-blue-800' :
                        staff.role === 'Süpervizör' || staff.role === 'SUPERVIZOR' ? 'bg-amber-100 text-amber-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {staff.role === 'DEVELOPER' ? 'Yazılımcı' : staff.role === 'MANAGER' ? 'Yönetici' : staff.role === 'SUPERVIZOR' ? 'Süpervizör' : staff.role === 'STAFF' ? 'Personel' : staff.role}
                      </span>
                    </td>

                    {/* Mesai Durumu */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          staff.onLeave ? 'bg-blue-500' :
                          staff.shiftActive ? 'bg-green-500 animate-pulse' :
                          'bg-gray-400'
                        }`} />
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getShiftStatusColor(staff)}`}>
                          {getShiftStatus(staff)}
                        </span>
                      </div>
                    </td>

                    {/* Görev İstatistikleri */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-semibold text-gray-900">{staff.totalTasks}</p>
                          <p className="text-xs text-gray-500">Toplam</p>
                        </div>
                        {staff.pendingApprovals > 0 && (
                          <div className="text-center">
                            <p className="font-semibold text-yellow-600">{staff.pendingApprovals}</p>
                            <p className="text-xs text-gray-500">Bekleyen</p>
                          </div>
                        )}
                        {staff.incompleteTasks > 0 && (
                          <div className="text-center">
                            <p className="font-semibold text-red-600">{staff.incompleteTasks}</p>
                            <p className="text-xs text-gray-500">Eksik</p>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Başarı Skoru */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-2.5 max-w-[120px]">
                          <div 
                            className={`h-2.5 rounded-full transition-all ${
                              staff.successRate >= 90 ? 'bg-green-500' :
                              staff.successRate >= 75 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${staff.successRate}%` }}
                          />
                        </div>
                        <span className={`text-sm font-semibold min-w-[45px] text-right ${
                          staff.successRate >= 90 ? 'text-green-600' :
                          staff.successRate >= 75 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          %{staff.successRate.toFixed(1)}
                        </span>
                      </div>
                    </td>

                    {/* İşlemler */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleMonitor(staff.id)}
                          className="p-2 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          title="Canlı İzle"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleQuickTask(staff.id)}
                          className="p-2 rounded-lg text-gray-600 hover:bg-green-50 hover:text-green-600 transition-colors"
                          title="Görev Ata"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleViewDetails(staff.id)}
                          className="p-2 rounded-lg text-gray-600 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                          title="Görevleri Görüntüle"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Hızlı Görev Atama Modal */}
      {quickTaskModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Hızlı Görev Atama</h3>
                {quickTaskModalOpen && (() => {
                  const staff = staffList.find(s => s.id === quickTaskModalOpen)
                  return staff && (
                    <p className="text-sm text-gray-500 mt-1">
                      {staff.name} {staff.surname} ({staff.role})
                    </p>
                  )
                })()}
              </div>
              <button
                onClick={() => {
                  setQuickTaskModalOpen(null)
                  setTaskForm({ staffId: '', taskType: 'routine', urgency: 'normal', description: '' })
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <form onSubmit={handleQuickTaskSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  Görev Açıklaması *
                </label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  rows={4}
                  placeholder="Görev detaylarını yazın..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex-1 justify-center"
                >
                  <Send className="w-4 h-4" />
                  Görevi Ata
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickTaskModalOpen(null)
                    setTaskForm({ staffId: '', taskType: 'routine', urgency: 'normal', description: '' })
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Personel Detay Modal - Görevler */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedStaff(null)
          setUserTasks([])
          setError('')
          setSuccess('')
        }}
        title={selectedStaff ? `${selectedStaff.name} ${selectedStaff.surname} - Görevler` : 'Görevler'}
        size="lg"
      >
        <div className="space-y-4">
          {loadingTasks ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Görevler yükleniyor...</span>
            </div>
          ) : userTasks.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">{error || 'Bu personele ait görev bulunmuyor'}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {userTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{task.title || 'Görev Başlığı'}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {task.assignedAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Atandı: {new Date(task.assignedAt).toLocaleDateString('tr-TR')}</span>
                          </div>
                        )}
                        {task.taskType && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {task.taskType}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getTaskStatusColor(task.status)}`}>
                      {getTaskStatusLabel(task.status)}
                    </div>
                  </div>

                  {/* Durum Değiştirme Butonları */}
                  {(task.status === 'pending' || task.status === 'BEKLIYOR') && (
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, 'ONAYLANDI')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Onayla
                      </button>
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, 'REDDEDILDI')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reddet
                      </button>
                      <button
                        onClick={() => window.open(`/panel/yonetici/onay-bekleyenler/${task.id}`, '_blank')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detay
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Error/Success Messages */}
          {error && !loadingTasks && userTasks.length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>{success}</span>
            </div>
          )}

          {/* Close Button */}
          <div className="flex items-center justify-end pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setDetailModalOpen(false)
                setSelectedStaff(null)
                setUserTasks([])
                setError('')
                setSuccess('')
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              Kapat
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
