'use client'

import { useState, useMemo } from 'react'
import {
  Calendar,
  Filter,
  Download,
  FileDown,
  FileText,
  TrendingUp,
  Clock,
  AlertTriangle,
  Percent,
  BarChart3,
  LineChart,
  Eye,
  CheckCircle2,
  XCircle,
  Search,
  ArrowUpDown,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { ReportTask, ReportFilter, mockReportTasks, mockStaffList } from '../types'

type SortField = 'date' | 'staffName' | 'taskTitle' | 'status'
type SortDirection = 'asc' | 'desc'

export default function Raporlar() {
  const [filter, setFilter] = useState<ReportFilter>({
    dateRange: 'last30days',
    department: 'all'
  })
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const [reportTasks] = useState<ReportTask[]>(mockReportTasks)

  // Filtreleme
  const filteredTasks = useMemo(() => {
    let filtered = [...reportTasks]

    // Tarih filtresi
    const now = new Date()
    let startDate: Date

    switch (filter.dateRange) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0))
        break
      case 'last7days':
        startDate = new Date(now.setDate(now.getDate() - 7))
        break
      case 'last30days':
        startDate = new Date(now.setDate(now.getDate() - 30))
        break
      case 'custom':
        if (filter.customStartDate) {
          startDate = new Date(filter.customStartDate)
        } else {
          startDate = new Date(0)
        }
        break
      default:
        startDate = new Date(0)
    }

    filtered = filtered.filter(task => {
      const taskDate = new Date(task.date)
      return taskDate >= startDate
    })

    // Departman filtresi
    if (filter.department !== 'all') {
      filtered = filtered.filter(task => task.staffRole === filter.department)
    }

    // Personel filtresi
    if (filter.staffId) {
      const staff = mockStaffList.find(s => s.id === filter.staffId)
      if (staff) {
        filtered = filtered.filter(task => 
          task.staffName === `${staff.name} ${staff.surname}`
        )
      }
    }

    return filtered
  }, [filter, reportTasks])

  // Sıralama
  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks].sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime()
          bValue = new Date(b.date).getTime()
          break
        case 'staffName':
          aValue = a.staffName
          bValue = b.staffName
          break
        case 'taskTitle':
          aValue = a.taskTitle
          bValue = b.taskTitle
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [filteredTasks, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // İstatistikler
  const stats = useMemo(() => {
    const total = filteredTasks.length
    const approved = filteredTasks.filter(t => t.status === 'approved').length
    const rejected = filteredTasks.filter(t => t.status === 'rejected').length
    const completionRate = total > 0 ? ((approved / total) * 100).toFixed(1) : '0'
    
    const avgApprovalTime = filteredTasks.length > 0
      ? (filteredTasks.reduce((sum, t) => sum + (t.completionTime || 0), 0) / filteredTasks.length).toFixed(1)
      : '0'

    // En çok reddedilen görev türleri
    const rejectedByType: Record<string, number> = {}
    filteredTasks.filter(t => t.status === 'rejected').forEach(task => {
      rejectedByType[task.taskType] = (rejectedByType[task.taskType] || 0) + 1
    })
    const topRejected = Object.entries(rejectedByType)
      .sort(([, a], [, b]) => b - a)[0]

    // Fiyat marj değişimi (simüle edilmiş)
    const marginChange = '+2.5%'

    return {
      total,
      approved,
      rejected,
      completionRate,
      avgApprovalTime,
      topRejected: topRejected ? { type: topRejected[0], count: topRejected[1] } : null,
      marginChange
    }
  }, [filteredTasks])

  const handleExportExcel = () => {
    console.log('Excel dışa aktarılıyor...')
    alert('Excel dosyası indiriliyor...')
  }

  const handleExportPDF = () => {
    console.log('PDF kaydediliyor...')
    alert('PDF dosyası kaydediliyor...')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3" />
            Onaylandı
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" />
            Reddedildi
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            Beklemede
          </span>
        )
    }
  }

  const uniqueDepartments = Array.from(new Set(mockStaffList.map(s => s.role)))

  return (
    <div className="space-y-6">
      {/* Üst Filtreleme Barı */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Raporlar ve Analitik</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
            >
              <FileDown className="w-4 h-4" />
              Excel İndir
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
            >
              <FileText className="w-4 h-4" />
              PDF Kaydet
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tarih Aralığı Seçici */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Tarih Aralığı
            </label>
            <select
              value={filter.dateRange}
              onChange={(e) => {
                const range = e.target.value as ReportFilter['dateRange']
                setFilter({ ...filter, dateRange: range })
                setShowCustomDatePicker(range === 'custom')
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="today">Bugün</option>
              <option value="last7days">Son 7 Gün</option>
              <option value="last30days">Son 30 Gün</option>
              <option value="custom">Özel Tarih</option>
            </select>
            
            {showCustomDatePicker && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  type="date"
                  value={customDateRange.start}
                  onChange={(e) => {
                    setCustomDateRange({ ...customDateRange, start: e.target.value })
                    setFilter({ ...filter, customStartDate: e.target.value })
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <input
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => {
                    setCustomDateRange({ ...customDateRange, end: e.target.value })
                    setFilter({ ...filter, customEndDate: e.target.value })
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            )}
          </div>

          {/* Personel/Bölüm Filtresi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Bölüm/Personel
            </label>
            <select
              value={filter.department}
              onChange={(e) => setFilter({ ...filter, department: e.target.value as any, staffId: undefined })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="all">Tüm Bölümler</option>
              {uniqueDepartments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Personel Seçimi (Bölüm seçildiyse) */}
          {filter.department !== 'all' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personel Seç
              </label>
              <select
                value={filter.staffId || ''}
                onChange={(e) => setFilter({ ...filter, staffId: e.target.value || undefined })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Tüm Personel</option>
                {mockStaffList
                  .filter(s => s.role === filter.department)
                  .map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} {staff.surname}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Özet İstatistik Kartları (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Görev Tamamlama Oranı */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
              <Percent className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-blue-700 mb-1">Görev Tamamlama Oranı</p>
          <p className="text-3xl font-bold text-blue-900">{stats.completionRate}%</p>
          <p className="text-xs text-blue-600 mt-2">
            {stats.approved} / {stats.total} görev onaylandı
          </p>
        </div>

        {/* Ortalama Onay Süresi */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-green-700 mb-1">Ortalama Onay Süresi</p>
          <p className="text-3xl font-bold text-green-900">{stats.avgApprovalTime} dk</p>
          <p className="text-xs text-green-600 mt-2">Görev başına ortalama</p>
        </div>

        {/* En Çok Reddedilen Görevler */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm border border-orange-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-orange-700 mb-1">En Çok Reddedilen</p>
          {stats.topRejected ? (
            <>
              <p className="text-2xl font-bold text-orange-900">{stats.topRejected.count}</p>
              <p className="text-xs text-orange-600 mt-2 truncate">{stats.topRejected.type}</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-orange-900">0</p>
              <p className="text-xs text-orange-600 mt-2">Reddedilen görev yok</p>
            </>
          )}
        </div>

        {/* Fiyat Marj Değişimi */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-purple-700 mb-1">Fiyat Marj Değişimi</p>
          <p className="text-3xl font-bold text-purple-900">{stats.marginChange}</p>
          <p className="text-xs text-purple-600 mt-2">Haftalık değişim</p>
        </div>
      </div>

      {/* Görsel Grafikler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Görev Dağılım Grafiği - Line Chart Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <LineChart className="w-5 h-5 text-blue-600" />
              Görev Dağılım Grafiği
            </h3>
          </div>
          <div className="h-64 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-gray-200 flex items-center justify-center relative overflow-hidden">
            {/* Placeholder Chart */}
            <div className="absolute inset-0 p-4">
              {/* Simüle edilmiş çizgi grafiği */}
              <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                {/* Grid lines */}
                <defs>
                  <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Completed tasks line (green) */}
                <polyline
                  points="20,150 60,120 100,100 140,90 180,70 220,60 260,50 300,45 340,40 380,35"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                />
                
                {/* Rejected tasks line (red) */}
                <polyline
                  points="20,180 60,170 100,160 140,150 180,145 220,140 260,135 300,130 340,125 380,120"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3"
                />
                
                {/* Pending tasks line (yellow) */}
                <polyline
                  points="20,165 60,145 100,130 140,120 180,110 220,100 260,95 300,90 340,85 380,80"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="3"
                />
              </svg>
              
              {/* Legend */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-green-500"></div>
                  <span className="text-gray-600">Tamamlanan</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-red-500"></div>
                  <span className="text-gray-600">Reddedilen</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-yellow-500"></div>
                  <span className="text-gray-600">Geciken</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-400 relative z-10 bg-white/80 px-3 py-1 rounded">Günlere göre görev dağılımı</p>
          </div>
        </div>

        {/* Personel Performans Kıyaslaması - Bar Chart Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              Personel Performans Kıyaslaması
            </h3>
          </div>
          <div className="h-64 bg-gradient-to-br from-green-50 to-white rounded-lg border border-gray-200 flex items-center justify-center relative overflow-hidden p-4">
            {/* Placeholder Bar Chart */}
            <div className="w-full h-full flex items-end justify-between gap-2">
              {mockStaffList.slice(0, 5).map((staff, index) => {
                const height = 40 + (index * 15) + Math.random() * 20
                return (
                  <div key={staff.id} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className={`w-full rounded-t transition-all hover:opacity-80 ${
                        index % 2 === 0 ? 'bg-gradient-to-t from-green-500 to-green-400' : 'bg-gradient-to-t from-blue-500 to-blue-400'
                      }`}
                      style={{ height: `${height}%` }}
                      title={`${staff.name} ${staff.surname}: %${staff.successRate}`}
                    />
                    <span className="text-[10px] text-gray-600 font-medium text-center truncate w-full" title={`${staff.name} ${staff.surname}`}>
                      {staff.name.charAt(0)}.{staff.surname.charAt(0)}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded">
              Başarı Oranı (%)
            </p>
          </div>
        </div>
      </div>

      {/* Detaylı Veri Tablosu */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Görev Detayları</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('date')}
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                  >
                    Tarih
                    {sortField === 'date' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                    {sortField !== 'date' && <ArrowUpDown className="w-4 h-4 opacity-30" />}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('staffName')}
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                  >
                    Personel
                    {sortField === 'staffName' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                    {sortField !== 'staffName' && <ArrowUpDown className="w-4 h-4 opacity-30" />}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('taskTitle')}
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                  >
                    Görev Adı
                    {sortField === 'taskTitle' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                    {sortField !== 'taskTitle' && <ArrowUpDown className="w-4 h-4 opacity-30" />}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Görev Türü
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors mx-auto"
                  >
                    Durum
                    {sortField === 'status' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                    {sortField !== 'status' && <ArrowUpDown className="w-4 h-4 opacity-30" />}
                  </button>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Onay Süresi
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kanıt
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(task.date).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{task.staffName}</p>
                      <p className="text-xs text-gray-500">{task.staffRole}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={task.taskTitle}>
                    {task.taskTitle}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {task.taskType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {getStatusBadge(task.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                    {task.completionTime ? `${task.completionTime} dk` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {task.hasEvidence ? (
                      <button
                        className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Kanıtı Görüntüle"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">Yok</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {sortedTasks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Seçilen kriterlere uygun görev bulunamadı</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
