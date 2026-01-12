/**
 * Optimization Utilities
 * Common functions for performance optimization
 */

/**
 * Debounce function for API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function for API calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Cache with TTL (Time To Live)
 */
export class TTLCache<K, V> {
  private cache = new Map<K, { value: V; expires: number }>()
  
  constructor(private ttl: number = 60000) {} // Default 1 minute
  
  set(key: K, value: V, customTTL?: number): void {
    const expires = Date.now() + (customTTL || this.ttl)
    this.cache.set(key, { value, expires })
  }
  
  get(key: K): V | undefined {
    const item = this.cache.get(key)
    if (!item) return undefined
    
    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return undefined
    }
    
    return item.value
  }
  
  clear(): void {
    this.cache.clear()
  }
  
  delete(key: K): boolean {
    return this.cache.delete(key)
  }
}

/**
 * Pagination helper
 */
export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export function getPaginationParams(searchParams: URLSearchParams): {
  page: number
  limit: number
  offset: number
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit
  
  return { page, limit, offset }
}

/**
 * Response caching headers
 */
export function getCacheHeaders(maxAge: number = 60): HeadersInit {
  return {
    'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
  }
}

/**
 * No-cache headers
 */
export function getNoCacheHeaders(): HeadersInit {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  }
}
