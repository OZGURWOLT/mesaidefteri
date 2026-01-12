'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Plus, Trash2, ArrowLeft, Camera, Send, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ImageUploader from '@/components/ui/ImageUploader'

interface ActivityItem {
  id: string
  description: string
  photos: string[] // Cloudinary URL'leri
}

export default function GunlukFaaliyetPage() {
  const router = useRouter()
  const [activities, setActivities] = useState<ActivityItem[]>([
    { id: '1', description: '', photos: [] },
  ])
  const [taskPhotos, setTaskPhotos] = useState<string[]>([]) // Görev için genel fotoğraflar
  const [submittingTask, setSubmittingTask] = useState(false)

  const addActivity = () => {
    setActivities([...activities, {
      id: Date.now().toString(),
      description: '',
      photos: [],
    }])
  }

  const removeActivity = (id: string) => {
    if (activities.length > 1) {
      setActivities(activities.filter(activity => activity.id !== id))
    }
  }

  const updateDescription = (id: string, description: string) => {
    setActivities(activities.map(activity =>
      activity.id === id ? { ...activity, description } : activity
    ))
  }

  const handleActivityPhotoChange = (itemId: string, photos: string[]) => {
    setActivities(prevActivities =>
      prevActivities.map(activity =>
        activity.id === itemId
          ? { ...activity, photos }
          : activity
      )
    )
  }

  const handleSave = async () => {
    // Validasyon
    const validActivities = activities.filter(activity => activity.description.trim())
    
    if (validActivities.length === 0) {
      alert('Lütfen en az bir faaliyet açıklaması girin!')
      return
    }

    setSubmittingTask(true)

    try {
      // Tüm fotoğrafları topla (her aktiviteden + görev fotoğrafları)
      const allPhotos = [
        ...taskPhotos,
        ...validActivities.flatMap(activity => activity.photos)
      ]

      // Görevi oluştur ve gönder
      const response = await fetch('/api/tasks/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Günlük Faaliyet Raporu',
          description: validActivities.map(a => a.description).join('\n'),
          taskType: 'Günlük Faaliyet',
          photos: allPhotos
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Rapor başarıyla gönderildi! ${validActivities.length} faaliyet kaydedildi.`)
        // Sayfayı temizle veya yönlendir
        router.push('/panel/satinalma')
      } else {
        alert(data.error || 'Rapor gönderilirken bir hata oluştu')
      }
    } catch (error) {
      console.error('Task submit error:', error)
      alert('Rapor gönderilirken bir hata oluştu')
    } finally {
      setSubmittingTask(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-24">
      {/* Üst Bar */}
      <div className="backdrop-blur-md bg-white/70 shadow-sm sticky top-0 z-50 border-b border-white/20">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-800">Günlük Faaliyet Raporu</h1>
            <div className="w-9"></div>
          </div>
          <p className="text-xs text-gray-500 text-center">Gün içinde yaptıklarınızı kaydedin</p>
        </div>
      </div>

      {/* İçerik */}
      <div className="px-4 py-6 space-y-4">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 p-5"
          >
            {/* Madde Numarası ve Sil Butonu */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                  {index + 1}
                </div>
                <span className="text-sm font-semibold text-gray-700">Faaliyet #{index + 1}</span>
              </div>
              {activities.length > 1 && (
                <button
                  onClick={() => removeActivity(activity.id)}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors touch-manipulation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Açıklama Alanı */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Ne yaptınız? *
              </label>
              <textarea
                value={activity.description}
                onChange={(e) => updateDescription(activity.id, e.target.value)}
                placeholder="Örn: A Firması ile görüşüldü, B ürününün fiyatı soruldu..."
                rows={4}
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white resize-none touch-manipulation"
              />
            </div>

            {/* Fotoğraflar */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Fotoğraflar (Opsiyonel)
              </label>
              <ImageUploader
                value={activity.photos}
                onChange={(photos) => handleActivityPhotoChange(activity.id, photos)}
                maxImages={5}
                folder={`mesaidefteri/gunluk-faaliyet/${activity.id}`}
              />
            </div>
          </div>
        ))}

        {/* Yeni Faaliyet Ekle Butonu */}
        <button
          onClick={addActivity}
          className="w-full py-4 px-4 border-2 border-dashed border-blue-300 rounded-2xl hover:border-blue-500 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 touch-manipulation"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Faaliyet Ekle</span>
        </button>

        {/* Görev İçin Genel Fotoğraflar */}
        <div className="mt-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Görev İçin Ek Fotoğraflar (Opsiyonel)</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Raporla ilgili genel fotoğraflar ekleyebilirsiniz.
          </p>
          <ImageUploader
            value={taskPhotos}
            onChange={setTaskPhotos}
            maxImages={10}
            folder="mesaidefteri/gunluk-faaliyet/gorev"
          />
        </div>

        {/* Görevi Gönder Butonu */}
        <button
          onClick={handleSave}
          disabled={submittingTask || activities.filter(a => a.description.trim()).length === 0}
          className="w-full py-4 px-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 active:from-green-800 active:to-green-900 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2 touch-manipulation mt-6"
        >
          {submittingTask ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Gönderiliyor...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Raporu Gönder</span>
            </>
          )}
        </button>

        {/* Bilgi Notu */}
        <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-200/50">
          <p className="text-xs text-blue-800">
            💡 <strong>İpucu:</strong> Her faaliyeti ayrı bir madde olarak ekleyin ve fotoğraf eklemeyi unutmayın. Raporlar otomatik olarak kaydedilir.
          </p>
        </div>
      </div>
    </div>
  )
}
