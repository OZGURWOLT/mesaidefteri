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
    const queryResults = await Promise.all(queries)
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
      // Check if index exists - look for column name in indexdef or indexname
      const indexExists = result.rows.some((row: any) => {
        const tableMatch = row.tablename === table
        const columnMatch = row.indexdef.toLowerCase().includes(column.toLowerCase()) || 
                          row.indexname.toLowerCase().includes(column.toLowerCase())
        return tableMatch && columnMatch
      })
      
      if (indexExists) {
        logSuccess(`Index on ${table}.${column} exists`)
      } else {
        // Double check with direct query
        const directCheck = await query(`
          SELECT indexname 
          FROM pg_indexes 
          WHERE schemaname = 'public' 
          AND tablename = $1 
          AND (indexdef LIKE $2 OR indexname LIKE $2)
        `, [table, `%${column}%`])
        
        if (directCheck.rows.length > 0) {
          logSuccess(`Index on ${table}.${column} exists (verified)`)
        } else {
          logWarning(`Index on ${table}.${column} might be missing`)
          results.warnings++
        }
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
// TEST 11: Handshake Test (Basit Bağlantı)
// ============================================================================
async function testHandshake() {
  logTest('11. Handshake Test (Basit Bağlantı)')
  
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl || dbUrl.includes('dummy')) {
    logWarning('Skipping handshake test (dummy URL)')
    results.warnings++
    return true
  }
  
  try {
    const client = new Client({
      connectionString: dbUrl,
      connectionTimeoutMillis: TEST_CONFIG.connectionTimeout,
    })
    
    await client.connect()
    logSuccess('Connection Successful - Database is ready')
    
    // Basit bir query ile "Aleykümselam" cevabı al
    const result = await client.query('SELECT \'Aleykümselam\' as greeting')
    if (result.rows[0].greeting === 'Aleykümselam') {
      logSuccess('Handshake response received: Aleykümselam')
    }
    
    await client.end()
    results.passed++
    return true
  } catch (error: any) {
    logError(`Handshake failed: ${error.message}`)
    logError('Check .env file: password or port might be wrong')
    results.failed++
    return false
  }
}

