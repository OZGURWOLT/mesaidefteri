import { UserRole } from '@prisma/client'

/**
 * Rol bazlı sayfa erişim matrisi
 * Her sayfa için hangi rollerin erişebileceğini tanımlar
 */
export const routePermissions: Record<string, UserRole[]> = {
  // Şifre değiştirme - Tüm giriş yapmış kullanıcılar (mustChangePassword kontrolü sayfa içinde)
  '/panel/sifre-degistir': ['SUPERVIZOR', 'MANAGER', 'STAFF', 'DEVELOPER', 'KASIYER'],

  // Yönetici sayfaları - Sadece MANAGER
  '/panel/yonetici': ['MANAGER'],
  '/panel/yonetici/personel': ['MANAGER'],
  '/panel/yonetici/onay-bekleyenler': ['MANAGER'],
  '/panel/yonetici/vardiya-izin': ['MANAGER'],
  '/panel/yonetici/harita-takip': ['MANAGER'],
  '/panel/yonetici/raporlar': ['MANAGER'],

  // Süpervizör sayfaları - Sadece SUPERVIZOR
  '/panel/supervizor': ['SUPERVIZOR'],
  '/panel/supervizor/kullanicilar': ['SUPERVIZOR'],
  '/panel/supervizor/vardiya-yonetimi': ['SUPERVIZOR'],
  '/panel/supervizor/personel': ['SUPERVIZOR'],
  '/panel/supervizor/hesabim': ['SUPERVIZOR'],

  // Görev ekleme - MANAGER ve SUPERVIZOR
  '/panel/gorev-ekle': ['MANAGER', 'SUPERVIZOR'],

  // Personel sayfaları - STAFF, MANAGER, SUPERVIZOR
  '/panel/satinalma': ['STAFF', 'MANAGER', 'SUPERVIZOR'],
  '/panel/satinalma/fiyat-arastirmasi': ['STAFF', 'MANAGER', 'SUPERVIZOR'],
  '/panel/satinalma/gunluk-faaliyet': ['STAFF', 'MANAGER', 'SUPERVIZOR'],
  '/panel/gorev': ['STAFF', 'MANAGER', 'SUPERVIZOR'],

  // Kurye sayfaları - STAFF, MANAGER, SUPERVIZOR
  '/panel/kurye': ['STAFF', 'MANAGER', 'SUPERVIZOR'],

  // Kasiyer sayfaları - KASIYER, MANAGER, SUPERVIZOR
  '/panel/kasiyer': ['KASIYER', 'MANAGER', 'SUPERVIZOR'],

  // Yazılımcı sayfaları - DEVELOPER, MANAGER, SUPERVIZOR
  '/panel/yazilimci': ['DEVELOPER', 'MANAGER', 'SUPERVIZOR'],
}

/**
 * Bir path için hangi rollerin erişebileceğini kontrol eder
 */
export function getAllowedRoles(pathname: string): UserRole[] | null {
  // Tam eşleşme kontrolü
  if (routePermissions[pathname]) {
    return routePermissions[pathname]
  }

  // Prefix eşleşme kontrolü (alt sayfalar için)
  for (const [route, roles] of Object.entries(routePermissions)) {
    if (pathname.startsWith(route)) {
      return roles
    }
  }

  // Varsayılan: Eğer /panel altındaysa ama tanımlı değilse, sadece giriş yapmış kullanıcılar erişebilir
  if (pathname.startsWith('/panel')) {
    return ['STAFF', 'MANAGER', 'SUPERVIZOR', 'DEVELOPER', 'KASIYER']
  }

  return null
}

/**
 * Kullanıcının belirli bir sayfaya erişim yetkisi var mı kontrol eder
 */
export function hasAccess(userRole: UserRole | undefined, pathname: string): boolean {
  if (!userRole) {
    return false
  }

  const allowedRoles = getAllowedRoles(pathname)
  if (!allowedRoles) {
    return true // Public route veya tanımlı değilse erişime izin ver
  }

  return allowedRoles.includes(userRole)
}

/**
 * Kullanıcının ana sayfasını döndürür
 */
export function getUserHomePage(role: UserRole | undefined): string {
  switch (role) {
    case 'SUPERVIZOR':
      return '/panel/supervizor'
    case 'MANAGER':
      return '/panel/yonetici'
    case 'STAFF':
      return '/panel/kurye'
    case 'DEVELOPER':
      return '/panel/yazilimci'
    case 'KASIYER':
      return '/panel/kasiyer'
    default:
      return '/panel/satinalma'
  }
}
