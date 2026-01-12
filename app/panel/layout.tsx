'use client'

import RouteGuard from '@/components/auth/RouteGuard'

/**
 * Global Panel Layout
 * Tüm /panel/* sayfaları için otomatik yetki kontrolü yapar
 * Eğer bir sayfa kendi layout'unda RouteGuard kullanıyorsa (örn: yonetici/layout.tsx),
 * bu layout'taki RouteGuard çalışmaz (nested layout'lar önceliklidir)
 */
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RouteGuard>
      {children}
    </RouteGuard>
  )
}
