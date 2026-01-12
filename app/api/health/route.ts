import { NextResponse } from 'next/server'
import { Client } from 'pg'

/**
 * Health check endpoint
 * GET /api/health
 */
export async function GET() {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: 'unknown',
      memory: {
        used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
        unit: 'MB'
      }
    }
  }

  // Database health check
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
  })

  try {
    await client.connect()
    await client.query('SELECT 1')
    await client.end()
    healthCheck.checks.database = 'connected'
  } catch (error: any) {
    healthCheck.checks.database = 'disconnected'
    healthCheck.status = 'degraded'
    return NextResponse.json(healthCheck, { status: 503 })
  }

  return NextResponse.json(healthCheck, { status: 200 })
}
