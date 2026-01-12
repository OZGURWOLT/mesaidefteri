'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LogOut, Clock } from 'lucide-react'

interface LogoutButtonProps {
  variant?: 'default' | 'icon' | 'minimal' | 'shift-end'
  className?: string
  showShiftEnd?: boolean
}

export default function LogoutButton({ variant = 'default', className = '', showShiftEnd = true }: LogoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [shiftEndLoading, setShiftEndLoading] = useState(false)
  const router = useRouter()

  // Konum alma fonksiyonu
  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        resolve(null) // Konum servisi yoksa null döndür, çıkışı engelleme
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        () => {
          resolve(null) // Hata durumunda null döndür, çıkışı engelleme
        },
        {
          enableHighAccuracy: false,
          timeout: 5000, // 5 saniye timeout
          maximumAge: 0
        }
      )
    })
  }

  // Konum kaydetme fonksiyonu
  const logLocation = async (type: 'LOGIN' | 'LOGOUT', latitude: number | null, longitude: number | null) => {
    try {
      const response = await fetch('/api/user/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          latitude,
          longitude
        }),
      })

      if (!response.ok) {
        console.error('Konum kaydedilemedi:', await response.text())
      }
    } catch (error) {
      console.error('Konum kaydetme hatası:', error)
      // Konum kaydetme hatası çıkışı engellemez
    }
  }

  // Mesai bitiş - sadece çıkış saatini kaydet, sistemden çıkma
  const handleShiftEnd = async () => {
    if (shiftEndLoading) return

    setShiftEndLoading(true)

    try {
      // Önce konum al
      let location: { latitude: number; longitude: number } | null = null
      
      try {
        location = await Promise.race([
          getCurrentLocation(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
        ])
      } catch (error) {
        location = null
      }

      // Çıkış saatini kaydet (LOGOUT tipi)
      if (location) {
        await logLocation('LOGOUT', location.latitude, location.longitude)
      } else {
        await logLocation('LOGOUT', null, null)
      }

      alert('Mesai bitiş saati kaydedildi!')
    } catch (error) {
      console.error('Shift end error:', error)
      alert('Mesai bitiş saati kaydedilirken bir hata oluştu')
    } finally {
      setShiftEndLoading(false)
    }
  }

  const handleLogout = async () => {
    if (loading) return

    setLoading(true)

    try {
      // Önce konum al (zaman aşımı kısa, engellemez)
      let location: { latitude: number; longitude: number } | null = null
      
      try {
        location = await Promise.race([
          getCurrentLocation(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)) // 5 saniye timeout
        ])
      } catch (error) {
        // Hata durumunda null ile devam et
        location = null
      }

      // Konumu kaydet (hata olsa bile çıkışı engelleme)
      if (location) {
        await logLocation('LOGOUT', location.latitude, location.longitude)
      } else {
        await logLocation('LOGOUT', null, null)
      }

      // Çıkış işlemini yap
      await signOut({ 
        redirect: true,
        callbackUrl: '/'
      })
    } catch (error) {
      console.error('Logout error:', error)
      // Hata olsa bile çıkış yap
      await signOut({ 
        redirect: true,
        callbackUrl: '/'
      })
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'icon') {
    return (
      <div className="flex items-center gap-2">
        {showShiftEnd && (
          <button
            onClick={handleShiftEnd}
            disabled={shiftEndLoading}
            className={`p-2 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            aria-label="Mesaim Bitti"
            title="Mesaim Bitti, Çıkış Yapıyorum"
          >
            {shiftEndLoading ? (
              <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Clock className="w-5 h-5 text-green-600" />
            )}
          </button>
        )}
        <button
          onClick={handleLogout}
          disabled={loading}
          className={`p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          aria-label="Çıkış Yap"
          title="Çıkış Yap"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <LogOut className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        className={`px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${className}`}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Çıkılıyor...</span>
          </>
        ) : (
          <>
            <LogOut className="w-4 h-4" />
            <span>Çıkış Yap</span>
          </>
        )}
      </button>
    )
  }

  // Default variant
  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium ${className}`}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Çıkılıyor...</span>
        </>
      ) : (
        <>
          <LogOut className="w-4 h-4" />
          <span>Çıkış Yap</span>
        </>
      )}
    </button>
  )
}
