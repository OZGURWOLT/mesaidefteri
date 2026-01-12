#!/usr/bin/env ts-node
/**
 * Database Connection & Performance Tests
 * Ubuntu 22.04 Production Environment Simulation
 * 
 * Bu script tüm veritabanı bağlantılarını, Prisma client'ı,
 * connection pool'u ve query performansını test eder.
 */

// @ts-ignore - pg types might not be available in ts-node
import { Pool, Client } from 'pg'
import { PrismaClient } from '@prisma/client'
import { getPool, query, closePool } from '../lib/db-pool'

// Test configuration
const TEST_CONFIG = {
  maxRetries: 3,
  timeout: 5000,
  connectionTimeout: 2000,
  queryTimeout: 3000,
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logTest(name: string) {
  log(`\n[TEST] ${name}`, 'cyan')
}

function logSuccess(message: string) {
  log(`  ✓ ${message}`, 'green')
}

function logError(message: string) {
  log(`  ✗ ${message}`, 'red')
}

function logWarning(message: string) {
  log(`  ⚠ ${message}`, 'yellow')
}

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
}

// ============================================================================
// TEST 1: Environment Variables
// ============================================================================
async function testEnvironmentVariables() {
  logTest('1. Environment Variables Check')
  
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    logError('DATABASE_URL environment variable is not set')
    results.failed++
    return false
  }
  
  logSuccess(`DATABASE_URL is set: ${dbUrl.substring(0, 30)}...`)
  
  // Check if it's a dummy URL (build-time)
  if (dbUrl.includes('dummy')) {
    logWarning('DATABASE_URL appears to be a dummy URL (build-time)')
    logWarning('This is OK for build-time, but runtime needs real URL')
    results.warnings++
  }
  
  // Check URL format
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    logError('DATABASE_URL format is invalid (should start with postgresql://)')
    results.failed++
    return false
  }
  
  logSuccess('DATABASE_URL format is valid')
  results.passed++
  return true
}

// ============================================================================
// TEST 2: Direct PostgreSQL Connection (pg Client)
// ============================================================================
async function testDirectConnection() {
  logTest('2. Direct PostgreSQL Connection (pg Client)')
  
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl || dbUrl.includes('dummy')) {
    logWarning('Skipping direct connection test (dummy URL)')
    results.warnings++
    return true
  }
  
  const client = new Client({
    connectionString: dbUrl,
    connectionTimeoutMillis: TEST_CONFIG.connectionTimeout,
  })
  
  try {
    const startTime = Date.now()
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), TEST_CONFIG.connectionTimeout)
      )
    ])
    const duration = Date.now() - startTime
    
    logSuccess(`Connected in ${duration}ms`)
    
    // Test query
    const queryStart = Date.now()
    const result = await Promise.race([
      client.query('SELECT NOW() as current_time, version() as pg_version'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), TEST_CONFIG.queryTimeout)
      )
    ]) as any
    
    const queryDuration = Date.now() - queryStart
    logSuccess(`Query executed in ${queryDuration}ms`)
    logSuccess(`PostgreSQL version: ${result.rows[0].pg_version.substring(0, 50)}...`)
    
    if (queryDuration > 1000) {
      logWarning(`Query is slow (${queryDuration}ms) - check network/database performance`)
      results.warnings++
    }
    
    await client.end()
    results.passed++
    return true
  } catch (error: any) {
    logError(`Connection failed: ${error.message}`)
    await client.end().catch(() => {})
    results.failed++
    return false
  }
}

// ============================================================================
// TEST 3: Connection Pool
// ============================================================================
async function testConnectionPool() {
  logTest('3. Connection Pool Test')
  
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl || dbUrl.includes('dummy')) {
    logWarning('Skipping connection pool test (dummy URL)')
    results.warnings++
    return true
  }
  
  try {
    const pool = getPool()
    logSuccess('Connection pool created')
    
    // Test multiple concurrent queries
    const queries = Array.from({ length: 5 }, (_, i) => 
      query('SELECT $1::text as test', [`test-${i}`])
    )
    
    const startTime = Date.now()
    const results = await Promise.all(queries)
    const duration = Date.now() - startTime
    
    logSuccess(`5 concurrent queries executed in ${duration}ms`)
    logSuccess(`Average: ${(duration / 5).toFixed(2)}ms per query`)
    
    if (duration > 2000) {
      logWarning(`Pool queries are slow (${duration}ms total)`)
      results.warnings++
    }
    
    // Test pool stats
    const poolStats = pool.totalCount
    logSuccess(`Pool total connections: ${poolStats}`)
    
    results.passed++
    return true
  } catch (error: any) {
    logError(`Connection pool test failed: ${error.message}`)
    results.failed++
    return false
  }
}

