import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { hasAccess, getUserHomePage } from '@/lib/route-permissions'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth
  const userRole = session?.user?.role

  // Public routes - herkes erişebilir (login sayfası ve NextAuth endpoint'leri)
  const publicRoutes = ['/', '/api/auth']
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
  
  // Eğer login sayfasındaysa ve giriş yapmışsa, rolüne göre yönlendir
  if (pathname === '/' && session && userRole) {
    const redirectPath = getUserHomePage(userRole)
    return NextResponse.redirect(new URL(redirectPath, req.url))
  }

  // Public routes için devam et
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // /panel/* altındaki tüm sayfalar için global yetki kontrolü
  if (pathname.startsWith('/panel')) {
    // Şifre değiştirme sayfası - mustChangePassword true olanlar için erişilebilir
    if (pathname === '/panel/sifre-degistir') {
      // Giriş yapmamış kullanıcıları login'e yönlendir
      if (!session || !userRole) {
        const loginUrl = new URL('/', req.url)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
      }
      // Giriş yapmış kullanıcılar için devam et (mustChangePassword kontrolü sayfa içinde yapılıyor)
      return NextResponse.next()
    }

    // Giriş yapmamış kullanıcıları login'e yönlendir
    if (!session || !userRole) {
      const loginUrl = new URL('/', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Rol bazlı erişim kontrolü
    if (!hasAccess(userRole, pathname)) {
      // Kullanıcının ana sayfasına yönlendir ve hata mesajı ekle
      const homePage = getUserHomePage(userRole)
      const redirectUrl = new URL(homePage, req.url)
      redirectUrl.searchParams.set('error', 'unauthorized')
      redirectUrl.searchParams.set('message', 'Bu sayfaya erişim yetkiniz yok.')
      return NextResponse.redirect(redirectUrl)
    }
  }

  // API routes - özel kontrol
  // Onay/Red işlemleri sadece MANAGER veya SUPERVIZOR
  if (pathname.startsWith('/api/tasks/approve') || pathname.startsWith('/api/tasks/reject')) {
    if (!session || (userRole !== 'MANAGER' && userRole !== 'SUPERVIZOR')) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim. Sadece yönetici ve süpervizör işlem yapabilir.' },
        { status: 403 }
      )
    }
    return NextResponse.next()
  }

  // Bekleyen görevler listesi - MANAGER veya SUPERVIZOR
  if (pathname === '/api/tasks/pending') {
    if (!session || (userRole !== 'MANAGER' && userRole !== 'SUPERVIZOR')) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { status: 403 }
      )
    }
    return NextResponse.next()
  }

  // Bildirimler - giriş yapmış herkes kendi bildirimlerini görebilir
  if (pathname.startsWith('/api/notifications')) {
    if (!session) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // Konum kayıt endpoint'i - giriş yapmış herkes kendi konumunu kaydedebilir
  if (pathname === '/api/user/log') {
    if (!session) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // Development helper endpoint'i - kullanıcı oluşturma (sadece development)
  if (pathname === '/api/admin/create-users') {
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.next()
    } else {
      return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
    }
  }

  // Kullanıcı yönetimi API endpoint'leri - MANAGER veya SUPERVIZOR
  if (pathname.startsWith('/api/admin/users')) {
    if (!session) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { status: 401 }
      )
    }
    
    if (userRole !== 'MANAGER' && userRole !== 'SUPERVIZOR') {
      return NextResponse.json(
        { error: 'Yetkisiz erişim. Sadece yönetici ve süpervizör işlem yapabilir.' },
        { status: 403 }
      )
    }
    
    return NextResponse.next()
  }

  // Diğer API rotaları için genel kontrol
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth') && !pathname.startsWith('/api/admin')) {
    if (!session) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { status: 401 }
      )
    }
  }

  // Varsayılan olarak devam et
  return NextResponse.next()
})

// Middleware'in hangi path'lerde çalışacağını belirle
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
