/**
 * Prisma Configuration
 * 
 * Prisma 7.2.0 Configuration File
 * 
 * In Prisma 7.2.0, the datasource URL must be defined in prisma.config.ts
 * instead of schema.prisma. This is the new standard configuration approach.
 * 
 * Make sure .env file contains:
 * DATABASE_URL="postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public"
 */

import { defineConfig } from '@prisma/config'
import { config as loadDotenv } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env file
loadDotenv({ path: resolve(process.cwd(), '.env') })

// Default connection string (fallback)
const DEFAULT_DATABASE_URL = 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'

// Get DATABASE_URL from environment or use default
const databaseUrl: string = typeof process.env.DATABASE_URL === 'string' 
  ? process.env.DATABASE_URL 
  : DEFAULT_DATABASE_URL

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL not found in environment variables.')
  console.warn(`   Using default: ${DEFAULT_DATABASE_URL}`)
}

// Prisma 7.2.0 configuration format
export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
})
