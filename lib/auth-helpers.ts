import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'

/**
 * Server-side'da mevcut kullanıcıyı getirir
 */
export async function getCurrentUser() {
  const session = await auth()
  
  if (!session?.user) {
    return null
  }

  return session.user
}

/**
 * Server-side'da mevcut kullanıcıyı getirir
 * API route'larda kullanım için - error throw eder (redirect yerine)
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Yetkisiz erişim. Lütfen giriş yapın.')
  }

  return user
}

/**
 * Belirli bir rol için yetki kontrolü yapar
 * API route'larda kullanılmak üzere error throw eder (redirect yerine)
 */
export async function requireRole(requiredRoles: UserRole[]) {
  const user = await requireAuth()
  
  if (!requiredRoles.includes(user.role)) {
    throw new Error(`Yetkisiz erişim. Sadece ${requiredRoles.join(' veya ')} rolü işlem yapabilir.`)
  }
  
  return user
}

/**
 * Manager veya Supervisor yetkisi kontrolü
 * API route'larda kullanım için - error throw eder
 */
export async function requireManagerOrSupervisor() {
  return await requireRole(['MANAGER', 'SUPERVIZOR'])
}

/**
 * Supervisor yetkisi kontrolü
 * API route'larda kullanım için - error throw eder
 */
export async function requireSupervisor() {
  return await requireRole(['SUPERVIZOR'])
}
