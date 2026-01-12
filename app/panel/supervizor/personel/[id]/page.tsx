'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ArrowLeft,
  User,
  Clock,
  Calendar,
  FileText,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Building2,
  Phone,
  Mail,
  Briefcase,
  TrendingUp,
  Activity,
} from 'lucide-react'
import RouteGuard from '@/components/auth/RouteGuard'
import LogoutButton from '@/components/auth/LogoutButton'

interface PersonDetail {
  id: string
  name: string
  surname: string
  fullName: string
  role: string
  displayRole: string
  username: string
  staffDuty: string | null
  phone: string | null
  branchId: string | null
  branchName: string | null
  managerName: string | null
  workScheduleType: string | null
  fixedWorkStartTime: string | null
  fixedWorkEndTime: string | null
  fixedWorkOffDay: string | null
  shiftSchedule: string | null
  createdAt: string
  updatedAt: string
}

interface Activity {
  id: string
  type: 'LOGIN' | 'LOGOUT'
  createdAt: string
  formattedTime: string
  latitude: number | null
  longitude: number | null
}

interface Task {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  assignedAt: string | null
  submittedAt: string | null
  createdAt: string
  updatedAt: string
  assignedByName: string | null
}

interface Shift {
  id: string
  shiftDate: string
  startTime: string
  endTime: string
  actualStart: string | null
  actualEnd: string | null
  isActive: boolean
  weeklyHours: number
  formattedDate: string
}

interface Leave {
  id: string
  startDate: string
  endDate: string
  type: string
  status: string
  description: string | null
  createdAt: string
  reviewedAt: string | null
  reviewedByName: string | null
  formattedStartDate: string
  formattedEndDate: string
}

