'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { 
  Search,
  Filter,
  User as UserIcon,
  Image as ImageIcon,
  FileSpreadsheet,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Star,
  MessageSquare
} from 'lucide-react'
import InputModal from '@/components/ui/InputModal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ImageGallery from '@/components/ui/ImageGallery'

interface ApprovalTask {
  id: string
  staffName: string
  staffRole: string
  staffId: string
  taskType: string
  taskTitle: string
  description?: string
  assignedAt?: string
  submittedAt: string
  status: 'pending'
  data?: {
    priceLogs: Array<{
      id: string
      productName: string
      ourPrice: number
      migrosPrice?: number
      getirPrice?: number
      a101Price?: number
      sarayPrice?: number
      grossPrice?: number
      status?: string
    }>
    totalProducts: number
  }
  photos?: string[]
}

export default function OnayBekleyenler() {
  const router = useRouter()
  const [approvalTasks, setApprovalTasks] = useState<ApprovalTask[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTaskType, setSelectedTaskType] = useState<string>('all')
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [pointsModalOpen, setPointsModalOpen] = useState(false)
  const [rejectMessageModalOpen, setRejectMessageModalOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  
  const { data: session } = useSession()
  const currentUser = session?.user
  const currentUserRole = currentUser?.role
  const canApproveOrReject = currentUserRole === 'MANAGER' || currentUserRole === 'SUPERVIZOR'

  // Bekleyen görevleri çek
  useEffect(() => {
    const fetchPendingTasks = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/tasks/pending?taskType=${selectedTaskType}`)
        if (response.ok) {
          const data = await response.json()
          setApprovalTasks(data.tasks || [])
        } else {
          console.error('Görevler yüklenemedi')
        }
      } catch (error) {
        console.error('Error fetching tasks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPendingTasks()
  }, [selectedTaskType])

  // Görev türlerini dinamik olarak al
  const taskTypes = Array.from(new Set(approvalTasks.map(item => item.taskType))).filter(Boolean)
  
  // Filtreleme
  const filteredItems = approvalTasks.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.taskTitle.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTaskType = selectedTaskType === 'all' || item.taskType === selectedTaskType
    return matchesSearch && matchesTaskType
  })

  // Onayla butonu tıklandığında puan modal'ını aç
  const handleApproveClick = (taskId: string, staffId: string) => {
    if (!canApproveOrReject) {
      return
    }
    setSelectedTaskId(taskId)
    setSelectedStaffId(staffId)
    setPointsModalOpen(true)
  }

  // Puan onaylandığında görevi onayla
  const handleApproveConfirm = async (points: string | number) => {
    if (!selectedTaskId || !canApproveOrReject) return

    setProcessing(true)
    try {
      const pointsValue = typeof points === 'string' ? parseInt(points) || 10 : points || 10

      const response = await fetch('/api/tasks/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: selectedTaskId,
          points: pointsValue
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setPointsModalOpen(false)
        setSelectedTaskId(null)
        setSelectedStaffId(null)
        // Listeyi yenile
        setApprovalTasks(prev => prev.filter(task => task.id !== selectedTaskId))
        // Başarı mesajı için alert yerine toast kullanılabilir
        alert(`Görev onaylandı! Personel +${pointsValue} puan kazandı.`)
      } else {
        alert(data.error || 'Görev onaylanırken bir hata oluştu')
      }
    } catch (error) {
      console.error('Error approving task:', error)
      alert('Görev onaylanırken bir hata oluştu')
    } finally {
      setProcessing(false)
    }
  }

  // Reddet butonu tıklandığında mesaj modal'ını aç
  const handleRejectClick = (taskId: string, staffId: string) => {
    if (!canApproveOrReject) {
      return
    }
    setSelectedTaskId(taskId)
    setSelectedStaffId(staffId)
    setRejectMessageModalOpen(true)
  }

  // Red mesajı onaylandığında görevi reddet
  const handleRejectConfirm = async (message: string | number) => {
    if (!selectedTaskId || !canApproveOrReject) return

    setProcessing(true)
    try {
      const rejectionMessage = typeof message === 'string' && message.trim() 
        ? message 
        : 'Fiyatlar Hatalı, Tekrar Kontrol Et'

      const response = await fetch('/api/tasks/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: selectedTaskId,
          message: rejectionMessage
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setRejectMessageModalOpen(false)
        setSelectedTaskId(null)
        setSelectedStaffId(null)
        // Listeyi yenile
        setApprovalTasks(prev => prev.filter(task => task.id !== selectedTaskId))
        alert('Görev reddedildi. Personel bilgilendirildi.')
      } else {
        alert(data.error || 'Görev reddedilirken bir hata oluştu')
      }
    } catch (error) {
      console.error('Error rejecting task:', error)
      alert('Görev reddedilirken bir hata oluştu')
    } finally {
      setProcessing(false)
    }
  }

  const handleViewTask = (itemId: string) => {
    router.push(`/panel/yonetici/onay-bekleyenler/${itemId}`)
  }

  const getPreviewIcon = (item: ApprovalTask) => {
    if (item.photos && item.photos.length > 0) {
      return <ImageIcon className="w-6 h-6 text-blue-600" />
    }
    if (item.data) {
      return <FileSpreadsheet className="w-6 h-6 text-green-600" />
    }
    return <AlertCircle className="w-6 h-6 text-gray-400" />
  }

  const getPreviewLabel = (item: ApprovalTask) => {
    if (item.photos && item.photos.length > 0) {
      return `${item.photos.length} Fotoğraf`
    }
    if (item.data) {
      return `${item.data.totalProducts} Ürün`
    }
    return 'Kanıt Yok'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Görevler yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Onay Bekleyen Görevler</h1>
          {filteredItems.length > 0 && (
            <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
              {filteredItems.length}
            </span>
          )}
        </div>
        {!canApproveOrReject && (
          <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
            ⚠️ Bu sayfayı görüntülemek için Yönetici veya Süpervizör yetkisi gereklidir.
          </div>
        )}
      </div>

      {/* Filtreler */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        {/* Arama */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Personel adı veya görev başlığı ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Görev Türü Filtreleri */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTaskType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              selectedTaskType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            Tümü
          </button>
          <button
            onClick={() => setSelectedTaskType('kasiyer')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedTaskType === 'kasiyer'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💳 Kasiyer
          </button>
          <button
            onClick={() => setSelectedTaskType('kurye')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedTaskType === 'kurye'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🚚 Kurye
          </button>
          <button
            onClick={() => setSelectedTaskType('technical')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedTaskType === 'technical'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💻 Teknik
          </button>
          {taskTypes.filter(t => !t.includes('KASIYER_GOREV') && !t.includes('TESLIMAT') && !t.includes('MARKET_GOREV') && !t.includes('TECHNICAL_TASK')).map((taskType) => (
            <button
              key={taskType}
              onClick={() => setSelectedTaskType(taskType)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTaskType === taskType
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {taskType}
            </button>
          ))}
        </div>
      </div>

      {/* Görev Kartları */}
      {filteredItems.length > 0 ? (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 hover:shadow-md transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Sol Bölüm - Personel Bilgisi */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                    {item.staffName.split(' ')[0]?.charAt(0)}
                    {item.staffName.split(' ')[1]?.charAt(0) || item.staffName.split(' ')[0]?.charAt(1)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm md:text-base">
                      {item.staffName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.staffRole}</p>
                  </div>
                </div>

                {/* Orta Bölüm - Görev Bilgisi */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                      item.taskType?.includes('Acil') || item.taskType?.includes('Urgent')
                        ? 'bg-red-100 text-red-800'
                        : item.taskType?.includes('TECHNICAL_TASK') || item.taskType?.includes('Bug') || item.taskType?.includes('Özellik') || item.taskType?.includes('Bakım')
                        ? 'bg-purple-100 text-purple-800'
                        : item.taskType?.includes('KASIYER_GOREV')
                        ? 'bg-indigo-100 text-indigo-800'
                        : item.taskType?.includes('TESLIMAT') || item.taskType?.includes('MARKET_GOREV')
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {item.taskType?.includes('Bug') && '🐛 '}
                      {item.taskType?.includes('Özellik') && '✨ '}
                      {item.taskType?.includes('Bakım') && '🔧 '}
                      {item.taskType?.includes('KASIYER_GOREV:Kasa') && '💳 '}
                      {item.taskType?.includes('KASIYER_GOREV:Reyon') && '📦 '}
                      {item.taskType?.includes('TESLIMAT') && '🚚 '}
                      {item.taskType?.includes('MARKET_GOREV') && '🏪 '}
                      {item.taskType?.replace('KASIYER_GOREV:', '').replace('TECHNICAL_TASK:', '').replace('MARKET_GOREV:', '') || item.taskType || 'Bilinmeyen'}
                    </span>
                    {/* Rol badge'i */}
                    {(item.staffRole === 'KASIYER' || item.staffRole === 'Kurye' || item.staffRole === 'STAFF') && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        item.staffRole === 'KASIYER' 
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {item.staffRole === 'KASIYER' ? 'Kasiyer' : item.staffRole === 'STAFF' ? 'Sahadaki Personel' : item.staffRole}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm md:text-base mb-1 truncate">
                    {item.taskTitle}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{item.submittedAt}</span>
                  </div>
                </div>

                {/* Sağ Bölüm - Kanıt Önizlemesi ve İşlemler */}
                <div className="flex items-center gap-4 flex-shrink-0 flex-wrap">
                  {/* Kanıt Önizleme */}
                  <div className="flex flex-col items-center gap-1">
                    {item.photos && item.photos.length > 0 ? (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation()
                          // Fotoğraf galerisini aç (modal)
                          handleViewTask(item.id)
                        }}
                        className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group relative"
                      >
                        <img
                          src={item.photos[0]}
                          alt="Fotoğraf önizleme"
                          className="w-full h-full object-cover"
                        />
                        {item.photos.length > 1 && (
                          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                            +{item.photos.length - 1}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <ImageIcon className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    ) : item.data ? (
                      <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                        <FileSpreadsheet className="w-8 h-8 text-green-600" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <span className="text-xs text-gray-500 text-center">
                      {getPreviewLabel(item)}
                    </span>
                  </div>

                  {/* İşlem Butonları */}
                  {canApproveOrReject ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      {/* Onayla ve Puan Ver Butonu */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleApproveClick(item.id, item.staffId)
                        }}
                        className="px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center gap-2 whitespace-nowrap"
                      >
                        <Star className="w-4 h-4" />
                        <span className="hidden sm:inline">Onayla ve Puan Ver</span>
                        <span className="sm:hidden">Onayla</span>
                      </button>
                      {/* Reddet/İade Et Butonu */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRejectClick(item.id, item.staffId)
                        }}
                        className="px-3 md:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm flex items-center gap-2 whitespace-nowrap"
                      >
                        <XCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Reddet / İade Et</span>
                        <span className="sm:hidden">Reddet</span>
                      </button>
                      {/* Görevi İncele Butonu */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewTask(item.id)
                        }}
                        className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2 whitespace-nowrap"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="hidden sm:inline">Görevi İncele</span>
                        <span className="sm:hidden">İncele</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewTask(item.id)
                      }}
                      className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm md:text-base flex items-center gap-2 whitespace-nowrap"
                    >
                      <Eye className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="hidden sm:inline">Görevi İncele</span>
                      <span className="sm:hidden">İncele</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Boş Durum */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 md:p-16 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-green-600" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
              Harika! Bekleyen görev bulunmuyor.
            </h3>
            <p className="text-sm md:text-base text-gray-500 max-w-md">
              Tüm görevler onaylandı. Yeni görevler geldiğinde burada görünecektir.
            </p>
          </div>
        </div>
      )}

      {/* Puan Verme Modal */}
      <InputModal
        isOpen={pointsModalOpen}
        onClose={() => {
          setPointsModalOpen(false)
          setSelectedTaskId(null)
          setSelectedStaffId(null)
        }}
        onConfirm={handleApproveConfirm}
        title="Puan Ver"
        label="Puan (1-100)"
        type="number"
        defaultValue={10}
        placeholder="10"
        confirmText="Onayla ve Puan Ver"
        cancelText="İptal"
        loading={processing}
        required
        min={1}
        max={100}
      />

      {/* Red Nedeni Modal */}
      <InputModal
        isOpen={rejectMessageModalOpen}
        onClose={() => {
          setRejectMessageModalOpen(false)
          setSelectedTaskId(null)
          setSelectedStaffId(null)
        }}
        onConfirm={(value) => handleRejectConfirm(typeof value === 'string' ? value : String(value))}
        title="Görevi Reddet"
        label="Red Nedeni"
        type="textarea"
        defaultValue="Fiyatlar Hatalı, Tekrar Kontrol Et"
        placeholder="Red nedenini giriniz..."
        confirmText="Reddet"
        cancelText="İptal"
        loading={processing}
        required
      />
    </div>
  )
}
