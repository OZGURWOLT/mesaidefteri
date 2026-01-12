'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { hasAccess, getUserHomePage } from '@/lib/route-permissions'
import UnauthorizedAccessModal from './UnauthorizedAccessModal'
import { Loader2 } from 'lucide-react'

interface RouteGuardProps {
  children: React.ReactNode
  requiredRoles?: string[] // Opsiyonel: Component seviyesinde özel rol kontrolü
}

/**
 * Route Guard Component
 * Tüm /panel/* sayfalarında kullanılabilir, otomatik yetki kontrolü yapar
 */
export default function RouteGuard({ children, requiredRoles }: RouteGuardProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [showUnauthorizedModal, setShowUnauthorizedModal] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Session yüklenene kadar bekle
    if (status === 'loading') {
      return
    }

    setIsChecking(true)

    // /panel altındaki sayfalar için kontrol
    if (pathname?.startsWith('/panel')) {
      const userRole = session?.user?.role

      // Giriş yapmamış kullanıcı
      if (!session || !userRole) {
        router.push('/')
        setIsChecking(false)
        return
      }

      // Rol bazlı erişim kontrolü
      const hasPermission = requiredRoles
        ? requiredRoles.includes(userRole)
        : hasAccess(userRole, pathname)

      if (!hasPermission) {
        // URL'den error parametresini kontrol et
        const errorParam = searchParams?.get('error')
        const messageParam = searchParams?.get('message')

        if (errorParam === 'unauthorized') {
          setShowUnauthorizedModal(true)
          // URL'den error parametrelerini temizle
          const cleanUrl = pathname.split('?')[0]
          router.replace(cleanUrl, { scroll: false })
        } else {
          // Direkt yetkisiz erişim - ana sayfaya yönlendir
          const homePage = getUserHomePage(userRole)
          router.push(`${homePage}?error=unauthorized&message=Bu sayfaya erişim yetkiniz yok.`)
        }
      } else {
        setShowUnauthorizedModal(false)
      }
    } else {
      // /panel dışındaki sayfalar için modal'ı kapat
      setShowUnauthorizedModal(false)
    }

    setIsChecking(false)
  }, [pathname, session, status, router, searchParams, requiredRoles])

  // Loading durumu
  if (status === 'loading' || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  // Yetkisiz erişim durumunda sadece modal göster, children'ı render etme
  if (showUnauthorizedModal) {
    return (
      <>
        <div className="min-h-screen bg-gray-50" />
        <UnauthorizedAccessModal
          isOpen={showUnauthorizedModal}
          onClose={() => {
            setShowUnauthorizedModal(false)
            const homePage = getUserHomePage(session?.user?.role)
            router.push(homePage)
          }}
        />
      </>
    )
  }

  return (
    <>
      {children}
      <UnauthorizedAccessModal
        isOpen={showUnauthorizedModal}
        onClose={() => {
          setShowUnauthorizedModal(false)
          const homePage = getUserHomePage(session?.user?.role)
          router.push(homePage)
        }}
      />
    </>
  )
}
