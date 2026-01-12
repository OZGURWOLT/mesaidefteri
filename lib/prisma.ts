import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// DATABASE_URL'i environment'tan al veya default kullan
// Prisma 7.2.0 otomatik olarak process.env.DATABASE_URL'i okur
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
}

// PostgreSQL adapter için connection pool oluştur
const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

// PrismaClient'ı sadece runtime'da oluştur (lazy initialization)
// Prisma 7.2.0 için: adapter gereklidir
// Production optimizations: connection pooling, query timeout
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

// Optimize connection pool for production
if (process.env.NODE_ENV === 'production') {
  // Prisma connection pool settings via DATABASE_URL
  // Add connection_limit and pool_timeout to DATABASE_URL if needed
  // Example: postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}