export default function PersonelDetayPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const personId = params.id as string

  const [loading, setLoading] = useState(true)
  const [person, setPerson] = useState<PersonDetail | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [leaves, setLeaves] = useState<Leave[]>([])

  useEffect(() => {
    const fetchPersonDetails = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/admin/staff/${personId}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Personel detayları yüklenemedi')
        }
        
        if (!data.success) {
          throw new Error(data.error || 'Personel detayları yüklenemedi')
        }
        
        setPerson(data.person)
        setActivities(data.activities || [])
        setTasks(data.tasks || [])
        setShifts(data.shifts || [])
        setLeaves(data.leaves || [])
      } catch (error: any) {
        console.error('Error fetching person details:', error)
        alert(`Personel detayları yüklenirken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`)
      } finally {
        setLoading(false)
      }
    }

    if (personId) {
      fetchPersonDetails()
    }
  }, [personId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONAYLANDI':
      case 'completed':
      case 'approved':
        return 'text-green-400 bg-green-900/20 border-green-500/50'
      case 'REDDEDILDI':
      case 'cancelled':
      case 'rejected':
        return 'text-red-400 bg-red-900/20 border-red-500/50'
      case 'BEKLIYOR':
      case 'pending':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/50'
      case 'in_progress':
        return 'text-blue-400 bg-blue-900/20 border-blue-500/50'
      default:
        return 'text-gray-400 bg-gray-900/20 border-gray-500/50'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ONAYLANDI':
        return 'Onaylandı'
      case 'REDDEDILDI':
        return 'Reddedildi'
      case 'BEKLIYOR':
        return 'Bekliyor'
      case 'pending':
        return 'Beklemede'
      case 'in_progress':
        return 'Devam Ediyor'
      case 'completed':
        return 'Tamamlandı'
      case 'cancelled':
        return 'İptal Edildi'
      case 'approved':
        return 'Onaylandı'
      case 'rejected':
        return 'Reddedildi'
      default:
        return status
    }
  }


  if (loading) {
    return (
      <RouteGuard requiredRoles={['SUPERVIZOR']}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      </RouteGuard>
    )
  }

  if (!person) {
    return (
      <RouteGuard requiredRoles={['SUPERVIZOR']}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-xl">Personel bulunamadı</p>
            <button
              onClick={() => router.push('/panel/supervizor')}
              className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
            >
              Geri Dön
            </button>
          </div>
        </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard requiredRoles={['SUPERVIZOR']}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
        {/* Header */}
        <header className="bg-gradient-to-r from-amber-900/30 via-yellow-900/20 to-amber-900/30 border-b border-amber-700/30 backdrop-blur-md sticky top-0 z-50">
          <div className="px-4 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/panel/supervizor')}
                  className="p-2 hover:bg-amber-800/30 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-amber-400" />
                </button>
                <div>
                  <h1 className="text-base font-bold text-amber-400">Personel Detayları</h1>
                  <p className="text-[10px] text-amber-200/70">{person.fullName}</p>
                </div>
              </div>
              <LogoutButton variant="icon" showShiftEnd={false} />
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Personel Bilgileri Kartı */}
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl border border-amber-700/30 p-6 backdrop-blur-sm shadow-xl">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-600 to-yellow-600 flex items-center justify-center text-2xl font-bold">
                {person.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold text-amber-400">{person.fullName}</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{person.displayRole}</span>
                  </div>
                  {person.branchName && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">{person.branchName}</span>
                    </div>
                  )}
                  {person.managerName && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">Yönetici: {person.managerName}</span>
                    </div>
                  )}
                  {person.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">{person.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{person.username}</span>
                  </div>
                  {person.workScheduleType && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">
                        {person.workScheduleType === 'SABIT_MESAI' ? 'Sabit Mesai' : 'Vardiyalı Mesai'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Giriş-Çıkış Geçmişi */}
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl border border-amber-700/30 p-6 backdrop-blur-sm shadow-xl">
            <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Giriş-Çıkış Geçmişi (Son 30 Gün)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-amber-400 uppercase">Tarih/Saat</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-amber-400 uppercase">Tip</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-amber-400 uppercase">Konum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {activities.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-center text-gray-500 text-sm">
                        Giriş-çıkış kaydı bulunamadı
                      </td>
                    </tr>
                  ) : (
                    activities.map((activity) => (
                      <tr key={activity.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-2 text-sm text-gray-300">{activity.formattedTime}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            activity.type === 'LOGIN' 
                              ? 'bg-green-900/50 text-green-400 border border-green-700/50'
                              : 'bg-orange-900/50 text-orange-400 border border-orange-700/50'
                          }`}>
                            {activity.type === 'LOGIN' ? 'Giriş' : 'Çıkış'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center text-xs text-gray-400">
                          {activity.latitude && activity.longitude 
                            ? `${activity.latitude.toFixed(4)}, ${activity.longitude.toFixed(4)}`
                            : '-'
                          }
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Görevler */}
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl border border-amber-700/30 p-6 backdrop-blur-sm shadow-xl">
            <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Görevler (Geçmiş ve Mevcut)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-amber-400 uppercase">Görev</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-amber-400 uppercase">Tip</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-amber-400 uppercase">Durum</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-amber-400 uppercase">Atayan</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-amber-400 uppercase">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-center text-gray-500 text-sm">
                        Görev bulunamadı
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-2">
                          <div>
                            <p className="text-sm font-medium text-white">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-gray-400 mt-1">{task.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="text-xs text-gray-300">
                            {task.type === 'FIYAT_ARASTIRMASI' ? 'Fiyat Araştırması' : 'Standart Görev'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                            {getStatusText(task.status)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center text-xs text-gray-300">
                          {task.assignedByName || '-'}
                        </td>
                        <td className="px-4 py-2 text-center text-xs text-gray-400">
                          {new Date(task.createdAt).toLocaleDateString('tr-TR')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vardiya Geçmişi */}
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl border border-amber-700/30 p-6 backdrop-blur-sm shadow-xl">
            <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Vardiya Geçmişi (Son 30 Gün)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-amber-400 uppercase">Tarih</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-amber-400 uppercase">Başlangıç</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-amber-400 uppercase">Bitiş</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-amber-400 uppercase">Gerçek Başlangıç</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-amber-400 uppercase">Gerçek Bitiş</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-amber-400 uppercase">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {shifts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center text-gray-500 text-sm">
                        Vardiya kaydı bulunamadı
                      </td>
                    </tr>
                  ) : (
                    shifts.map((shift) => (
                      <tr key={shift.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-2 text-sm text-gray-300">{shift.formattedDate}</td>
                        <td className="px-4 py-2 text-center text-sm text-gray-300">{shift.startTime}</td>
                        <td className="px-4 py-2 text-center text-sm text-gray-300">{shift.endTime}</td>
                        <td className="px-4 py-2 text-center text-xs text-gray-400">
                          {shift.actualStart 
                            ? new Date(shift.actualStart).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                            : '-'
                          }
                        </td>
                        <td className="px-4 py-2 text-center text-xs text-gray-400">
                          {shift.actualEnd 
                            ? new Date(shift.actualEnd).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                            : '-'
                          }
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            shift.isActive
                              ? 'bg-green-900/50 text-green-400 border border-green-700/50'
                              : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'
                          }`}>
                            {shift.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* İzin Talepleri */}
          {leaves.length > 0 && (
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl border border-amber-700/30 p-6 backdrop-blur-sm shadow-xl">
              <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                İzin Talepleri
              </h3>
              <div className="space-y-3">
                {leaves.map((leave) => (
                  <div key={leave.id} className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(leave.status)}`}>
                            {getStatusText(leave.status)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {leave.type === 'annual' ? 'Yıllık İzin' : leave.type === 'health' ? 'Sağlık İzni' : 'Mazeret İzni'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">
                          {leave.formattedStartDate} - {leave.formattedEndDate}
                        </p>
                        {leave.description && (
                          <p className="text-xs text-gray-400 mt-1">{leave.description}</p>
                        )}
                      </div>
                      {leave.reviewedByName && (
                        <div className="text-right">
                          <p className="text-xs text-gray-400">İnceleyen: {leave.reviewedByName}</p>
                          {leave.reviewedAt && (
                            <p className="text-xs text-gray-500">
                              {new Date(leave.reviewedAt).toLocaleDateString('tr-TR')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </RouteGuard>
  )
}
