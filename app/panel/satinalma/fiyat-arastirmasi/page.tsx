'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect, Suspense } from 'react'
import { Plus, Save, ArrowLeft, Edit2, CheckCircle2, Info, Camera, X, AlertCircle, Send, Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import ImageUploader from '@/components/ui/ImageUploader'

interface CompetitorStatus {
  status: 'none' | 'available' | 'no-stock' | 'equivalent'
  photo?: string
  note?: string
  equivalentProductName?: string
}

interface PriceItem {
  id: string
  rowNumber: number
  controlPeriod: string
  productCode: string
  productName: string
  ourPrice: string
  margin: number
  migros: string
  getir: string
  a101: string
  sarayGross: string
  urfaGross: string
  migrosStatus: CompetitorStatus
  getirStatus: CompetitorStatus
  a101Status: CompetitorStatus
  sarayGrossStatus: CompetitorStatus
  urfaGrossStatus: CompetitorStatus
  photos: string[] // Görev için fotoğraflar (Cloudinary URL'leri)
  saved?: boolean
}

function FiyatArastirmasiContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const taskId = searchParams?.get('taskId') || null
  const [items, setItems] = useState<PriceItem[]>([
    { 
      id: '1', 
      rowNumber: 1,
      controlPeriod: '', 
      productCode: '', 
      productName: '', 
      ourPrice: '', 
      margin: 0,
      migros: '', 
      getir: '', 
      a101: '', 
      sarayGross: '', 
      urfaGross: '',
      migrosStatus: { status: 'none' },
      getirStatus: { status: 'none' },
      a101Status: { status: 'none' },
      sarayGrossStatus: { status: 'none' },
      urfaGrossStatus: { status: 'none' },
      photos: [], // Görev için fotoğraflar
      saved: false 
    },
  ])

  const [unitConverterOpen, setUnitConverterOpen] = useState<{itemId: string, field: string} | null>(null)
  const [unitConverterData, setUnitConverterData] = useState({ price: '', weight: '', unitPrice: '' })
  const [statusModalOpen, setStatusModalOpen] = useState<{itemId: string, field: string} | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentPhotoTarget, setCurrentPhotoTarget] = useState<{itemId: string, field: string} | null>(null)
  const [taskPhotos, setTaskPhotos] = useState<string[]>([]) // Görev için fotoğraflar (Cloudinary URL'leri)
  const [submittingTask, setSubmittingTask] = useState(false) // Görev gönderilirken loading state

  // Marj hesaplama fonksiyonu
  const calculateMargin = (ourPrice: number, competitorPrice: number): number => {
    if (!ourPrice || !competitorPrice || ourPrice === 0) return 0
    return ((ourPrice - competitorPrice) / ourPrice) * 100
  }

  // En düşük rakip fiyatını bul ve marjı hesapla
  const updateMarginForRow = (item: PriceItem): number => {
    if (!item.ourPrice || parseFloat(item.ourPrice) === 0) return 0

    const ourPriceNum = parseFloat(item.ourPrice)
    const competitorPrices = [
      { price: item.migros, status: item.migrosStatus },
      { price: item.getir, status: item.getirStatus },
      { price: item.a101, status: item.a101Status },
      { price: item.sarayGross, status: item.sarayGrossStatus },
      { price: item.urfaGross, status: item.urfaGrossStatus }
    ]
      .filter(c => c.status.status !== 'none' && c.status.status !== 'no-stock' && (c.status.status === 'available' || c.status.status === 'equivalent'))
      .map(c => parseFloat(c.price || '0'))
      .filter(price => price > 0)

    if (competitorPrices.length === 0) return 0

    const lowestCompetitorPrice = Math.min(...competitorPrices)
    return calculateMargin(ourPriceNum, lowestCompetitorPrice)
  }


  const updateItem = (id: string, field: keyof PriceItem, value: string | number | boolean | CompetitorStatus) => {
    setItems(currentItems => {
      const updatedItems = currentItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value, saved: false }
          // Eğer rakip fiyatlarından biri veya bizim fiyat değiştiyse ve marj elle girilmemişse otomatik hesapla
          if (field !== 'margin' && (field === 'ourPrice' || field === 'migros' || field === 'getir' || 
              field === 'a101' || field === 'sarayGross' || field === 'urfaGross' ||
              field.endsWith('Status'))) {
            updatedItem.margin = updateMarginForRow(updatedItem)
          }
          return updatedItem
        }
        return item
      })
      return updatedItems
    })
  }

  // Birim fiyat hesaplama (1 gram başına)
  const calculateUnitPrice = () => {
    const price = parseFloat(unitConverterData.price)
    const weight = parseFloat(unitConverterData.weight)
    if (price && weight && weight > 0) {
      // 1 gram başına fiyat hesapla
      const unitPricePerGram = price / weight
      // 100 gram başına fiyat (daha okunabilir)
      const unitPricePer100g = (price / weight) * 100
      setUnitConverterData({ 
        ...unitConverterData, 
        unitPrice: unitPricePer100g.toFixed(2) 
      })
    }
  }


  // Durum değiştirme
  const handleStatusChange = (itemId: string, field: string, newStatus: CompetitorStatus['status']) => {
    const statusField = `${field}Status` as keyof PriceItem
    const item = items.find(i => i.id === itemId)
    if (!item) return
    
    const currentStatus = item[statusField] as CompetitorStatus
    
    // Eğer aynı durum tekrar seçilirse, durumu iptal et (none yap)
    if (currentStatus.status === newStatus && newStatus !== 'none') {
      updateItem(itemId, statusField, { status: 'none', photo: undefined, note: undefined, equivalentProductName: undefined })
      setStatusModalOpen(null)
      return
    }
    
    updateItem(itemId, statusField, { ...currentStatus, status: newStatus })
    
    if (newStatus === 'available') {
      // Farklı Gramajlı Ürün seçildiğinde birim fiyat hesaplama ekranını aç
      setStatusModalOpen(null)
      setUnitConverterOpen({ itemId, field })
    } else if (newStatus === 'equivalent') {
      // Muadil seçildiğinde modal açık kalsın, muadil ürün adı istenecek
      // Modal açık kalacak, kullanıcı ürün adını girecek
    } else if (newStatus === 'no-stock') {
      setStatusModalOpen(null)
    } else if (newStatus === 'none') {
      updateItem(itemId, statusField, { status: 'none', photo: undefined, note: undefined, equivalentProductName: undefined })
      setStatusModalOpen(null)
    } else {
      setStatusModalOpen(null)
    }
  }

  // Fotoğraf çekme
  const handlePhotoClick = (itemId: string, field: string) => {
    setCurrentPhotoTarget({ itemId, field })
    fileInputRef.current?.click()
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentPhotoTarget || !e.target.files || !e.target.files[0]) return

    const file = e.target.files[0]
    if (!file.type.startsWith('image/')) {
      alert('Lütfen bir resim dosyası seçin!')
      return
    }

    // Dosya boyutu kontrolü (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Dosya boyutu çok büyük. Maksimum 10MB yükleyebilirsiniz.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', `mesaidefteri/fiyat-arastirma/${currentPhotoTarget.itemId}/${currentPhotoTarget.field}`)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok && data.url) {
        // Cloudinary URL'ini kaydet
        setItems(currentItems => {
          return currentItems.map(item => {
            if (item.id === currentPhotoTarget.itemId) {
              const statusField = `${currentPhotoTarget.field}Status` as keyof PriceItem
              const currentStatus = item[statusField] as CompetitorStatus
              return {
                ...item,
                [statusField]: {
                  ...currentStatus,
                  photo: data.url // Cloudinary URL'i
                }
              }
            }
            return item
          })
        })
      } else {
        alert(data.error || 'Fotoğraf yüklenirken bir hata oluştu')
      }
    } catch (error) {
      console.error('Photo upload error:', error)
      alert('Fotoğraf yüklenirken bir hata oluştu')
    } finally {
      setCurrentPhotoTarget(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removePhoto = (itemId: string, field: string) => {
    setItems(currentItems => {
      return currentItems.map(item => {
        if (item.id === itemId) {
          const statusField = `${field}Status` as keyof PriceItem
          const currentStatus = item[statusField] as CompetitorStatus
          return {
            ...item,
            [statusField]: {
              ...currentStatus,
              photo: undefined
            }
          }
        }
        return item
      })
    })
  }

  const handleSaveRow = (id: string) => {
    setItems(currentItems => {
      const item = currentItems.find(i => i.id === id)
      if (!item) return currentItems

      // Validasyon
      if (!item.productName.trim()) {
        alert('Lütfen ürün adını girin!')
        return currentItems
      }
      if (!item.ourPrice || parseFloat(item.ourPrice) === 0) {
        alert('Lütfen bizim fiyatı girin!')
        return currentItems
      }

      // Fotoğraf zorunluluğu kontrolü
      const statusFields = [
        { field: 'migros', status: item.migrosStatus },
        { field: 'getir', status: item.getirStatus },
        { field: 'a101', status: item.a101Status },
        { field: 'sarayGross', status: item.sarayGrossStatus },
        { field: 'urfaGross', status: item.urfaGrossStatus }
      ]

      for (const { field, status } of statusFields) {
        if (status.status === 'no-stock' && !status.photo) {
          alert(`${field} için 'Ürün Yok' seçildi. Lütfen fotoğraf ekleyin! (Kanıt yoksa işlem yok)`)
          return currentItems
        }
        if (status.status === 'equivalent' && !status.equivalentProductName?.trim()) {
          alert(`${field} için 'Muadil' seçildi. Lütfen muadil ürün adını girin!`)
          return currentItems
        }
      }

      // Satırı kaydet (sadece lokal state'i güncelle)
      const updatedItems = currentItems.map(i =>
        i.id === id ? { ...i, saved: true } : i
      )

      setTimeout(() => {
        const saveNotification = document.getElementById(`save-notification-${id}`)
        if (saveNotification) {
          saveNotification.classList.remove('hidden')
          setTimeout(() => {
            saveNotification.classList.add('hidden')
          }, 2000)
        }
      }, 100)

      return updatedItems
    })
  }

  // Tüm satırları görev olarak gönder
  const handleSubmitTask = async () => {
    const savedItems = items.filter(item => item.saved && item.productName.trim() && item.ourPrice)

    if (savedItems.length === 0) {
      alert('Lütfen en az bir satırı kaydedin!')
      return
    }

    // Validasyon: Tüm kayıtlı satırların ürün adı ve fiyatı olmalı
    for (const item of savedItems) {
      if (!item.productName.trim()) {
        alert(`Satır ${item.rowNumber} için ürün adı girilmedi!`)
        return
      }
      if (!item.ourPrice || parseFloat(item.ourPrice) === 0) {
        alert(`Satır ${item.rowNumber} için bizim fiyat girilmedi!`)
        return
      }
    }

    setSubmittingTask(true)

    try {
      // PriceLog verilerini hazırla
      const priceLogs = savedItems.map(item => ({
        productName: item.productName,
        productCode: item.productCode,
        ourPrice: item.ourPrice,
        margin: item.margin,
        migrosPrice: item.migros || null,
        getirPrice: item.getir || null,
        a101Price: item.a101 || null,
        sarayGross: item.sarayGross || null,
        urfaGross: item.urfaGross || null,
        photo: item.migrosStatus.photo || item.getirStatus.photo || item.a101Status.photo || item.sarayGrossStatus.photo || item.urfaGrossStatus.photo || null
      }))

      // Görevi oluştur/güncelle ve gönder
      const response = await fetch('/api/tasks/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: taskId, // Eğer taskId varsa görev güncellenecek
          title: 'Fiyat Araştırması',
          description: `${savedItems.length} ürün için fiyat araştırması yapıldı`,
          taskType: 'FIYAT_ARASTIRMASI', // Yeni enum değeri
          priceLogs: priceLogs,
          photos: taskPhotos // Görev için yüklenen fotoğraflar
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Görev başarıyla gönderildi! ${savedItems.length} ürün kaydedildi.`)
        // Sayfayı temizle veya yönlendir
        router.push('/panel/satinalma')
      } else {
        alert(data.error || 'Görev gönderilirken bir hata oluştu')
      }
    } catch (error) {
      console.error('Task submit error:', error)
      alert('Görev gönderilirken bir hata oluştu')
    } finally {
      setSubmittingTask(false)
    }
  }

  // Marj %5'in altındaysa kırmızı uyarı
  const getRowClassName = (item: PriceItem): string => {
    const baseClass = "hover:bg-gray-50/50 transition-colors"
    if (item.margin < 5 && item.margin !== 0) {
      return `${baseClass} bg-red-50/50 border-l-4 border-red-500`
    }
    return baseClass
  }

  // Rakip fiyat hücresi bileşeni
  const CompetitorPriceCell = ({ item, field, label }: { item: PriceItem, field: 'migros' | 'getir' | 'a101' | 'sarayGross' | 'urfaGross', label: string }) => {
    const status = item[`${field}Status` as keyof PriceItem] as CompetitorStatus
    const price = item[field]

    return (
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <div className="flex-1 relative">
            <input
              type="number"
              value={price}
              onChange={(e) => updateItem(item.id, field, e.target.value)}
              placeholder="0.00"
              step="0.01"
              className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                status.status === 'equivalent'
                  ? 'bg-orange-50 border-orange-300'
                  : status.status === 'available'
                  ? 'bg-blue-50 border-blue-300'
                  : status.status === 'no-stock'
                  ? 'bg-gray-100 border-gray-300'
                  : 'bg-white border-gray-300'
              }`}
            />
            {/* FARKLI GRAMAJ etiketi - sadece 'available' seçildiyse görünür */}
            {status.status === 'available' && (
              <span className="absolute top-0 right-0 mt-1 mr-1 px-1 py-0.5 text-[7px] font-semibold bg-blue-200 text-blue-700 rounded-full whitespace-nowrap max-w-[90px] truncate">
                FARKLI GRAMAJ
              </span>
            )}
            {/* ÜRÜN YOK etiketi - sadece 'no-stock' seçildiyse görünür */}
            {status.status === 'no-stock' && (
              <span className="absolute top-0 right-0 mt-1 mr-1 px-1 py-0.5 text-[7px] font-semibold bg-gray-300 text-gray-700 rounded-full whitespace-nowrap max-w-[90px] truncate">
                ÜRÜN YOK
              </span>
            )}
            {/* Muadil ürün adı etiketi - sadece 'equivalent' seçildiyse ve ürün adı varsa görünür */}
            {status.status === 'equivalent' && status.equivalentProductName && (
              <span className="absolute top-0 right-0 mt-1 mr-1 px-1 py-0.5 text-[7px] font-semibold bg-orange-200 text-orange-700 rounded-full whitespace-nowrap max-w-[90px] truncate">
                {status.equivalentProductName}
              </span>
            )}
            {/* Muadil etiketi - 'equivalent' seçildiyse ama ürün adı yoksa sadece MUADİL yazısı */}
            {status.status === 'equivalent' && !status.equivalentProductName && (
              <span className="absolute top-0 right-0 mt-1 mr-1 px-1 py-0.5 text-[7px] font-semibold bg-orange-200 text-orange-700 rounded-full whitespace-nowrap">
                MUADİL
              </span>
            )}
          </div>
          <button
            onClick={() => setStatusModalOpen({ itemId: item.id, field })}
            className={`p-1.5 rounded-lg transition-colors touch-manipulation ${
              status.status === 'equivalent'
                ? 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                : status.status === 'available'
                ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                : status.status === 'no-stock'
                ? 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
            }`}
            title="Durum Seç"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </td>
    )
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
            <h1 className="text-lg font-bold text-gray-800">Fiyat Araştırması</h1>
            <div className="w-9"></div>
          </div>
          <p className="text-xs text-gray-500 text-center">Rakip firmaların fiyatlarını karşılaştır</p>
        </div>
      </div>

      {/* İçerik */}
      <div className="px-4 py-6">
        {/* Tablo Container */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 overflow-hidden">
          {/* Tablo */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[50px] sticky left-0 bg-gradient-to-r from-blue-50 to-blue-100/50 z-10">
                    No
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[120px]">
                    Kontrol Periyodu
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[120px]">
                    Ürün Kodu
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[150px]">
                    Ürün Adı
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[100px]">
                    Bizim Fiyat
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[80px]">
                    Marj (%)
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[110px]">
                    Migros
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[110px]">
                    Getir
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[110px]">
                    A101
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[130px]">
                    Saray Gross
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[130px]">
                    Urfa Gross
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[120px] sticky right-0 bg-gradient-to-r from-blue-50 to-blue-100/50 z-10">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className={getRowClassName(item)}>
                    {/* Sıra No */}
                    <td className="px-2 py-3 text-center text-sm font-semibold text-gray-600 sticky left-0 bg-inherit z-10">
                      {item.rowNumber}
                    </td>
                    
                    {/* Kontrol Periyodu */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <select
                        value={item.controlPeriod}
                        onChange={(e) => updateItem(item.id, 'controlPeriod', e.target.value)}
                        className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-semibold ${
                          item.controlPeriod === 'SÜPER'
                            ? 'bg-red-100 text-red-700 border-red-300'
                            : item.controlPeriod === '1. HAFTA'
                            ? 'bg-blue-100 text-blue-700 border-blue-300'
                            : 'bg-white border-gray-300 text-gray-700'
                        }`}
                      >
                        <option value="">Seçiniz</option>
                        <option value="SÜPER">SÜPER</option>
                        <option value="1. HAFTA">1. HAFTA</option>
                      </select>
                    </td>
                    
                    {/* Ürün Kodu */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <input
                        type="text"
                        value={item.productCode}
                        onChange={(e) => updateItem(item.id, 'productCode', e.target.value)}
                        placeholder="Sistem kodu"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                      />
                    </td>
                    
                    {/* Ürün Adı */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => updateItem(item.id, 'productName', e.target.value)}
                        placeholder="Ürün adı"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                      />
                    </td>
                    
                    {/* Bizim Fiyat */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        value={item.ourPrice}
                        onChange={(e) => updateItem(item.id, 'ourPrice', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50 font-semibold"
                      />
                    </td>
                    
                    {/* Marj (%) */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        value={item.margin !== 0 ? item.margin : ''}
                        onChange={(e) => {
                          const marginValue = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                          updateItem(item.id, 'margin', marginValue)
                        }}
                        placeholder="0.00"
                        step="0.01"
                        className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-center font-bold ${
                          item.margin < 5 && item.margin !== 0
                            ? 'bg-red-50 border-red-300 text-red-600'
                            : item.margin >= 5
                            ? 'bg-green-50 border-green-300 text-green-600'
                            : 'bg-white border-gray-300 text-gray-600'
                        }`}
                      />
                    </td>
                    
                    {/* Rakip Fiyat Hücreleri */}
                    <CompetitorPriceCell item={item} field="migros" label="Migros" />
                    <CompetitorPriceCell item={item} field="getir" label="Getir" />
                    <CompetitorPriceCell item={item} field="a101" label="A101" />
                    <CompetitorPriceCell item={item} field="sarayGross" label="Saray Gross" />
                    <CompetitorPriceCell item={item} field="urfaGross" label="Urfa Gross" />
                    
                    {/* İşlemler */}
                    <td className="px-3 py-3 whitespace-nowrap sticky right-0 bg-inherit z-10">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors touch-manipulation"
                          title="Düzenle"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSaveRow(item.id)}
                          disabled={!item.productName.trim() || !item.ourPrice}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all touch-manipulation ${
                            item.saved
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {item.saved ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Kaydedildi</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>Kaydet</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div
                        id={`save-notification-${item.id}`}
                        className="hidden text-xs text-green-600 text-center mt-1 font-medium"
                      >
                        ✓ Kaydedildi!
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* Görev İçin Fotoğraf Yükleme Bölümü */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Görev İçin Fotoğraf Ekle (Opsiyonel)</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Görevle ilgili ek fotoğraflar ekleyebilirsiniz. Bu fotoğraflar yöneticiye gösterilecektir.
          </p>
          <ImageUploader
            value={taskPhotos}
            onChange={setTaskPhotos}
            maxImages={10}
            folder="mesaidefteri/fiyat-arastirma/gorev"
          />
        </div>

        {/* Görevi Gönder Butonu */}
        <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-200 p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Görevi Gönder</h3>
              <p className="text-sm text-gray-600">
                {items.filter(item => item.saved).length} satır kaydedildi. Görevi yöneticiye göndermek için butona tıklayın.
              </p>
            </div>
            <button
              onClick={handleSubmitTask}
              disabled={submittingTask || items.filter(item => item.saved).length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600"
            >
              {submittingTask ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Gönderiliyor...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Görevi Gönder</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bilgi Notu */}
        <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-200/50">
          <p className="text-xs text-blue-800">
            💡 <strong>İpucu:</strong> Tabloyu yatay kaydırarak tüm sütunları görebilirsiniz. Her satırı tek tek kaydetmeyi unutmayın! Fiyat giriş kutucuklarına tıklayarak birim fiyat hesaplayabilirsiniz. 'Ürün Yok' seçildiğinde fotoğraf zorunludur.
          </p>
        </div>
      </div>

      {/* Birim Fiyat Dönüştürücü Modal */}
      {unitConverterOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Birim Fiyat Hesapla</h3>
              <button
                onClick={() => {
                  setUnitConverterOpen(null)
                  setUnitConverterData({ price: '', weight: '', unitPrice: '' })
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Toplam Fiyat (₺)</label>
                <input
                  type="number"
                  value={unitConverterData.price}
                  onChange={(e) => {
                    setUnitConverterData({ ...unitConverterData, price: e.target.value, unitPrice: '' })
                  }}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gramaj (g)</label>
                <input
                  type="number"
                  value={unitConverterData.weight}
                  onChange={(e) => {
                    setUnitConverterData({ ...unitConverterData, weight: e.target.value, unitPrice: '' })
                  }}
                  placeholder="Örn: 500"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Ürünün gram cinsinden ağırlığını girin</p>
              </div>
              {unitConverterData.price && unitConverterData.weight && (
                <button
                  onClick={calculateUnitPrice}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Birim Fiyatı Hesapla
                </button>
              )}
              {unitConverterData.unitPrice && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 mb-2">Hesaplanan Birim Fiyatlar:</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">100 Gram Başına:</p>
                      <p className="text-xl font-bold text-green-600">{unitConverterData.unitPrice} ₺</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">1 Kilogram Başına:</p>
                      <p className="text-lg font-bold text-green-600">{(parseFloat(unitConverterData.unitPrice) * 10).toFixed(2)} ₺</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setUnitConverterOpen(null)
                    setUnitConverterData({ price: '', weight: '', unitPrice: '' })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Kapat
                </button>
                {unitConverterData.unitPrice && (
                  <button
                    onClick={() => {
                      // 100 gram başına fiyatı alana yaz
                      updateItem(unitConverterOpen!.itemId, unitConverterOpen!.field as keyof PriceItem, unitConverterData.unitPrice)
                      setUnitConverterOpen(null)
                      setUnitConverterData({ price: '', weight: '', unitPrice: '' })
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    100g Fiyatını Uygula
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Durum Seçim Modal */}
      {statusModalOpen && (() => {
        const item = items.find(i => i.id === statusModalOpen!.itemId)
        if (!item) return null
        const status = item[`${statusModalOpen.field}Status` as keyof PriceItem] as CompetitorStatus

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Ürün Durumu Seç</h3>
                <button
                  onClick={() => setStatusModalOpen(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => handleStatusChange(statusModalOpen.itemId, statusModalOpen.field, 'available')}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                    status.status === 'available'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">Farklı Gramajlı Ürün</span>
                    {status.status === 'available' && (
                      <span className="text-xs text-blue-600 ml-auto">(Seçili - Tekrar tıklayarak iptal)</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Birim fiyat hesaplama ekranı açılacak</div>
                </button>

                <button
                  onClick={() => handleStatusChange(statusModalOpen.itemId, statusModalOpen.field, 'no-stock')}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                    status.status === 'no-stock'
                      ? 'border-gray-500 bg-gray-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-semibold bg-gray-300 text-gray-700 rounded">ÜRÜN YOK</span>
                    <span className="font-semibold text-gray-700">Ürün Yok</span>
                    {status.status === 'no-stock' && (
                      <span className="text-xs text-gray-600 ml-auto">(Seçili - Tekrar tıklayarak iptal)</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Ürün bu markette yok - Fotoğraf zorunlu</div>
                </button>
                
                <button
                  onClick={() => handleStatusChange(statusModalOpen.itemId, statusModalOpen.field, 'equivalent')}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                    status.status === 'equivalent'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-semibold bg-orange-200 text-orange-700 rounded">MUADİL</span>
                    <span className="font-semibold text-orange-700">Muadil</span>
                    {status.status === 'equivalent' && (
                      <span className="text-xs text-orange-600 ml-auto">(Seçili - Tekrar tıklayarak iptal)</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Benzer ürün fiyatı - Ürün adı girilecek</div>
                </button>
              </div>

              {/* Muadil Ürün Adı Bölümü - Her zaman göster (equivalent seçildiyse) */}
              {status.status === 'equivalent' && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <label className="block text-sm font-semibold text-orange-700 mb-2">
                    Muadil Ürün Adı *
                  </label>
                  <input
                    type="text"
                    value={status.equivalentProductName || ''}
                    onChange={(e) => {
                      setItems(currentItems => {
                        return currentItems.map(item => {
                          if (item.id === statusModalOpen.itemId) {
                            const statusField = `${statusModalOpen.field}Status` as keyof PriceItem
                            const currentStatus = item[statusField] as CompetitorStatus
                            return {
                              ...item,
                              [statusField]: {
                                ...currentStatus,
                                equivalentProductName: e.target.value
                              }
                            }
                          }
                          return item
                        })
                      })
                    }}
                    placeholder="Örn: A Markası Bisküvi 300g"
                    className="w-full px-3 py-2 border-2 border-orange-400 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-orange-50 font-medium text-orange-900"
                  />
                  <p className="text-xs text-orange-600 mt-1">Bu isim fiyatın üstünde turuncu renkte gösterilecek</p>
                </div>
              )}

              {/* Fotoğraf Bölümü - Ürün Yok */}
              {status.status === 'no-stock' && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    * Fotoğraf Zorunlu
                  </label>
                  {status.photo ? (
                    <div className="relative">
                      <img src={status.photo} alt="Kanıt" className="w-full h-32 object-cover rounded-lg border border-gray-200" />
                      <button
                        onClick={() => removePhoto(statusModalOpen.itemId, statusModalOpen.field)}
                        className="absolute top-2 right-2 p-1.5 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePhotoClick(statusModalOpen.itemId, statusModalOpen.field)}
                      className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-500 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-sm text-gray-600"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Fotoğraf Çek</span>
                    </button>
                  )}
                  {!status.photo && (
                    <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Kanıt yoksa işlem yok - Fotoğraf zorunludur!
                    </p>
                  )}
                </div>
              )}

              {/* Muadil için Açıklama */}
              {status.status === 'equivalent' && status.equivalentProductName && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama (Opsiyonel)</label>
                  <textarea
                    value={status.note || ''}
                    onChange={(e) => {
                      setItems(currentItems => {
                        return currentItems.map(item => {
                          if (item.id === statusModalOpen.itemId) {
                            const statusField = `${statusModalOpen.field}Status` as keyof PriceItem
                            const currentStatus = item[statusField] as CompetitorStatus
                            return {
                              ...item,
                              [statusField]: {
                                ...currentStatus,
                                note: e.target.value
                              }
                            }
                          }
                          return item
                        })
                      })
                    }}
                    placeholder="Muadil ürün hakkında ek açıklama..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none"
                  />
                </div>
              )}

              {/* Kapat Butonu */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    // Muadil seçildiyse ve ürün adı girilmediyse uyar
                    if (status.status === 'equivalent' && !status.equivalentProductName?.trim()) {
                      alert('Muadil ürün adı zorunludur!')
                      return
                    }
                    setStatusModalOpen(null)
                  }}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Tamam
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Gizli File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoChange}
        className="hidden"
      />
    </div>
  )
}

export default function FiyatArastirmasiPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>}>
      <FiyatArastirmasiContent />
    </Suspense>
  )
}
