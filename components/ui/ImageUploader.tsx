'use client'

import { useState, useRef } from 'react'
import { Camera, X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react'

interface ImageUploaderProps {
  value: string[] // Fotoğraf URL'leri
  onChange: (urls: string[]) => void
  maxImages?: number
  folder?: string
  className?: string
}

export default function ImageUploader({
  value = [],
  onChange,
  maxImages = 5,
  folder = 'mesaidefteri/uploads',
  className = ''
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Dosya yükleme fonksiyonu
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const remainingSlots = maxImages - value.length
    if (remainingSlots <= 0) {
      alert(`Maksimum ${maxImages} fotoğraf yükleyebilirsiniz.`)
      return
    }

    const filesArray = Array.from(files).slice(0, remainingSlots)
    const newUrls: string[] = []

    setUploading(true)

    try {
      for (const file of filesArray) {
        // Dosya tipi kontrolü
        if (!file.type.startsWith('image/')) {
          alert(`${file.name} bir resim dosyası değil. Lütfen sadece resim yükleyin.`)
          continue
        }

        // Dosya boyutu kontrolü (10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert(`${file.name} dosyası çok büyük. Maksimum 10MB yükleyebilirsiniz.`)
          continue
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', folder)

        // Progress tracking için dosya ID oluştur
        const fileId = `${Date.now()}-${Math.random()}`

        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          })

          const data = await response.json()

          if (response.ok && data.url) {
            newUrls.push(data.url)
          } else {
            alert(`Fotoğraf yüklenirken hata: ${data.error || 'Bilinmeyen hata'}`)
          }
        } catch (error) {
          console.error('Upload error:', error)
          alert(`${file.name} yüklenirken bir hata oluştu.`)
        }
      }

      // Yeni URL'leri mevcut listeye ekle
      if (newUrls.length > 0) {
        onChange([...value, ...newUrls])
      }
    } catch (error) {
      console.error('File upload error:', error)
      alert('Fotoğraf yüklenirken bir hata oluştu')
    } finally {
      setUploading(false)
      setUploadProgress({})
      
      // Input'ları temizle
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
    }
  }

  // Fotoğraf silme
  const handleRemove = (index: number) => {
    const newUrls = value.filter((_, i) => i !== index)
    onChange(newUrls)
  }

  // Galeri'den seç
  const handleGalleryClick = () => {
    fileInputRef.current?.click()
  }

  // Kameradan çek
  const handleCameraClick = () => {
    cameraInputRef.current?.click()
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Yükleme Butonları */}
      {value.length < maxImages && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCameraClick}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            <Camera className="w-4 h-4" />
            <span>Kameradan Çek</span>
          </button>
          
          <button
            type="button"
            onClick={handleGalleryClick}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Galeriden Seç</span>
          </button>

          {/* Hidden Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment" // Arka kamera
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
        </div>
      )}

      {/* Yükleme Durumu */}
      {uploading && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          <span className="text-sm text-blue-700">Fotoğraf yükleniyor...</span>
        </div>
      )}

      {/* Kalan Slot Bilgisi */}
      {value.length > 0 && value.length < maxImages && (
        <p className="text-xs text-gray-500">
          {value.length} / {maxImages} fotoğraf yüklendi
        </p>
      )}

      {value.length >= maxImages && (
        <p className="text-xs text-orange-600 font-medium">
          Maksimum fotoğraf sayısına ulaştınız ({maxImages})
        </p>
      )}

      {/* Fotoğraf Önizlemeleri */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((url, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
            >
              <img
                src={url}
                alt={`Fotoğraf ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Silme Butonu */}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                aria-label="Fotoğrafı Sil"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Boş Durum */}
      {value.length === 0 && !uploading && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-2">Henüz fotoğraf yüklenmedi</p>
          <p className="text-xs text-gray-400">Kameradan çek veya galeriden seç</p>
        </div>
      )}
    </div>
  )
}
