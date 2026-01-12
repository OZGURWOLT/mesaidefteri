'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import RouteGuard from '@/components/auth/RouteGuard'
import { 
  ArrowLeft, 
  Camera, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Clock,
  Calendar
} from 'lucide-react'
import ImageUploader from '@/components/ui/ImageUploader'
import { uploadToCloudinary } from '@/lib/cloudinary'

interface Task {
  id: string
  title: string
  description?: string
  type: 'FIYAT_ARASTIRMASI' | 'STANDART_GOREV'
  status: string
  photos: string[]
  hasCustomDuration?: boolean
  durationMinutes?: number
  assignedAt?: string
  createdAt: string
}

export default function GorevDetayPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const taskId = params.id as string

  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [photos, setPhotos] = useState<string[]>([])

  // Görev detayını yükle
  useEffect(() => {
    const fetchTask = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/tasks/${taskId}`)
        if (!response.ok) throw new Error('Görev yüklenemedi')
        const data = await response.json()
        setTask(data.task)
        setPhotos(data.task.photos || [])
      } catch (err: any) {
        setError(err.message || 'Görev yüklenirken bir hata oluştu')
      } finally {
        setLoading(false)
      }
    }

    if (taskId) {
      fetchTask()
    }
  }, [taskId])

  // Fotoğraf yükleme
  const handlePhotoUpload = async (files: File[]) => {
    try {
      const uploadedUrls: string[] = []
      for (const file of files) {
        const url = await uploadToCloudinary(file)
        if (url) {
          uploadedUrls.push(url)
        }
      }
      setPhotos(prev => [...prev, ...uploadedUrls])
    } catch (err: any) {
      setError('Fotoğraf yüklenirken bir hata oluştu: ' + err.message)
    }
  }

  // Fotoğraf silme
  const handlePhotoRemove = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  // Görevi tamamla
  const handleComplete = async () => {
    if (!task) return

    try {
      setSubmitting(true)
      setError('')

      // FIYAT_ARASTIRMASI için özel işlem gerekebilir
      if (task.type === 'FIYAT_ARASTIRMASI') {
        // Fiyat araştırması sayfasına yönlendir
        router.push(`/panel/satinalma/fiyat-arastirmasi?taskId=${taskId}`)
        return
      }

      // STANDART_GOREV için görevi gönder
      const response = await fetch('/api/tasks/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId: task.id,
          title: task.title,
          description: task.description,
          taskType: task.type,
          photos: photos
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Görev tamamlanırken bir hata oluştu')
        setSubmitting(false)
        return
      }

      setSuccess('Görev başarıyla tamamlandı ve onay için gönderildi!')
      setTimeout(() => {
        router.push('/panel/satinalma')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Görev tamamlanırken bir hata oluştu')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Görev yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error || 'Görev bulunamadı'}</p>
          <button
            onClick={() => router.push('/panel/satinalma')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Geri Dön
          </button>
        </div>
      </div>
    )
  }

  // FIYAT_ARASTIRMASI tipindeyse fiyat araştırması sayfasına yönlendir
  if (task.type === 'FIYAT_ARASTIRMASI') {
    router.push(`/panel/satinalma/fiyat-arastirmasi?taskId=${taskId}`)
    return null
  }

  // STANDART_GOREV için görünüm
  return (
    <RouteGuard>
      <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/panel/satinalma')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Geri Dön</span>
            </button>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              task.status === 'BEKLIYOR' ? 'bg-yellow-100 text-yellow-800' :
              task.status === 'ONAYLANDI' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {task.status === 'BEKLIYOR' ? 'Bekliyor' :
               task.status === 'ONAYLANDI' ? 'Onaylandı' :
               task.status}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h1>
          
          {task.description && (
            <p className="text-gray-600 mb-4">{task.description}</p>
          )}

          {/* Süre Bilgisi */}
          {task.hasCustomDuration && task.durationMinutes && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <Clock className="w-4 h-4" />
              <span>Süre: {task.durationMinutes} dakika</span>
            </div>
          )}

          {/* Tarih Bilgisi */}
          {task.assignedAt && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>Atandı: {new Date(task.assignedAt).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>
          )}
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

        {/* Fotoğraf Yükleme */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Fotoğraflar
          </h2>

          <ImageUploader
            onUpload={handlePhotoUpload}
            maxFiles={10}
            accept="image/*"
          />

          {/* Yüklenen Fotoğraflar */}
          {photos.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo}
                    alt={`Fotoğraf ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => handlePhotoRemove(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tamamla Butonu */}
        {task.status === 'BEKLIYOR' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <button
              onClick={handleComplete}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Gönderiliyor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Görevi Tamamla ve Gönder</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
    </RouteGuard>
  )
}
