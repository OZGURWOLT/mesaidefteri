'use client'

import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  MapPin, 
  FileText, 
  User as UserIcon,
  Building2,
  CalendarCheck,
  Shield
} from 'lucide-react'
import LogoutButton from '@/components/auth/LogoutButton'
import RouteGuard from '@/components/auth/RouteGuard'
import { useState, useEffect } from 'react'

export default function YoneticiLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const currentUser = session?.user
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [loadingBranches, setLoadingBranches] = useState(true)

  const menuItems = [
    { id: 'overview', label: 'Genel Bakış', icon: LayoutDashboard, path: '/panel/yonetici' },
    { id: 'staff', label: 'Personel Listesi', icon: Users, path: '/panel/yonetici/personel' },
    { id: 'approvals', label: 'Onay Bekleyenler', icon: Clock, path: '/panel/yonetici/onay-bekleyenler' },
    { id: 'shifts', label: 'Vardiya & İzin', icon: CalendarCheck, path: '/panel/yonetici/vardiya-izin' },
    { id: 'map', label: 'Harita Takip', icon: MapPin, path: '/panel/yonetici/harita-takip' },
    { id: 'reports', label: 'Raporlar', icon: FileText, path: '/panel/yonetici/raporlar' },
  ]

  const isActive = (path: string) => {
    if (path === '/panel/yonetici') {
      return pathname === path
    }
    return pathname.startsWith(path)
  }

  // Şubeleri yükle
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setLoadingBranches(true)
        const response = await fetch('/api/branches')
        if (response.ok) {
          const data = await response.json()
          setBranches(data.branches || [])
        }
      } catch (error) {
        console.error('Error fetching branches:', error)
      } finally {
        setLoadingBranches(false)
      }
    }
    fetchBranches()
  }, [])

  return (
    <RouteGuard requiredRoles={['MANAGER']}>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-800">Mesaidefteri</h1>
            <p className="text-xs text-gray-500 mt-1">Yönetici Paneli</p>
          </div>
          
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <Link
                  key={item.id}
                  href={item.path}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    active
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-gray-200 space-y-2">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                {currentUser?.name?.charAt(0) || 'Y'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{currentUser?.name || 'Yönetici'}</p>
                <p className="text-xs text-gray-500 truncate">{currentUser?.username || 'admin@mesaidefteri.com'}</p>
              </div>
            </div>
            <LogoutButton variant="minimal" className="w-full justify-center" />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header - Süpervizör tasarımına benzer, mavi tonlarında */}
          <header className="bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-blue-900/30 border-b border-blue-700/30 backdrop-blur-md sticky top-0 z-50">
            <div className="px-4 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold text-blue-400">Yönetici Komuta Merkezi</h1>
                    <p className="text-[10px] text-blue-200/70">Yönetim Seviyesi</p>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Şube Seçici */}
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="bg-gray-800/50 border border-blue-700/50 rounded-lg px-3 py-1.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs h-[32px]"
                      disabled={loadingBranches}
                    >
                      <option value="all">Tüm Şubeler</option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* İzin Vardiya Yönetimi Butonu */}
                  <button
                    onClick={() => router.push('/panel/yonetici/vardiya-izin')}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-xs min-w-[80px] h-[32px]"
                    title="İzin Vardiya Yönetimi"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs">İzin Vardiya</span>
                  </button>

                  {/* Görev Ekle Butonu */}
                  <button
                    onClick={() => router.push('/panel/gorev-ekle')}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-xs min-w-[80px] h-[32px]"
                    title="Görev Ekle"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs">Görev Ekle</span>
                  </button>

                  {/* Hesabım Butonu - En Sağda */}
                  <button
                    onClick={() => router.push('/panel/yonetici/hesabim')}
                    className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-xs min-w-[80px] h-[32px]"
                    title="Hesabım"
                  >
                    <div className="flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      <span className="hidden sm:inline text-[10px]">Hesabım</span>
                    </div>
                    {session?.user?.name && (
                      <span className="text-[8px] text-blue-100 font-normal leading-tight">
                        {session.user.name}
                      </span>
                    )}
                  </button>

                  {/* Logout Button */}
                  <LogoutButton variant="icon" showShiftEnd={true} />
                </div>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <div className={`flex-1 overflow-hidden ${pathname.includes('/harita-takip') ? 'p-0' : 'overflow-y-auto p-6'}`}>
            {children}
          </div>
        </main>
      </div>
    </RouteGuard>
  )
}
