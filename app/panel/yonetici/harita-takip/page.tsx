'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { 
  Search,
  MapPin,
  Navigation,
  Battery,
  Zap,
  User as UserIcon,
  Home,
  Bike,
  Clock,
  Activity,
  X
} from 'lucide-react'
import { LocationTracking, mockTrackingData, centerLocation } from '../types'

export default function HaritaTakip() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPerson, setSelectedPerson] = useState<LocationTracking | null>(null)
  const [trackingData] = useState<LocationTracking[]>(mockTrackingData.filter(t => t.speed >= 0))

  // Sadece aktif olan personelleri göster
  const activePersonnel = trackingData.filter(p => p.speed >= 0)

  // Filtreleme
  const filteredPersonnel = activePersonnel.filter(person => {
    const matchesSearch = searchQuery === '' || 
      `${person.name} ${person.surname}`.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const handleMarkerClick = (person: LocationTracking) => {
    setSelectedPerson(person)
  }

  const getMarkerIcon = (role: string) => {
    if (role === 'Kurye') {
      return <Bike className="w-5 h-5 text-blue-400" />
    }
    return <UserIcon className="w-5 h-5 text-green-400" />
  }

  const getMarkerColor = (role: string) => {
    if (role === 'Kurye') {
      return 'bg-blue-500 border-blue-400'
    }
    return 'bg-green-500 border-green-400'
  }

  const getBatteryColor = (level: number) => {
    if (level >= 80) return 'text-green-400'
    if (level >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  // Harita üzerindeki marker pozisyonları (viewport'a göre yüzde bazlı)
  // Gerçek haritada lat/lng'den pixel'e dönüşüm olurdu - burada simüle edilmiş
  const getMarkerStyle = (person: LocationTracking, index: number) => {
    // Her personel için farklı pozisyon (gerçek konumlara göre simüle edilmiş)
    const positions = [
      { x: 55, y: 45 },  // Fatma - Kurye (hareket halinde)
      { x: 48, y: 52 },  // Müslüm - Satınalma (durağan)
      { x: 52, y: 55 },  // Ayşe - Kasiyer (durağan)
      { x: 58, y: 40 },  // Can - Kurye (hareket halinde)
    ]
    
    const pos = positions[index] || { x: 50, y: 50 }
    
    return {
      left: `${pos.x}%`,
      top: `${pos.y}%`,
      transform: 'translate(-50%, -50%)'
    }
  }

  return (
    <div className="relative w-full h-[calc(100vh-80px)] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Harita Placeholder - Dark Mode */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Harita Grid Pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
        
        {/* Merkez Şube Marker - Sabit, Kırmızı */}
        <div 
          className="absolute z-20"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="relative">
            <div className="w-12 h-12 bg-red-500 rounded-full border-4 border-red-300 shadow-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <span className="text-xs font-semibold text-white bg-red-500 px-2 py-1 rounded shadow-lg">
                {centerLocation.name}
              </span>
            </div>
          </div>
        </div>

        {/* Personel Markers */}
        {trackingData.map((person, index) => (
          <div
            key={person.id}
            onClick={() => handleMarkerClick(person)}
            className="absolute z-20 cursor-pointer group"
            style={getMarkerStyle(person, index)}
          >
            {/* Pulse Efekti - Sadece hareket halindeyse */}
            {person.isMoving && (
              <>
                <div className="absolute inset-0 rounded-full bg-blue-400 opacity-75 animate-ping" style={{ width: '60px', height: '60px', marginLeft: '-10px', marginTop: '-10px' }} />
                <div className="absolute inset-0 rounded-full bg-blue-500 opacity-50 animate-ping" style={{ width: '80px', height: '80px', marginLeft: '-20px', marginTop: '-20px', animationDelay: '0.5s' }} />
              </>
            )}
            
            {/* Marker */}
            <div className={`relative w-10 h-10 ${getMarkerColor(person.role)} rounded-full border-2 shadow-lg flex items-center justify-center transition-transform group-hover:scale-125`}>
              {getMarkerIcon(person.role)}
            </div>

            {/* Hover Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl whitespace-nowrap border border-gray-700">
                <p className="font-semibold">{person.name} {person.surname}</p>
                <p className="text-gray-400">{person.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Yüzen Panel - Sağda */}
      <div className="absolute right-4 top-4 bottom-4 w-80 md:w-96 z-30">
        <div className="h-full bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl overflow-hidden flex flex-col">
          {/* Panel Header */}
          <div className="p-4 border-b border-white/20 bg-white/5">
            <h2 className="text-lg font-bold text-white mb-3">Canlı Personel Listesi</h2>
            
            {/* Arama */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Personel Ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>

          {/* Personel Listesi */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredPersonnel.map((person) => (
              <div
                key={person.id}
                onClick={() => handleMarkerClick(person)}
                className={`bg-white/10 hover:bg-white/20 rounded-lg p-3 border border-white/20 cursor-pointer transition-all ${
                  selectedPerson?.id === person.id ? 'bg-white/20 border-blue-400 shadow-lg' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-full ${getMarkerColor(person.role)} flex items-center justify-center flex-shrink-0`}>
                      {person.role === 'Kurye' ? (
                        <Bike className="w-4 h-4 text-white" />
                      ) : (
                        <UserIcon className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">
                        {person.name} {person.surname}
                      </p>
                      <p className="text-xs text-gray-300 truncate">{person.role}</p>
                    </div>
                  </div>
                  
                  {/* Canlı İndikatör */}
                  {person.isMoving && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Detaylar */}
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <Battery className={`w-3.5 h-3.5 ${getBatteryColor(person.batteryLevel)}`} />
                    <span>{person.batteryLevel}%</span>
                  </div>
                  
                  {person.isMoving && person.speed > 0 && (
                    <div className="flex items-center gap-1.5 text-gray-300">
                      <Zap className="w-3.5 h-3.5 text-yellow-400" />
                      <span>{person.speed} km/h</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1.5 text-gray-300 col-span-2">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>Son Konum: {person.lastUpdate}</span>
                  </div>
                  
                  {person.currentTask && (
                    <div className="col-span-2 mt-1">
                      <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded">
                        {person.currentTask}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredPersonnel.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <UserIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Aktif personel bulunamadı</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seçili Personel Detay Overlay - Altta */}
      {selectedPerson && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-96 md:w-96 z-30">
          <div className="bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-12 h-12 rounded-full ${getMarkerColor(selectedPerson.role)} flex items-center justify-center flex-shrink-0`}>
                  {selectedPerson.role === 'Kurye' ? (
                    <Bike className="w-6 h-6 text-white" />
                  ) : (
                    <UserIcon className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-lg">
                    {selectedPerson.name} {selectedPerson.surname}
                  </h3>
                  <p className="text-sm text-gray-300">{selectedPerson.role}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPerson(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Detaylar */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <Battery className={`w-5 h-5 mx-auto mb-1 ${getBatteryColor(selectedPerson.batteryLevel)}`} />
                <p className="text-xs text-gray-400">Pil</p>
                <p className="text-sm font-semibold text-white">{selectedPerson.batteryLevel}%</p>
              </div>
              
              {selectedPerson.isMoving && selectedPerson.speed > 0 && (
                <div className="bg-white/10 rounded-lg p-2 text-center">
                  <Zap className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
                  <p className="text-xs text-gray-400">Hız</p>
                  <p className="text-sm font-semibold text-white">{selectedPerson.speed} km/h</p>
                </div>
              )}
              
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <Clock className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                <p className="text-xs text-gray-400">Güncelleme</p>
                <p className="text-sm font-semibold text-white">{selectedPerson.lastUpdate}</p>
              </div>
            </div>

            {/* Görev Bilgisi */}
            {selectedPerson.currentTask && (
              <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-white">{selectedPerson.currentTask}</span>
                </div>
                {selectedPerson.eta && (
                  <p className="text-xs text-gray-300 ml-6">Varışa: {selectedPerson.eta}</p>
                )}
              </div>
            )}

            {/* Konum Bilgisi */}
            <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-2 text-xs text-gray-400">
              <MapPin className="w-3.5 h-3.5" />
              <span>Konum: {selectedPerson.lat.toFixed(4)}, {selectedPerson.lng.toFixed(4)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
