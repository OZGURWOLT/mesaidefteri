'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { AlertTriangle, X, Home } from 'lucide-react'
import { getUserHomePage } from '@/lib/route-permissions'

interface UnauthorizedAccessModalProps {
  isOpen: boolean
  onClose?: () => void
  message?: string
}

export default function UnauthorizedAccessModal({
  isOpen,
  onClose,
  message = 'Bu sayfayı görüntülemek için gerekli yetkiye sahip değilsiniz. Lütfen yöneticinizle iletişime geçin.'
}: UnauthorizedAccessModalProps) {
  const router = useRouter()
  const { data: session } = useSession()

  if (!isOpen) return null

  const handleGoHome = () => {
    const homePage = getUserHomePage(session?.user?.role)
    router.push(homePage)
    if (onClose) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-auto transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">Erişim Engellendi</h3>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p className="text-gray-700 leading-relaxed mb-6">
            {message}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleGoHome}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-sm"
            >
              <Home className="w-5 h-5" />
              <span>Ana Sayfaya Dön</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-semibold transition-colors"
              >
                Kapat
              </button>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Sorun devam ederse sistem yöneticinizle iletişime geçin.
          </p>
        </div>
      </div>
    </div>
  )
}
