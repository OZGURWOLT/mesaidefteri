/**
 * PostgreSQL Connection Pool
 * Production-ready connection pooling for optimal performance
 */

import { Pool, PoolConfig } from 'pg'

// Connection pool configuration
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public',
  max: 20, // Maximum number of clients in the pool
  min: 5, // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  allowExitOnIdle: true, // Allow process to exit if pool is idle
}

// Create singleton pool instance
let pool: Pool | null = null

/**
 * Get or create database connection pool
 * @returns PostgreSQL Pool instance
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(poolConfig)
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err)
    })

    // Log pool events in development
    if (process.env.NODE_ENV === 'development') {
      pool.on('connect', () => {
        console.log('[DB Pool] New client connected')
      })
      pool.on('acquire', () => {
        console.log('[DB Pool] Client acquired from pool')
      })
      pool.on('remove', () => {
        console.log('[DB Pool] Client removed from pool')
      })
    }
  }
  return pool
}

/**
 * Execute a query using the connection pool
 * @param text SQL query text
 * @param params Query parameters
 * @returns Query result
 */
export async function query(text: string, params?: any[]) {
  const pool = getPool()
  const start = Date.now()
  
  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    
    // Log slow queries in development
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`[DB Pool] Slow query (${duration}ms):`, text.substring(0, 100))
    }
    
    return result
  } catch (error) {
    console.error('[DB Pool] Query error:', error)
    throw error
  }
}

/**
 * Get a client from the pool for transactions
 * @returns Pool client
 */
export async function getClient() {
  return await getPool().connect()
}

/**
 * Close all connections in the pool
 * Use this only when shutting down the application
 */
export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await closePool()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    await closePool()
    process.exit(0)
  })
}