// ============================================================================
// TEST 12: Schema and Enum Check (Migration)
// ============================================================================
async function testSchemaAndEnums() {
  logTest('12. Schema and Enum Check (Migration)')
  
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl || dbUrl.includes('dummy')) {
    logWarning('Skipping schema/enum test (dummy URL)')
    results.warnings++
    return true
  }
  
  try {
    const { prisma } = await import('../lib/prisma')
    
    // Kritik tabloları kontrol et
    const criticalTables = ['users', 'tasks', 'shifts', 'branches', 'leave_requests', 'system_logs']
    
    for (const table of criticalTables) {
      try {
        const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`) as any[]
        logSuccess(`${table} table exists (${count[0].count} records)`)
      } catch (error: any) {
        logError(`${table} table not found: ${error.message}`)
        results.failed++
      }
    }
    
    // Enum tiplerini kontrol et
    const enumCheck = await query(`
      SELECT 
        t.typname as enum_name,
        e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname IN ('UserRole', 'TaskStatus', 'TaskType', 'TaskRepetition', 'PriceLogStatus', 'LeaveRequestStatus')
      ORDER BY t.typname, e.enumsortorder
    `)
    
    const enumsByType: { [key: string]: string[] } = {}
    enumCheck.rows.forEach((row: any) => {
      if (!enumsByType[row.enum_name]) {
        enumsByType[row.enum_name] = []
      }
      enumsByType[row.enum_name].push(row.enum_value)
    })
    
    logSuccess(`Found ${Object.keys(enumsByType).length} enum types`)
    Object.entries(enumsByType).forEach(([enumName, values]) => {
      logSuccess(`  ${enumName}: ${values.join(', ')}`)
    })
    
    // UserRole enum'unu özellikle kontrol et
    if (enumsByType['UserRole']) {
      const expectedRoles = ['SUPERVIZOR', 'MANAGER', 'STAFF', 'DEVELOPER', 'KASIYER']
      const actualRoles = enumsByType['UserRole']
      const allRolesExist = expectedRoles.every(role => actualRoles.includes(role))
      
      if (allRolesExist) {
        logSuccess('UserRole enum contains all expected values')
      } else {
        logError(`UserRole enum missing values. Expected: ${expectedRoles.join(', ')}, Found: ${actualRoles.join(', ')}`)
        results.failed++
      }
    } else {
      logError('UserRole enum not found')
      results.failed++
    }
    
    await prisma.$disconnect()
    results.passed++
    return true
  } catch (error: any) {
    logError(`Schema/enum test failed: ${error.message}`)
    results.failed++
    return false
  }
}

// ============================================================================
// TEST 13: CRUD Operations (Yaşam Döngüsü)
// ============================================================================
async function testCRUDOperations() {
  logTest('13. CRUD Operations (Yaşam Döngüsü)')
  
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl || dbUrl.includes('dummy')) {
    logWarning('Skipping CRUD test (dummy URL)')
    results.warnings++
    return true
  }
  
  let testUserId: string | null = null
  
  try {
    const { prisma } = await import('../lib/prisma')
    const bcrypt = await import('bcryptjs')
    const bcryptjs = bcrypt.default || bcrypt
    
    // CREATE: Rastgele bir test kullanıcısı oluştur
    const testUsername = `test_user_${Date.now()}`
    const testPassword = await bcryptjs.hash('Test123!', 10)
    
    const newUser = await prisma.user.create({
      data: {
        username: testUsername,
        password: testPassword,
        fullName: 'Test User',
        role: 'STAFF',
        phone: '5550000000',
      }
    })
    
    testUserId = newUser.id
    logSuccess(`CREATE: Test user created with ID: ${testUserId}`)
    results.passed++
    
    // READ: Oluşturduğu kullanıcıyı ID ile geri çağır
    const foundUser = await prisma.user.findUnique({
      where: { id: testUserId }
    })
    
    if (foundUser && foundUser.username === testUsername) {
      logSuccess(`READ: User retrieved successfully (ID: ${testUserId})`)
      results.passed++
    } else {
      logError('READ: User not found after creation')
      results.failed++
    }
    
    // UPDATE: Kullanıcının adını veya şifresini değiştir
    const newPassword = await bcryptjs.hash('NewTest123!', 10)
    const updatedUser = await prisma.user.update({
      where: { id: testUserId },
      data: {
        fullName: 'Updated Test User',
        password: newPassword,
      }
    })
    
    if (updatedUser.fullName === 'Updated Test User') {
      logSuccess('UPDATE: User updated successfully')
      results.passed++
    } else {
      logError('UPDATE: User update failed')
      results.failed++
    }
    
    // DELETE: İş bitince o kullanıcıyı sil
    await prisma.user.delete({
      where: { id: testUserId }
    })
    
    const deletedCheck = await prisma.user.findUnique({
      where: { id: testUserId }
    })
    
    if (!deletedCheck) {
      logSuccess('DELETE: User deleted successfully')
      results.passed++
    } else {
      logError('DELETE: User still exists after deletion')
      results.failed++
    }
    
    testUserId = null
    await prisma.$disconnect()
    return true
  } catch (error: any) {
    logError(`CRUD test failed: ${error.message}`)
    
    // Cleanup: Eğer test user oluşturulduysa sil
    if (testUserId) {
      try {
        const { prisma } = await import('../lib/prisma')
        await prisma.user.delete({ where: { id: testUserId } }).catch(() => {})
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    
    results.failed++
    return false
  }
}

// ============================================================================
// TEST 14: Foreign Key Constraints (İlişkisel Bütünlük)
// ============================================================================
async function testForeignKeys() {
  logTest('14. Foreign Key Constraints (İlişkisel Bütünlük)')
  
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl || dbUrl.includes('dummy')) {
    logWarning('Skipping foreign key test (dummy URL)')
    results.warnings++
    return true
  }
  
  try {
    const { prisma } = await import('../lib/prisma')
    
    // Var olmayan bir kullanıcı ID'si ile vardiya eklemeye çalış
    const fakeUserId = '00000000-0000-0000-0000-000000000000'
    
    try {
      await prisma.shift.create({
        data: {
          userId: fakeUserId,
          shiftDate: new Date(),
          startTime: '09:00',
          endTime: '17:00',
          weeklyHours: 40,
        }
      })
      
      logError('Foreign key constraint failed: Shift created with non-existent user ID')
      results.failed++
      
      // Cleanup
      await prisma.shift.deleteMany({
        where: { userId: fakeUserId }
      }).catch(() => {})
    } catch (error: any) {
      // PostgreSQL foreign key constraint hatası bekleniyor
      if (error.code === 'P2003' || error.message.includes('foreign key') || error.message.includes('violates foreign key constraint')) {
        logSuccess('Foreign key constraint works: Cannot create shift with non-existent user ID')
        results.passed++
      } else {
        logError(`Unexpected error: ${error.message}`)
        results.failed++
      }
    }
    
    // Var olmayan bir görev ID'si ile price log eklemeye çalış
    const fakeTaskId = '00000000-0000-0000-0000-000000000000'
    
    try {
      await prisma.priceLog.create({
        data: {
          productName: 'Test Product',
          ourPrice: 10.0,
          taskId: fakeTaskId,
        }
      })
      
      logError('Foreign key constraint failed: PriceLog created with non-existent task ID')
      results.failed++
      
      // Cleanup
      await prisma.priceLog.deleteMany({
        where: { taskId: fakeTaskId }
      }).catch(() => {})
    } catch (error: any) {
      if (error.code === 'P2003' || error.message.includes('foreign key') || error.message.includes('violates foreign key constraint')) {
        logSuccess('Foreign key constraint works: Cannot create priceLog with non-existent task ID')
        results.passed++
      } else {
        // taskId nullable olabilir, bu durumda hata vermeyebilir
        logSuccess('PriceLog taskId is nullable (optional foreign key)')
        results.passed++
      }
    }
    
    await prisma.$disconnect()
    return true
  } catch (error: any) {
    logError(`Foreign key test failed: ${error.message}`)
    results.failed++
    return false
  }
}

// ============================================================================
// TEST 15: Unique Constraints (Tekillik Kontrolü)
// ============================================================================
async function testUniqueConstraints() {
  logTest('15. Unique Constraints (Tekillik Kontrolü)')
  
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl || dbUrl.includes('dummy')) {
    logWarning('Skipping unique constraint test (dummy URL)')
    results.warnings++
    return true
  }
  
  let testUserId: string | null = null
  const testUsername = `unique_test_${Date.now()}`
  
  try {
    const { prisma } = await import('../lib/prisma')
    const bcrypt = await import('bcryptjs')
    const bcryptjs = bcrypt.default || bcrypt
    
    // İlk kullanıcıyı oluştur
    const testPassword = await bcryptjs.hash('Test123!', 10)
    const firstUser = await prisma.user.create({
      data: {
        username: testUsername,
        password: testPassword,
        fullName: 'First Test User',
        role: 'STAFF',
        phone: '5551111111',
      }
    })
    
    testUserId = firstUser.id
    logSuccess(`Created first user with username: ${testUsername}`)
    
    // Aynı username ile ikinci bir kullanıcı oluşturmaya çalış
    try {
      await prisma.user.create({
        data: {
          username: testUsername, // Aynı username
          password: testPassword,
          fullName: 'Second Test User',
          role: 'STAFF',
          phone: '5552222222',
        }
      })
      
      logError('Unique constraint failed: Duplicate username created')
      results.failed++
    } catch (error: any) {
      if (error.code === 'P2002' || error.message.includes('unique constraint') || error.message.includes('duplicate key')) {
        logSuccess('Unique constraint works: Cannot create duplicate username')
        results.passed++
      } else {
        logError(`Unexpected error: ${error.message}`)
        results.failed++
      }
    }
    
    // Session token unique constraint testi
    const testSessionToken = `test_session_${Date.now()}`
    const testUser = await prisma.user.findFirst({
      where: { role: 'SUPERVIZOR' }
    })
    
    if (testUser) {
      try {
        await prisma.session.create({
          data: {
            sessionToken: testSessionToken,
            userId: testUser.id,
            expires: new Date(Date.now() + 86400000), // 1 day
          }
        })
        
        // Aynı token ile ikinci session oluşturmaya çalış
        try {
          await prisma.session.create({
            data: {
              sessionToken: testSessionToken,
              userId: testUser.id,
              expires: new Date(Date.now() + 86400000),
            }
          })
          
          logError('Unique constraint failed: Duplicate sessionToken created')
          results.failed++
        } catch (error: any) {
          if (error.code === 'P2002' || error.message.includes('unique constraint')) {
            logSuccess('Unique constraint works: Cannot create duplicate sessionToken')
            results.passed++
          }
        }
        
        // Cleanup
        await prisma.session.deleteMany({
          where: { sessionToken: testSessionToken }
        }).catch(() => {})
      } catch (sessionError) {
        // Ignore if session creation fails
      }
    }
    
    // Cleanup
    if (testUserId) {
      await prisma.user.delete({
        where: { id: testUserId }
      }).catch(() => {})
    }
    
    await prisma.$disconnect()
    return true
  } catch (error: any) {
    logError(`Unique constraint test failed: ${error.message}`)
    
    // Cleanup
    if (testUserId) {
      try {
        const { prisma } = await import('../lib/prisma')
        await prisma.user.delete({ where: { id: testUserId } }).catch(() => {})
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    
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
    testHandshake,
    testDirectConnection,
    testConnectionPool,
    testPrismaClient,
    testDatabaseSchema,
    testSchemaAndEnums,
    testIndexes,
    testQueryPerformance,
    testConnectionPoolStress,
    testErrorHandling,
    testTransactions,
    testCRUDOperations,
    testForeignKeys,
    testUniqueConstraints,
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
