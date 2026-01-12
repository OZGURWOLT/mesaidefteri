'use client'
export const dynamic = 'force-dynamic'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle,
  User as UserIcon,
  Clock,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Star,
  Loader2,
  Code2,
  Bug,
  Sparkles,
  Wrench
} from 'lucide-react'
import ImageGallery from '@/components/ui/ImageGallery'

interface TaskDetail {
  id: string
  staffName: string
  staffRole: string
  staffId: string
  taskType: string
  taskTitle: string
  description?: string
  assignedAt?: string
  submittedAt: string
  status: 'pending' | 'approved' | 'rejected'
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

export default function OnayDetaySayfasi() {
  const params = useParams()
  const router = useRouter()
  const itemId = params.id as string
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  // Mevcut kullanıcı bilgisini al
  const { data: session } = useSession()
  
  useEffect(() => {
    if (session?.user) {
      setCurrentUserId(session.user.id)
      setCurrentUserRole(session.user.role || null)
    }
  }, [session])

  // Görev detayını çek
  useEffect(() => {
    const fetchTaskDetail = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/tasks/${itemId}`)
        if (response.ok) {
          const data = await response.json()
          setTask(data.task)
        } else {
          console.error('Görev bulunamadı')
        }
      } catch (error) {
        console.error('Error fetching task:', error)
      } finally {
        setLoading(false)
      }
    }

    if (itemId) {
      fetchTaskDetail()
    }
  }, [itemId])

  // Yetki kontrolü
  const canApproveOrReject = currentUserRole === 'MANAGER' || currentUserRole === 'SUPERVIZOR'

  const handleApproval = async (action: 'approve' | 'reject') => {
    if (!canApproveOrReject || !currentUserId || !task) {
      alert('Bu işlemi yapmak için yetkiniz yok. Sadece Yönetici veya Süpervizör onaylayabilir.')
      return
    }

    try {
      setProcessing(true)

      if (action === 'approve') {
        // Kullanıcıdan puan al (varsayılan 10)
        const pointsInput = prompt('Puan verin (1-100):')
        const points = pointsInput ? parseInt(pointsInput) || 10 : 10

        const response = await fetch('/api/tasks/approve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId: task.id,
            userId: currentUserId,
            points
          }),
        })

        const data = await response.json()

        if (response.ok) {
          alert(`Görev onaylandı! Personel +${points} puan kazandı.`)
          router.push('/panel/yonetici/onay-bekleyenler')
        } else {
          alert(data.error || 'Görev onaylanırken bir hata oluştu')
        }
      } else {
        // Red nedenini al
        const message = prompt('Red nedeni (Varsayılan: Fiyatlar Hatalı, Tekrar Kontrol Et):') || 'Fiyatlar Hatalı, Tekrar Kontrol Et'

        const response = await fetch('/api/tasks/reject', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId: task.id,
            userId: currentUserId,
            message
          }),
        })

        const data = await response.json()

        if (response.ok) {
          alert('Görev reddedildi. Personel bilgilendirildi.')
          router.push('/panel/yonetici/onay-bekleyenler')
        } else {
          alert(data.error || 'Görev reddedilirken bir hata oluştu')
        }
      }
    } catch (error) {
      console.error(`Error ${action === 'approve' ? 'approving' : 'rejecting'} task:`, error)
      alert(`Görev ${action === 'approve' ? 'onaylanırken' : 'reddedilirken'} bir hata oluştu`)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Görev detayları yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">Görev bulunamadı</p>
        <button
          onClick={() => router.push('/panel/yonetici/onay-bekleyenler')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Geri Dön
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/panel/yonetici/onay-bekleyenler')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Görev Detayları</h1>
      </div>

      {/* Görev Detay Kartı */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Personel Bilgileri */}
        <div className="border-b border-gray-200 pb-4">
          <h4 className="text-sm font-medium text-gray-500 mb-3">Personel Bilgileri</h4>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
              {task.staffName.split(' ')[0]?.charAt(0)}
              {task.staffName.split(' ')[1]?.charAt(0) || task.staffName.split(' ')[0]?.charAt(1)}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{task.staffName}</p>
              <p className="text-sm text-gray-500">{task.staffRole}</p>
            </div>
          </div>
        </div>

        {/* Görev Bilgileri */}
        <div className="border-b border-gray-200 pb-4">
          <h4 className="text-sm font-medium text-gray-500 mb-3">Görev Bilgileri</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Görev Türü:</span>
              <div className="flex items-center gap-2">
                {/* Teknik görev ikonu */}
                {(task.taskType?.includes('TECHNICAL_TASK') || task.taskType?.includes('Bug') || task.taskType?.includes('Özellik') || task.taskType?.includes('Bakım')) && (
                  <>
                    {task.taskType?.includes('Bug') && <Bug className="w-4 h-4 text-red-600" />}
                    {task.taskType?.includes('Özellik') && <Sparkles className="w-4 h-4 text-blue-600" />}
                    {task.taskType?.includes('Bakım') && <Wrench className="w-4 h-4 text-orange-600" />}
                    {!task.taskType?.includes('Bug') && !task.taskType?.includes('Özellik') && !task.taskType?.includes('Bakım') && <Code2 className="w-4 h-4 text-gray-600" />}
                  </>
                )}
                <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                  task.taskType?.includes('Acil') || task.taskType?.includes('Urgent')
                    ? 'bg-red-100 text-red-800'
                    : task.taskType?.includes('TECHNICAL_TASK') || task.taskType?.includes('Bug') || task.taskType?.includes('Özellik') || task.taskType?.includes('Bakım')
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {task.taskType || 'Bilinmeyen'}
                </span>
              </div>
            </div>
            <p className="text-lg font-semibold text-gray-900">{task.taskTitle}</p>
            {task.description && (
              <p className="text-sm text-gray-600">{task.description}</p>
            )}
            
            {/* Zaman Damgaları */}
            <div className="space-y-2 mt-3 pt-3 border-t border-gray-100">
              {task.assignedAt && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">Atandı:</span>
                  <span>{task.assignedAt}</span>
                </div>
              )}
              {task.submittedAt && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-green-500" />
                  <span className="font-medium">Teslim Edildi:</span>
                  <span>{task.submittedAt}</span>
                </div>
              )}
              
              {/* Gecikme Uyarısı (Yönetici için - 15 dakika) */}
              {task.submittedAt && task.status === 'pending' && (() => {
                const submittedTime = new Date(task.submittedAt)
                const now = new Date()
                const delayMinutes = Math.floor((now.getTime() - submittedTime.getTime()) / (1000 * 60))
                
                if (delayMinutes > 15) {
                  return (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-semibold text-red-800">
                          Gecikme: {delayMinutes} dakika
                        </span>
                      </div>
                      <p className="text-xs text-red-600 mt-1">
                        Bu görev {delayMinutes} dakikadır onayınızı bekliyor.
                      </p>
                    </div>
                  )
                }
                return null
              })()}
            </div>
          </div>
        </div>

        {/* Kasiyer Görev Açıklaması */}
        {task.taskType && task.taskType.includes('KASIYER_GOREV') && (
          <div className="border-b border-gray-200 pb-4">
            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {task.taskType.includes('Kasa') ? 'Kasa İşlemleri' : 'Reyon Faaliyeti'}
            </h4>
            <div className="bg-indigo-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description || 'Açıklama girilmemiş'}</p>
            </div>
          </div>
        )}

        {/* Kurye Görev Bilgileri */}
        {task.taskType && (task.taskType.includes('TESLIMAT') || task.taskType.includes('MARKET_GOREV')) && (
          <div className="border-b border-gray-200 pb-4">
            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {task.taskType.includes('TESLIMAT') ? 'Teslimat Detayları' : 'Market İçi Görev'}
            </h4>
            <div className="bg-orange-50 rounded-lg p-4 space-y-2">
              {task.taskType.includes('TESLIMAT') && task.description && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">Müşteri ve Adres:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
                </div>
              )}
              {task.taskType.includes('MARKET_GOREV') && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">Yapılan İşlem:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description || 'Açıklama girilmemiş'}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Teknik Görev Açıklaması */}
        {task.taskType && (task.taskType.includes('TECHNICAL_TASK') || task.taskType.includes('Bug') || task.taskType.includes('Özellik') || task.taskType.includes('Bakım')) && (
          <div className="border-b border-gray-200 pb-4">
            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              İş Açıklaması
            </h4>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description || 'Açıklama girilmemiş'}</p>
            </div>
          </div>
        )}

        {/* Veri Özeti - PriceLog Tablosu (Sadece fiyat araştırması görevleri için) */}
        {task.data && task.data.priceLogs && task.data.priceLogs.length > 0 && !task.taskType?.includes('TECHNICAL_TASK') && (
          <div className="border-b border-gray-200 pb-4">
            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Fiyat Araştırması Verileri ({task.data.totalProducts} Ürün)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left text-xs font-semibold text-gray-700">Ürün Adı</th>
                    <th className="border border-gray-200 px-4 py-2 text-right text-xs font-semibold text-gray-700">Bizim Fiyat</th>
                    <th className="border border-gray-200 px-4 py-2 text-right text-xs font-semibold text-gray-700">Migros</th>
                    <th className="border border-gray-200 px-4 py-2 text-right text-xs font-semibold text-gray-700">Getir</th>
                    <th className="border border-gray-200 px-4 py-2 text-right text-xs font-semibold text-gray-700">A101</th>
                    <th className="border border-gray-200 px-4 py-2 text-right text-xs font-semibold text-gray-700">Saray</th>
                    <th className="border border-gray-200 px-4 py-2 text-right text-xs font-semibold text-gray-700">Gross</th>
                    <th className="border border-gray-200 px-4 py-2 text-center text-xs font-semibold text-gray-700">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {task.data.priceLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900">{log.productName}</td>
                      <td className="border border-gray-200 px-4 py-2 text-sm text-right font-medium text-blue-600">{log.ourPrice.toFixed(2)} ₺</td>
                      <td className="border border-gray-200 px-4 py-2 text-sm text-right text-gray-600">{log.migrosPrice ? `${log.migrosPrice.toFixed(2)} ₺` : '-'}</td>
                      <td className="border border-gray-200 px-4 py-2 text-sm text-right text-gray-600">{log.getirPrice ? `${log.getirPrice.toFixed(2)} ₺` : '-'}</td>
                      <td className="border border-gray-200 px-4 py-2 text-sm text-right text-gray-600">{log.a101Price ? `${log.a101Price.toFixed(2)} ₺` : '-'}</td>
                      <td className="border border-gray-200 px-4 py-2 text-sm text-right text-gray-600">{log.sarayPrice ? `${log.sarayPrice.toFixed(2)} ₺` : '-'}</td>
                      <td className="border border-gray-200 px-4 py-2 text-sm text-right text-gray-600">{log.grossPrice ? `${log.grossPrice.toFixed(2)} ₺` : '-'}</td>
                      <td className="border border-gray-200 px-4 py-2 text-center">
                        {log.status && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                            {log.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Fotoğraflar */}
        {task.photos && task.photos.length > 0 && (
          <div className="border-b border-gray-200 pb-4">
            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Fotoğraflar ({task.photos.length})
            </h4>
            <ImageGallery 
              images={task.photos} 
              alt="Görev Fotoğrafı"
              className="mt-2"
            />
          </div>
        )}

        {/* Onay/Reddet Butonları */}
        {task.status === 'pending' && canApproveOrReject && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => handleApproval('approve')}
              disabled={processing}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Star className="w-5 h-5" />
                  Onayla ve Puan Ver
                </>
              )}
            </button>
            <button
              onClick={() => handleApproval('reject')}
              disabled={processing}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  Reddet / İade Et
                </>
              )}
            </button>
          </div>
        )}

        {task.status !== 'pending' && (
          <div className="pt-4 border-t border-gray-200">
            <div className={`px-4 py-3 rounded-lg ${
              task.status === 'approved' 
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <p className="font-medium">
                {task.status === 'approved' ? '✅ Görev Onaylandı' : '❌ Görev Reddedildi'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
