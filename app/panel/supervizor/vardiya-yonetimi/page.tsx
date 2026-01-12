'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  CalendarCheck,
  Clock,
  Users,
  Edit,
  Search,
  Filter,
  X,
  Check,
  AlertCircle,
  Building2,
  Loader2
} from 'lucide-react'
import RouteGuard from '@/components/auth/RouteGuard'
import LogoutButton from '@/components/auth/LogoutButton'
import Modal from '@/components/ui/Modal'

interface StaffMember {
  id: string
  name: string
  surname: string
  fullName: string
  role: string
  displayRole: string
  branchId: string
  branchName: string
  workScheduleType: 'SABIT_MESAI' | 'VARDIYALI_MESAI' | null
  fixedWorkStartTime: string | null
  fixedWorkEndTime: string | null
  fixedWorkOffDay: string | null
  shiftSchedule: string | null // JSON string: {"Pazartesi": "09:00-17:30", "Salı": "off", ...}
}

interface DayStatus {
  date: Date
  dayName: string
  isOffDay: boolean
  isExtraLeave: boolean
  isSickLeave: boolean
  workStartTime: string | null
  workEndTime: string | null
}

export default function VardiyaYonetimiPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<{ staffId: string; date: Date } | null>(null)
  const [isDayModalOpen, setIsDayModalOpen] = useState(false)
  const [dayModalType, setDayModalType] = useState<'leave' | 'sick' | null>(null)

  // Form state for editing
  const [editFormData, setEditFormData] = useState({
    workScheduleType: '',
    fixedWorkStartTime: '',
    fixedWorkEndTime: '',
    fixedWorkOffDay: '',
    shiftSchedule: ''
  })
  const [editShiftScheduleDays, setEditShiftScheduleDays] = useState<Record<string, string>>({})

  // Fetch staff data
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/staff')
        if (response.ok) {
          const data = await response.json()
          // Filter for Mehmetçik Şubesi
          const mehmetcikBranch = data.staff?.find((s: any) => s.branchName === 'Mehmetçik Şubesi')
          const branchId = mehmetcikBranch?.branchId
          
          let staffData = []
          if (branchId) {
            const branchResponse = await fetch(`/api/admin/staff?branchId=${branchId}`)
            if (branchResponse.ok) {
              const branchData = await branchResponse.json()
              staffData = branchData.staff || []
            }
          } else {
            staffData = data.staff || []
          }
          
          // Ensure fullName exists for all staff members
          const processedStaff = staffData.map((s: any) => ({
            ...s,
            fullName: s.fullName || `${s.name || ''} ${s.surname || ''}`.trim() || 'İsimsiz'
          }))
          
          setStaff(processedStaff)
        }
      } catch (error) {
        console.error('Error fetching staff:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStaff()
  }, [])

  // Statistics
  const stats = useMemo(() => {
    const today = new Date()
    const todayDayName = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][today.getDay()]
    
    const totalStaff = staff.length
    const onLeaveToday = staff.filter(s => {
      if (s.workScheduleType === 'SABIT_MESAI' && s.fixedWorkOffDay === todayDayName) {
        return true
      }
      // TODO: Check for extra leave days from database
      return false
    }).length
    
    const atWorkToday = totalStaff - onLeaveToday

    return {
      totalStaff,
      onLeaveToday,
      atWorkToday
    }
  }, [staff])

  // Filtered staff
  const filteredStaff = useMemo(() => {
    let result = staff

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(s => {
        const fullName = s.fullName || `${s.name || ''} ${s.surname || ''}`.trim() || ''
        const displayRole = s.displayRole || s.role || ''
        return fullName.toLowerCase().includes(term) ||
               displayRole.toLowerCase().includes(term)
      })
    }

    // Role filter
    if (roleFilter !== 'all') {
      result = result.filter(s => s.role === roleFilter || s.displayRole === roleFilter)
    }

    // Sort: Mehmetçik Şubesi first, then by name
    result = result.sort((a, b) => {
      if (a.branchName === 'Mehmetçik Şubesi' && b.branchName !== 'Mehmetçik Şubesi') return -1
      if (a.branchName !== 'Mehmetçik Şubesi' && b.branchName === 'Mehmetçik Şubesi') return 1
      const aName = a.fullName || `${a.name || ''} ${a.surname || ''}`.trim() || ''
      const bName = b.fullName || `${b.name || ''} ${b.surname || ''}`.trim() || ''
      return aName.localeCompare(bName)
    })

    return result
  }, [staff, searchTerm, roleFilter])

  // Get week days
  const getWeekDays = () => {
    const today = new Date()
    const monday = new Date(today)
    const day = monday.getDay()
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
    monday.setDate(diff)
    
    const days: DayStatus[] = []
    const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      days.push({
        date,
        dayName: dayNames[i],
        isOffDay: false,
        isExtraLeave: false,
        isSickLeave: false,
        workStartTime: null,
        workEndTime: null
      })
    }
    
    return days
  }

  // Get day status for a staff member
  const getDayStatus = (staffMember: StaffMember, day: DayStatus): DayStatus => {
    const status = { ...day }
    
    if (staffMember.workScheduleType === 'SABIT_MESAI') {
      if (staffMember.fixedWorkOffDay === day.dayName) {
        status.isOffDay = true
      } else {
        status.workStartTime = staffMember.fixedWorkStartTime
        status.workEndTime = staffMember.fixedWorkEndTime
      }
    } else if (staffMember.workScheduleType === 'VARDIYALI_MESAI') {
      // Parse shiftSchedule JSON
      if (staffMember.shiftSchedule) {
        try {
          const schedule = JSON.parse(staffMember.shiftSchedule)
          const daySchedule = schedule[day.dayName]
          
          if (daySchedule === 'off') {
            status.isOffDay = true
          } else if (daySchedule) {
            // Parse time range (e.g., "09:00-17:30")
            const [start, end] = daySchedule.split('-')
            status.workStartTime = start?.trim() || null
            status.workEndTime = end?.trim() || null
          }
        } catch (e) {
          console.error('Error parsing shiftSchedule:', e)
        }
      }
    }
    
    // TODO: Check for extra leave or sick leave from database
    
    return status
  }

  // Handle edit button click
  const handleEdit = (staffMember: StaffMember) => {
    setEditingStaff(staffMember)
    
    // Parse shiftSchedule if it exists
    let parsedShiftSchedule: Record<string, string> = {}
    if (staffMember.shiftSchedule) {
      try {
        parsedShiftSchedule = JSON.parse(staffMember.shiftSchedule)
      } catch (e) {
        console.error('Error parsing shiftSchedule:', e)
      }
    }
    
    setEditFormData({
      workScheduleType: staffMember.workScheduleType || '',
      fixedWorkStartTime: staffMember.fixedWorkStartTime || '',
      fixedWorkEndTime: staffMember.fixedWorkEndTime || '',
      fixedWorkOffDay: staffMember.fixedWorkOffDay || '',
      shiftSchedule: staffMember.shiftSchedule || ''
    })
    setEditShiftScheduleDays(parsedShiftSchedule)
    setIsEditModalOpen(true)
  }

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingStaff) return

    try {
      // If vardiyalı mesai, use editShiftScheduleDays
      const finalShiftSchedule = editFormData.workScheduleType === 'VARDIYALI_MESAI' 
        ? JSON.stringify(editShiftScheduleDays)
        : editFormData.shiftSchedule

      const response = await fetch(`/api/admin/users/${editingStaff.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workScheduleType: editFormData.workScheduleType || undefined,
          fixedWorkStartTime: editFormData.workScheduleType === 'SABIT_MESAI' ? editFormData.fixedWorkStartTime : undefined,
          fixedWorkEndTime: editFormData.workScheduleType === 'SABIT_MESAI' ? editFormData.fixedWorkEndTime : undefined,
          fixedWorkOffDay: editFormData.workScheduleType === 'SABIT_MESAI' ? editFormData.fixedWorkOffDay : undefined,
          shiftSchedule: editFormData.workScheduleType === 'VARDIYALI_MESAI' ? finalShiftSchedule : undefined
        })
      })

      if (response.ok) {
        // Refresh staff data
        const mehmetcikBranch = staff.find(s => s.branchName === 'Mehmetçik Şubesi')
        const branchId = mehmetcikBranch?.branchId
        
        let staffData = []
        if (branchId) {
          const branchResponse = await fetch(`/api/admin/staff?branchId=${branchId}`)
          if (branchResponse.ok) {
            const branchData = await branchResponse.json()
            staffData = branchData.staff || []
          }
        } else {
          const fetchResponse = await fetch('/api/admin/staff')
          if (fetchResponse.ok) {
            const data = await fetchResponse.json()
            staffData = data.staff || []
          }
        }
        
        const processedStaff = staffData.map((s: any) => ({
          ...s,
          fullName: s.fullName || `${s.name || ''} ${s.surname || ''}`.trim() || 'İsimsiz'
        }))
        
        setStaff(processedStaff)
        setIsEditModalOpen(false)
        setEditingStaff(null)
        setEditShiftScheduleDays({})
      }
    } catch (error) {
      console.error('Error updating staff:', error)
    }
  }

  // Handle day click
  const handleDayClick = (staffId: string, date: Date) => {
    setSelectedDay({ staffId, date })
    setIsDayModalOpen(true)
  }

  // Handle day status update
  const handleDayStatusUpdate = async (type: 'leave' | 'sick') => {
    if (!selectedDay) return

    // TODO: Implement API call to save extra leave or sick leave
    console.log('Updating day status:', selectedDay, type)
    
    setIsDayModalOpen(false)
    setSelectedDay(null)
    setDayModalType(null)
  }

  const weekDays = getWeekDays()

  return (
    <RouteGuard requiredRoles={['SUPERVIZOR']}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Header */}
        <header className="bg-gradient-to-r from-amber-900/30 via-yellow-900/20 to-amber-900/30 border-b border-amber-700/30 backdrop-blur-md sticky top-0 z-50 -mt-2">
          <div className="px-4 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/panel/supervizor')}
                  className="text-amber-400 hover:text-amber-300 transition-colors"
                >
                  ← Geri
                </button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg">
                  <CalendarCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-amber-400">İzin/Vardiya Yönetimi</h1>
                  <p className="text-[10px] text-amber-200/70">Personel Mesai ve İzin Takibi</p>
                </div>
              </div>
              <LogoutButton variant="icon" showShiftEnd={false} />
            </div>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-blue-800/50 to-blue-900/50 rounded-lg border border-blue-700/30 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-blue-300">Toplam Personel</span>
              </div>
              <p className="text-xl font-bold text-white">{stats.totalStaff}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-800/50 to-orange-900/50 rounded-lg border border-orange-700/30 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-semibold text-orange-300">Bugün İzinli</span>
              </div>
              <p className="text-xl font-bold text-white">{stats.onLeaveToday}</p>
            </div>
            <div className="bg-gradient-to-br from-green-800/50 to-green-900/50 rounded-lg border border-green-700/30 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-green-400" />
                <span className="text-xs font-semibold text-green-300">Şu An Mesaide</span>
              </div>
              <p className="text-xl font-bold text-white">{stats.atWorkToday}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-lg border border-amber-700/30 p-3 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Personel ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                >
                  <option value="all">Tüm Roller</option>
                  <option value="MANAGER">Yönetici</option>
                  <option value="Satınalma">Satınalma</option>
                  <option value="Kasiyer">Kasiyer</option>
                  <option value="Kurye">Kurye</option>
                  <option value="Yazılımcı">Yazılımcı</option>
                </select>
              </div>
            </div>
          </div>

          {/* Staff List with Calendar */}
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-lg border border-amber-700/30 backdrop-blur-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
                <p className="text-gray-400 mt-2 text-sm">Yükleniyor...</p>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                <p>Personel bulunamadı</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700/50">
                      <th className="px-4 py-2 text-left text-[10px] font-semibold text-amber-400 uppercase">Personel</th>
                      <th className="px-2 py-2 text-center text-[10px] font-semibold text-amber-400 uppercase">Pzt</th>
                      <th className="px-2 py-2 text-center text-[10px] font-semibold text-amber-400 uppercase">Sal</th>
                      <th className="px-2 py-2 text-center text-[10px] font-semibold text-amber-400 uppercase">Çar</th>
                      <th className="px-2 py-2 text-center text-[10px] font-semibold text-amber-400 uppercase">Per</th>
                      <th className="px-2 py-2 text-center text-[10px] font-semibold text-amber-400 uppercase">Cum</th>
                      <th className="px-2 py-2 text-center text-[10px] font-semibold text-amber-400 uppercase">Cmt</th>
                      <th className="px-2 py-2 text-center text-[10px] font-semibold text-amber-400 uppercase">Paz</th>
                      <th className="px-4 py-2 text-center text-[10px] font-semibold text-amber-400 uppercase">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {filteredStaff.map((staffMember) => (
                      <tr key={staffMember.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-600 to-yellow-600 flex items-center justify-center text-[10px] font-bold">
                              {staffMember.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-white">{staffMember.fullName}</p>
                              <p className="text-[10px] text-gray-400">{staffMember.displayRole}</p>
                            </div>
                          </div>
                        </td>
                        {weekDays.map((day) => {
                          const dayStatus = getDayStatus(staffMember, day)
                          return (
                            <td
                              key={day.dayName}
                              className="px-2 py-2 text-center cursor-pointer hover:bg-gray-700/30 transition-colors"
                              onClick={() => handleDayClick(staffMember.id, day.date)}
                            >
                              <div className="flex flex-col items-center gap-1">
                                {dayStatus.isOffDay ? (
                                  <div className="w-8 h-8 rounded bg-orange-500/30 border border-orange-500/50 flex items-center justify-center">
                                    <span className="text-[8px] text-orange-400 font-medium">İzin</span>
                                  </div>
                                ) : dayStatus.isExtraLeave ? (
                                  <div className="w-8 h-8 rounded bg-red-500/30 border border-red-500/50 flex items-center justify-center">
                                    <span className="text-[8px] text-red-400 font-medium">Ekstra</span>
                                  </div>
                                ) : dayStatus.isSickLeave ? (
                                  <div className="w-8 h-8 rounded bg-purple-500/30 border border-purple-500/50 flex items-center justify-center">
                                    <span className="text-[8px] text-purple-400 font-medium">Rapor</span>
                                  </div>
                                ) : dayStatus.workStartTime ? (
                                  <div className="w-8 h-8 rounded bg-blue-500/30 border border-blue-500/50 flex flex-col items-center justify-center p-1">
                                    <span className="text-[7px] text-blue-300 font-medium">{dayStatus.workStartTime}</span>
                                    <span className="text-[7px] text-blue-300">-</span>
                                    <span className="text-[7px] text-blue-300 font-medium">{dayStatus.workEndTime}</span>
                                  </div>
                                ) : staffMember.workScheduleType === 'VARDIYALI_MESAI' ? (
                                  <div className="w-8 h-8 rounded bg-purple-500/30 border border-purple-500/50 flex items-center justify-center">
                                    <span className="text-[8px] text-purple-400 font-medium">Var</span>
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded bg-gray-700/30 border border-gray-600/50 flex items-center justify-center">
                                    <span className="text-[8px] text-gray-500">-</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          )
                        })}
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleEdit(staffMember)}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            Düzenle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingStaff(null)
            setEditShiftScheduleDays({})
          }}
          title="Mesai Düzenle"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mesai Türü
              </label>
              <select
                value={editFormData.workScheduleType}
                onChange={(e) => {
                  const newType = e.target.value
                  setEditFormData({
                    ...editFormData,
                    workScheduleType: newType,
                    fixedWorkStartTime: newType !== 'SABIT_MESAI' ? '' : editFormData.fixedWorkStartTime,
                    fixedWorkEndTime: newType !== 'SABIT_MESAI' ? '' : editFormData.fixedWorkEndTime,
                    fixedWorkOffDay: newType !== 'SABIT_MESAI' ? '' : editFormData.fixedWorkOffDay,
                    shiftSchedule: newType !== 'VARDIYALI_MESAI' ? '' : editFormData.shiftSchedule
                  })
                  if (newType !== 'VARDIYALI_MESAI') {
                    setEditShiftScheduleDays({})
                  }
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
              >
                <option value="">Seçiniz...</option>
                <option value="SABIT_MESAI">Sabit Mesai</option>
                <option value="VARDIYALI_MESAI">Vardiyalı Mesai</option>
              </select>
            </div>

            {editFormData.workScheduleType === 'SABIT_MESAI' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Başlama Saati
                  </label>
                  <input
                    type="time"
                    value={editFormData.fixedWorkStartTime}
                    onChange={(e) => setEditFormData({ ...editFormData, fixedWorkStartTime: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Bitiş Saati
                  </label>
                  <input
                    type="time"
                    value={editFormData.fixedWorkEndTime}
                    onChange={(e) => setEditFormData({ ...editFormData, fixedWorkEndTime: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    İzin Günü
                  </label>
                  <select
                    value={editFormData.fixedWorkOffDay}
                    onChange={(e) => setEditFormData({ ...editFormData, fixedWorkOffDay: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                  >
                    <option value="">Seçiniz...</option>
                    <option value="Pazartesi">Pazartesi</option>
                    <option value="Salı">Salı</option>
                    <option value="Çarşamba">Çarşamba</option>
                    <option value="Perşembe">Perşembe</option>
                    <option value="Cuma">Cuma</option>
                    <option value="Cumartesi">Cumartesi</option>
                    <option value="Pazar">Pazar</option>
                  </select>
                </div>
              </>
            )}

            {editFormData.workScheduleType === 'VARDIYALI_MESAI' && (() => {
              // Get tomorrow and next 7 days (excluding today and past dates)
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const tomorrow = new Date(today)
              tomorrow.setDate(today.getDate() + 1)
              
              const weekDays = []
              const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
              
              for (let i = 0; i < 7; i++) {
                const date = new Date(tomorrow)
                date.setDate(tomorrow.getDate() + i)
                const dayIndex = date.getDay()
                const dayName = dayNames[dayIndex === 0 ? 6 : dayIndex - 1] // Adjust for Monday = 0
                weekDays.push({
                  date,
                  dayName
                })
              }

              const shiftTypes = [
                { value: '09:00-17:30', label: '09:00-17:30', color: 'bg-blue-500 hover:bg-blue-600' },
                { value: '16:30-01:00', label: '16:30-01:00', color: 'bg-purple-500 hover:bg-purple-600' },
                { value: '10:30-19:00', label: '10:30-19:00', color: 'bg-indigo-500 hover:bg-indigo-600' },
                { value: 'off', label: 'İzinli', color: 'bg-orange-500 hover:bg-orange-600' }
              ]

              const handleShiftTypeClick = (dayName: string, shiftType: string) => {
                const newSchedule = { ...editShiftScheduleDays }
                // If clicking the same type, remove it (toggle off)
                if (newSchedule[dayName] === shiftType) {
                  delete newSchedule[dayName]
                } else {
                  newSchedule[dayName] = shiftType
                }
                setEditShiftScheduleDays(newSchedule)
                // Update editFormData.shiftSchedule as JSON string
                setEditFormData({ ...editFormData, shiftSchedule: JSON.stringify(newSchedule) })
              }

              // Check if all 7 days are selected (excluding 'off' days)
              const selectedDaysCount = Object.keys(editShiftScheduleDays).filter(
                day => editShiftScheduleDays[day] !== 'off'
              ).length
              const allDaysSelected = selectedDaysCount === 7
              
              // Check if 2 or more days are marked as 'off' (leave days)
              const offDaysCount = Object.keys(editShiftScheduleDays).filter(
                day => editShiftScheduleDays[day] === 'off'
              ).length
              const hasMultipleOffDays = offDaysCount >= 2

              return (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    1 Haftalık Vardiya Döngüsü
                  </label>
                  <div className="space-y-3">
                    {weekDays.map((day) => {
                      return (
                        <div key={`${day.dayName}-${day.date.getTime()}`} className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-700 min-w-[80px]">
                                {day.dayName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {day.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </span>
                            </div>
                            {editShiftScheduleDays[day.dayName] && (
                              <span className="text-xs text-green-600 font-medium">
                                Seçili: {editShiftScheduleDays[day.dayName] === 'off' ? 'İzinli' : editShiftScheduleDays[day.dayName]}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {shiftTypes.map((shiftType) => {
                              const isSelected = editShiftScheduleDays[day.dayName] === shiftType.value
                              return (
                                <button
                                  key={shiftType.value}
                                  type="button"
                                  onClick={() => handleShiftTypeClick(day.dayName, shiftType.value)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all ${
                                    isSelected
                                      ? `${shiftType.color} ring-2 ring-offset-2 ring-blue-400 shadow-lg`
                                      : `${shiftType.color} opacity-70 hover:opacity-100`
                                  }`}
                                >
                                  {shiftType.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {allDaysSelected && (
                    <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-yellow-800">
                            ⚠️ Fazla Mesai Uyarısı
                          </p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Haftanın tamamı için mesai girdiniz. Bu kişiye fazla mesai ödenmesi gerekecektir. Lütfen kontrol edin.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {hasMultipleOffDays && (
                    <div className="mt-3 bg-red-50 border border-red-300 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-red-800">
                            ⚠️ Eksik Çalışma Uyarısı
                          </p>
                          <p className="text-xs text-red-700 mt-1">
                            Personel eksik çalışacak ve eksik maaş alacak. Bunu yapmak istediğinize emin misiniz?
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    💡 Her gün için bir vardiya tipi seçin. Aynı butona tekrar tıklayarak seçimi iptal edebilirsiniz. Sadece yarın ve sonraki 7 gün gösterilmektedir.
                  </p>
                </div>
              )
            })()}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsEditModalOpen(false)
                  setEditingStaff(null)
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Kaydet
              </button>
            </div>
          </div>
        </Modal>

        {/* Day Status Modal */}
        <Modal
          isOpen={isDayModalOpen}
          onClose={() => {
            setIsDayModalOpen(false)
            setSelectedDay(null)
            setDayModalType(null)
          }}
          title="Gün Durumu"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {selectedDay && new Date(selectedDay.date).toLocaleDateString('tr-TR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDayModalType('leave')
                  handleDayStatusUpdate('leave')
                }}
                className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium"
              >
                Ekstra İzinli
              </button>
              <button
                onClick={() => {
                  setDayModalType('sick')
                  handleDayStatusUpdate('sick')
                }}
                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
              >
                Raporlu
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </RouteGuard>
  )
}
