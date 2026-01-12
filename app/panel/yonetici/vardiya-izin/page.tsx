'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { CalendarCheck, Clock, Plus, Search, Edit, Trash2, CheckCircle2, XCircle, AlertCircle, Send, User as UserIcon, Filter, Loader2, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import InputModal from '@/components/ui/InputModal'

interface Shift {
  id: string
  userId: string
  userName: string
  userRole: string
  shiftDate: string
  startTime: string
  endTime: string
  actualStart: string | null
  actualEnd: string | null
  isActive: boolean
  weeklyHours: number
  assignedBy: string | null
}

interface LeaveRequest {
  id: string
  userId: string
  userName: string
  userRole: string
  startDate: string
  endDate: string
  type: string
  description: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  submittedAt: string
}

type TabType = 'shifts' | 'leaves'

export default function VardiyaIzinPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<TabType>('shifts')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  
  // Shift Modal States
  const [shiftModalOpen, setShiftModalOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [shiftForm, setShiftForm] = useState({
    userId: '',
    shiftDate: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '18:00',
    weeklyHours: 40
  })
  
  // Leave Modal States
  const [leaveModalOpen, setLeaveModalOpen] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null)
  const [processing, setProcessing] = useState(false)
  const [approveMessage, setApproveMessage] = useState('')
  const [rejectMessage, setRejectMessage] = useState('')
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  
  // Users list (for shift assignment)
  const [users, setUsers] = useState<Array<{ id: string; username: string; fullName: string; role: string }>>([])

  // Kullanıcıları yükle (vardiya atama için)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/admin/users')
        if (response.ok) {
          const data = await response.json()
          // Yöneticiler personel listesinde görünmez - sadece STAFF, DEVELOPER, KASIYER görünür
          const filteredUsers = (data.users || []).filter((u: any) => 
            ['STAFF', 'DEVELOPER', 'KASIYER'].includes(u.role)
          )
          setUsers(filteredUsers)
        } else {
          // Eğer API hatası varsa, boş liste göster
          setUsers([])
        }
      } catch (error) {
        console.error('Error fetching users:', error)
        setUsers([])
      }
    }

    if (session?.user) {
      fetchUsers()
    }
  }, [session])

  // Vardiyaları ve izin taleplerini yükle
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Vardiyaları çek
        const shiftsResponse = await fetch('/api/shifts')
        if (shiftsResponse.ok) {
          const shiftsData = await shiftsResponse.json()
          setShifts(shiftsData.shifts || [])
        }

        // İzin taleplerini çek
        const leavesResponse = await fetch('/api/leave-requests')
        if (leavesResponse.ok) {
          const leavesData = await leavesResponse.json()
          setLeaveRequests(leavesData.leaveRequests || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    
    // Her 30 saniyede bir güncelle
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Vardiya oluştur/güncelle
  const handleShiftSubmit = async () => {
    if (!shiftForm.userId || !shiftForm.shiftDate || !shiftForm.startTime || !shiftForm.endTime) {
      alert('Lütfen tüm alanları doldurun')
      return
    }

    setProcessing(true)
    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...shiftForm,
          shiftId: editingShift?.id || null
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(editingShift ? 'Vardiya güncellendi' : 'Vardiya başarıyla oluşturuldu')
        setShiftModalOpen(false)
        setEditingShift(null)
        setShiftForm({
          userId: '',
          shiftDate: new Date().toISOString().split('T')[0],
          startTime: '08:00',
          endTime: '18:00',
          weeklyHours: 40
        })
        
        // Vardiyaları yeniden yükle
        const shiftsResponse = await fetch('/api/shifts')
        if (shiftsResponse.ok) {
          const shiftsData = await shiftsResponse.json()
          setShifts(shiftsData.shifts || [])
        }
      } else {
        alert(data.error || 'Vardiya kaydedilirken bir hata oluştu')
      }
    } catch (error) {
      console.error('Error saving shift:', error)
      alert('Vardiya kaydedilirken bir hata oluştu')
    } finally {
      setProcessing(false)
    }
  }

  // Vardiya düzenle
  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift)
    setShiftForm({
      userId: shift.userId,
      shiftDate: shift.shiftDate,
      startTime: shift.startTime,
      endTime: shift.endTime,
      weeklyHours: shift.weeklyHours
    })
    setShiftModalOpen(true)
  }

  // Vardiya sil
  const handleDeleteShift = async (shiftId: string) => {
    // TODO: DELETE endpoint ekle
    alert('Vardiya silme özelliği yakında eklenecek')
  }

  // İzin onayla/reddet
  const handleLeaveAction = async (action: 'approve' | 'reject', leaveId: string, message?: string) => {
    if (action === 'reject' && !message?.trim()) {
      alert('Lütfen red nedeni girin')
      return
    }

    setProcessing(true)
    try {
      const response = await fetch(`/api/leave-requests/${leaveId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: action,
          message: message || ''
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(action === 'approve' ? 'İzin talebi onaylandı' : 'İzin talebi reddedildi')
        setApproveModalOpen(false)
        setRejectModalOpen(false)
        setSelectedLeave(null)
        setApproveMessage('')
        setRejectMessage('')
        
        // İzin taleplerini yeniden yükle
        const leavesResponse = await fetch('/api/leave-requests')
        if (leavesResponse.ok) {
          const leavesData = await leavesResponse.json()
          setLeaveRequests(leavesData.leaveRequests || [])
        }
      } else {
        alert(data.error || 'İzin talebi güncellenirken bir hata oluştu')
      }
    } catch (error) {
      console.error('Error updating leave request:', error)
      alert('İzin talebi güncellenirken bir hata oluştu')
    } finally {
      setProcessing(false)
    }
  }

  // Filtreleme
  const filteredShifts = shifts.filter(shift => {
    const matchesSearch = searchQuery === '' || 
      shift.userName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const filteredLeaves = leaveRequests.filter(leave => {
    const matchesSearch = searchQuery === '' || 
      leave.userName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || leave.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vardiya & İzin Yönetimi</h1>
        {activeTab === 'shifts' && (
          <button
            onClick={() => {
              setEditingShift(null)
              setShiftForm({
                userId: '',
                shiftDate: new Date().toISOString().split('T')[0],
                startTime: '08:00',
                endTime: '18:00',
                weeklyHours: 40
              })
              setShiftModalOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
          >
            <Plus className="w-5 h-5" />
            <span>Vardiya Ata</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('shifts')}
            className={`flex-1 px-4 py-3 text-center font-semibold transition-colors ${
              activeTab === 'shifts'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Vardiyalar</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`flex-1 px-4 py-3 text-center font-semibold transition-colors border-l border-gray-200 ${
              activeTab === 'leaves'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <CalendarCheck className="w-4 h-4" />
              <span>İzin Talepleri</span>
              {leaveRequests.filter(l => l.status === 'pending').length > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {leaveRequests.filter(l => l.status === 'pending').length}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Personel adı ile ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {activeTab === 'leaves' && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedStatus('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    selectedStatus === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Tümü
                </button>
                <button
                  onClick={() => setSelectedStatus('pending')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedStatus === 'pending'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Bekleyen ({leaveRequests.filter(l => l.status === 'pending').length})
                </button>
                <button
                  onClick={() => setSelectedStatus('approved')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedStatus === 'approved'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Onaylanan ({leaveRequests.filter(l => l.status === 'approved').length})
                </button>
                <button
                  onClick={() => setSelectedStatus('rejected')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedStatus === 'rejected'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Reddedilen ({leaveRequests.filter(l => l.status === 'rejected').length})
                </button>
              </div>
            )}
          </div>

          {activeTab === 'shifts' ? (
            <div className="space-y-4">
              {filteredShifts.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium mb-2">Henüz vardiya atanmamış</p>
                  <p className="text-sm text-gray-400">Personel için vardiya atamak için yukarıdaki butona tıklayın</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Personel</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Başlangıç</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bitiş</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Haftalık Saat</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredShifts.map((shift) => (
                        <tr key={shift.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <UserIcon className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{shift.userName}</p>
                                <p className="text-xs text-gray-500">{shift.userRole}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(shift.shiftDate).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{shift.startTime}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{shift.endTime}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{shift.weeklyHours} saat</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              shift.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {shift.isActive ? 'Aktif' : 'Pasif'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditShift(shift)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                title="Düzenle"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteShift(shift.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                                title="Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLeaves.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <CalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium mb-2">İzin talebi bulunamadı</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLeaves.map((leave) => (
                    <div
                      key={leave.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <UserIcon className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="font-semibold text-gray-900">{leave.userName}</p>
                              <p className="text-xs text-gray-500">{leave.userRole}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              leave.type === 'annual' ? 'bg-blue-100 text-blue-800' :
                              leave.type === 'health' ? 'bg-red-100 text-red-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {leave.type === 'annual' ? 'Yıllık İzin' : leave.type === 'health' ? 'Sağlık İzni' : 'Mazeret İzni'}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              leave.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                              leave.status === 'approved' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {leave.status === 'pending' ? 'Beklemede' : leave.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">
                            {new Date(leave.startDate).toLocaleDateString('tr-TR')} - {new Date(leave.endDate).toLocaleDateString('tr-TR')}
                          </p>
                          {leave.description && (
                            <p className="text-sm text-gray-600 mb-2">{leave.description}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            Gönderildi: {new Date(leave.submittedAt).toLocaleString('tr-TR')}
                          </p>
                          {leave.reviewedAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              {leave.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}: {new Date(leave.reviewedAt).toLocaleString('tr-TR')} - {leave.reviewedByName || 'Yönetici'}
                            </p>
                          )}
                        </div>
                        {leave.status === 'pending' && (
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => {
                                setSelectedLeave(leave)
                                setApproveMessage('')
                                setApproveModalOpen(true)
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Onayla
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLeave(leave)
                                setRejectMessage('')
                                setRejectModalOpen(true)
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                            >
                              <XCircle className="w-4 h-4" />
                              Reddet
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Vardiya Atama Modal */}
      {shiftModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-blue-600" />
                {editingShift ? 'Vardiya Düzenle' : 'Vardiya Ata'}
              </h3>
              <button
                onClick={() => {
                  setShiftModalOpen(false)
                  setEditingShift(null)
                }}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleShiftSubmit(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personel <span className="text-red-500">*</span>
                </label>
                <select
                  value={shiftForm.userId}
                  onChange={(e) => setShiftForm({ ...shiftForm, userId: e.target.value })}
                  required
                  disabled={!!editingShift}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100"
                >
                  <option value="">Personel Seçin</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} ({
                        user.role === 'STAFF' ? 'Sahadaki Personel' : 
                        user.role === 'DEVELOPER' ? 'Yazılımcı' : 
                        user.role === 'KASIYER' ? 'Kasiyer' : 
                        user.role === 'MANAGER' ? 'Yönetici' : 
                        user.role
                      })
                    </option>
                  ))}
                  {users.length === 0 && (
                    <option value="" disabled>Personel bulunamadı</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vardiya Tarihi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={shiftForm.shiftDate}
                  onChange={(e) => setShiftForm({ ...shiftForm, shiftDate: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Başlangıç Saati <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bitiş Saati <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Haftalık Çalışma Saati
                </label>
                <input
                  type="number"
                  value={shiftForm.weeklyHours}
                  onChange={(e) => setShiftForm({ ...shiftForm, weeklyHours: parseInt(e.target.value) || 40 })}
                  min={1}
                  max={60}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShiftModalOpen(false)
                    setEditingShift(null)
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Kaydet</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* İzin Onay Modal */}
      <InputModal
        isOpen={approveModalOpen}
        onClose={() => {
          setApproveModalOpen(false)
          setSelectedLeave(null)
          setApproveMessage('')
        }}
        onConfirm={(message) => {
          if (selectedLeave) {
            handleLeaveAction('approve', selectedLeave.id, typeof message === 'string' ? message : '')
          }
        }}
        title="İzin Talebini Onayla"
        label="Onay Mesajı"
        placeholder="Onay mesajı (opsiyonel)"
        type="textarea"
        defaultValue={approveMessage}
        confirmText="Onayla"
        loading={processing}
        required={false}
      />
      
      {/* İzin Red Modal */}
      <InputModal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false)
          setSelectedLeave(null)
          setRejectMessage('')
        }}
        onConfirm={(message) => {
          if (selectedLeave) {
            const msg = typeof message === 'string' ? message : ''
            if (!msg.trim()) {
              alert('Lütfen red nedeni girin')
              return
            }
            handleLeaveAction('reject', selectedLeave.id, msg)
          }
        }}
        title="İzin Talebini Reddet"
        label="Red Nedeni"
        placeholder="Red nedeni (zorunlu)"
        type="textarea"
        defaultValue={rejectMessage}
        confirmText="Reddet"
        loading={processing}
        required={true}
      />
    </div>
  )
}