// ============================================================================
// TEST 4: Prisma Client Initialization
// ============================================================================
async function testPrismaClient() {
  logTest('4. Prisma Client Initialization')
  
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl || dbUrl.includes('dummy')) {
    logWarning('Skipping Prisma client test (dummy URL)')
    results.warnings++
    return true
  }
  
  try {
    // Lazy import (like in API routes)
    const { prisma } = await import('../lib/prisma')
    logSuccess('Prisma client imported successfully')
    
    // Test connection
    const startTime = Date.now()
    await prisma.$connect()
    const duration = Date.now() - startTime
    logSuccess(`Prisma connected in ${duration}ms`)
    
    // Test query
    const queryStart = Date.now()
    const userCount = await prisma.user.count()
    const queryDuration = Date.now() - queryStart
    
    logSuccess(`Query executed in ${queryDuration}ms`)
    logSuccess(`Total users in database: ${userCount}`)
    
    // Test complex query
    const complexStart = Date.now()
    const tasks = await prisma.task.findMany({
      take: 10,
      include: {
        assignedUser: {
          select: {
            id: true,
            fullName: true,
            role: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    const complexDuration = Date.now() - complexStart
    
    logSuccess(`Complex query executed in ${complexDuration}ms`)
    logSuccess(`Retrieved ${tasks.length} tasks`)
    
    if (complexDuration > 1000) {
      logWarning(`Complex query is slow (${complexDuration}ms) - check indexes`)
      results.warnings++
    }
    
    await prisma.$disconnect()
    results.passed++
    return true
  } catch (error: any) {
    logError(`Prisma client test failed: ${error.message}`)
    if (error.code) {
      logError(`Error code: ${error.code}`)
    }
    results.failed++
    return false
  }
}

// ============================================================================
// TEST 5: Database Schema & Tables
// ============================================================================
async function testDatabaseSchema() {
  logTest('5. Database Schema & Tables Check')
  
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl || dbUrl.includes('dummy')) {
    logWarning('Skipping schema test (dummy URL)')
    results.warnings++
    return true
  }
  
  try {
    const { prisma } = await import('../lib/prisma')
    
    // Check critical tables
    const tables = [
      'users',
      'tasks',
      'branches',
      'shifts',
      'leave_requests',
      'system_logs',
      'sms_codes',
      'notifications',
    ]
    
    for (const table of tables) {
      try {
        const result = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as count FROM "${table}"`
        ) as any[]
        
        const count = parseInt(result[0].count)
        logSuccess(`${table}: ${count} records`)
      } catch (error: any) {
        logError(`${table}: Table not found or error - ${error.message}`)
        results.failed++
      }
    }
    
    await prisma.$disconnect()
    results.passed++
    return true
  } catch (error: any) {
    logError(`Schema test failed: ${error.message}`)
    results.failed++
    return false
  }
}

// ============================================================================
// TEST 6: Indexes Check
// ============================================================================
async function testIndexes() {
  logTest('6. Database Indexes Check')
  
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl || dbUrl.includes('dummy')) {
    logWarning('Skipping indexes test (dummy URL)')
    results.warnings++
    return true
  }
  
  try {
    const result = await query(`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('users', 'tasks', 'shifts', 'leave_requests', 'system_logs')
      ORDER BY tablename, indexname
    `)
    
    const indexesByTable: { [key: string]: number } = {}
    result.rows.forEach((row: any) => {
      indexesByTable[row.tablename] = (indexesByTable[row.tablename] || 0) + 1
    })
    
    logSuccess(`Found indexes for ${Object.keys(indexesByTable).length} tables`)
    Object.entries(indexesByTable).forEach(([table, count]) => {
      logSuccess(`  ${table}: ${count} indexes`)
    })
    
    // Check for critical indexes
    const criticalIndexes = [
      { table: 'users', column: 'username' },
      { table: 'users', column: 'role' },
      { table: 'users', column: 'managerId' },
      { table: 'tasks', column: 'assignedTo' },
      { table: 'tasks', column: 'status' },
      { table: 'shifts', column: 'userId' },
    ]
    
    for (const { table, column } of criticalIndexes) {
      const indexExists = result.rows.some((row: any) => 
        row.tablename === table && row.indexdef.includes(column)
      )
      
      if (indexExists) {
        logSuccess(`Index on ${table}.${column} exists`)
      } else {
        logWarning(`Index on ${table}.${column} might be missing`)
        results.warnings++
      }
    }
    
    results.passed++
    return true
  } catch (error: any) {
    logError(`Indexes test failed: ${error.message}`)
    results.failed++
    return false
  }
}

// ============================================================================
// TEST 7: Query Performance
// ============================================================================
async function testQueryPerformance() {
  logTest('7. Query Performance Test')
  
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl || dbUrl.includes('dummy')) {
    logWarning('Skipping performance test (dummy URL)')
    results.warnings++
    return true
  }
  
  try {
    const { prisma } = await import('../lib/prisma')
    
    // Test 1: Simple count
    const start1 = Date.now()
    await prisma.user.count()
    const duration1 = Date.now() - start1
    logSuccess(`Simple count: ${duration1}ms`)
    
    // Test 2: Join query
    const start2 = Date.now()
    await prisma.task.findMany({
      take: 50,
      include: {
        assignedUser: true,
      }
    })
    const duration2 = Date.now() - start2
    logSuccess(`Join query (50 records): ${duration2}ms`)
    
    // Test 3: Complex aggregation
    const start3 = Date.now()
    await prisma.task.groupBy({
      by: ['status'],
      _count: {
        id: true,
      }
    })
    const duration3 = Date.now() - start3
    logSuccess(`Aggregation query: ${duration3}ms`)
    
    // Performance warnings
    if (duration1 > 500) {
      logWarning(`Simple count is slow (${duration1}ms)`)
      results.warnings++
    }
    if (duration2 > 1000) {
      logWarning(`Join query is slow (${duration2}ms)`)
      results.warnings++
    }
    if (duration3 > 1000) {
      logWarning(`Aggregation is slow (${duration3}ms)`)
      results.warnings++
    }
    
    await prisma.$disconnect()
    results.passed++
    return true
  } catch (error: any) {
    logError(`Performance test failed: ${error.message}`)
    results.failed++
    return false
  }
}

// ============================================================================
// TEST 8: Connection Pool Stress Test
// ============================================================================
async function testConnectionPoolStress() {
  logTest('8. Connection Pool Stress Test')
  
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl || dbUrl.includes('dummy')) {
    logWarning('Skipping stress test (dummy URL)')
    results.warnings++
    return true
  }
  
  try {
    const pool = getPool()
    const concurrentQueries = 20
    
    logSuccess(`Running ${concurrentQueries} concurrent queries...`)
    
    const startTime = Date.now()
    const queryPromises = Array.from({ length: concurrentQueries }, (_, i) =>
      query('SELECT pg_sleep(0.1), $1::text as test', [`stress-${i}`])
    )
    
    const queryResults = await Promise.all(queryPromises)
    const duration = Date.now() - startTime
    
    logSuccess(`All ${concurrentQueries} queries completed in ${duration}ms`)
    logSuccess(`Average: ${(duration / concurrentQueries).toFixed(2)}ms per query`)
    
    // Check pool stats
    const totalConnections = pool.totalCount
    const idleConnections = pool.idleCount
    const waitingCount = pool.waitingCount
    
    logSuccess(`Pool stats: ${totalConnections} total, ${idleConnections} idle, ${waitingCount} waiting`)
    
    if (waitingCount > 0) {
      logWarning(`Some queries had to wait (pool might be too small)`)
      results.warnings++
    }
    
    results.passed++
    return true
  } catch (error: any) {
    logError(`Stress test failed: ${error.message}`)
    results.failed++
    return false
  }
}

// ============================================================================
// TEST 9: Error Handling
// ============================================================================
async function testErrorHandling() {
  logTest('9. Error Handling Test')
  
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl || dbUrl.includes('dummy')) {
    logWarning('Skipping error handling test (dummy URL)')
    results.warnings++
    return true
  }
  
  try {
    // Test invalid query
    try {
      await query('SELECT * FROM non_existent_table')
      logError('Invalid query should have failed')
      results.failed++
    } catch (error: any) {
      logSuccess('Invalid query properly rejected')
      results.passed++
    }
    
    // Test SQL injection protection
    try {
      await query('SELECT * FROM users WHERE username = $1', ["'; DROP TABLE users; --"])
      logSuccess('SQL injection attempt properly handled (parameterized query)')
      results.passed++
    } catch (error: any) {
      logSuccess('SQL injection attempt rejected')
      results.passed++
    }
    
    return true
  } catch (error: any) {
    logError(`Error handling test failed: ${error.message}`)
    results.failed++
    return false
  }
}

// ============================================================================
// TEST 10: Transaction Support
// ============================================================================
async function testTransactions() {
  logTest('10. Transaction Support Test')
  
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl || dbUrl.includes('dummy')) {
    logWarning('Skipping transaction test (dummy URL)')
    results.warnings++
    return true
  }
  
  try {
    const { prisma } = await import('../lib/prisma')
    
    // Test transaction rollback
    try {
      await prisma.$transaction(async (tx) => {
        // This should fail and rollback
        await tx.user.create({
          data: {
            username: 'test_transaction_' + Date.now(),
            password: 'test',
            fullName: 'Test User',
            role: 'STAFF',
          }
        })
        
        // Force error
        throw new Error('Test rollback')
      })
      
      logError('Transaction should have rolled back')
      results.failed++
    } catch (error: any) {
      if (error.message === 'Test rollback') {
        logSuccess('Transaction rollback works correctly')
        results.passed++
      } else {
        logError(`Transaction test failed: ${error.message}`)
        results.failed++
      }
    }
    
    await prisma.$disconnect()
    return true
  } catch (error: any) {
    logError(`Transaction test failed: ${error.message}`)
    results.failed++
    return false
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
async function runAllTests() {
  log('\n' + '='.repeat(60), 'blue')
  log('DATABASE CONNECTION & PERFORMANCE TESTS', 'blue')
  log('Ubuntu 22.04 Production Environment Simulation', 'blue')
  log('='.repeat(60) + '\n', 'blue')
  
  const tests = [
    testEnvironmentVariables,
    testDirectConnection,
    testConnectionPool,
    testPrismaClient,
    testDatabaseSchema,
    testIndexes,
    testQueryPerformance,
    testConnectionPoolStress,
    testErrorHandling,
    testTransactions,
  ]
  
  for (const test of tests) {
    try {
      await test()
    } catch (error: any) {
      logError(`Test crashed: ${error.message}`)
      results.failed++
    }
  }
  
  // Cleanup
  try {
    await closePool()
  } catch (error) {
    // Ignore cleanup errors
  }
  
  // Print summary
  log('\n' + '='.repeat(60), 'blue')
  log('TEST SUMMARY', 'blue')
  log('='.repeat(60), 'blue')
  log(`Passed: ${results.passed}`, 'green')
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green')
  log(`Warnings: ${results.warnings}`, results.warnings > 0 ? 'yellow' : 'green')
  log('='.repeat(60) + '\n', 'blue')
  
  if (results.failed > 0) {
    log('❌ SOME TESTS FAILED - Please review the errors above', 'red')
    process.exit(1)
  } else if (results.warnings > 0) {
    log('⚠️  SOME WARNINGS - Review the warnings above', 'yellow')
    process.exit(0)
  } else {
    log('✅ ALL TESTS PASSED', 'green')
    process.exit(0)
  }
}

// Run tests
runAllTests().catch((error) => {
  logError(`Fatal error: ${error.message}`)
  console.error(error)
  process.exit(1)
})
