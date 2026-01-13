import { PrismaClient, UserRole } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { config } from 'dotenv'
import { resolve } from 'path'
import bcrypt from 'bcryptjs'

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') })

// DATABASE_URL'i environment'tan al veya default kullan ve process.env'e set et
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://ebubekir:X4JABupdrdHi4T4wogc0kRnPHW8hhKr@172.18.0.2:5432/mesaidefteri?schema=public'
}

// PostgreSQL adapter için connection pool oluştur
const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

// PrismaClient oluştur - Prisma 7.2.0 için adapter gereklidir
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Starting database seeding...')

  // Veritabanında hiç kullanıcı var mı kontrol et
  const userCount = await prisma.user.count()
  
  // Eğer hiç kullanıcı yoksa, initial supervizor oluştur
  const users = [
    {
      username: 'ebubekirozgur',
      password: '12345', // Hash'lenecek
      fullName: 'Ebubekir ÖZGÜR',
      role: UserRole.SUPERVIZOR,
    },
    {
      username: 'islimkilic',
      password: '12345', // Hash'lenecek
      fullName: 'İslim KILIÇ',
      role: UserRole.MANAGER,
    },
    {
      username: 'muslumdildas',
      password: '12345', // Hash'lenecek
      fullName: 'Müslüm DİLDAŞ',
      role: UserRole.STAFF,
    },
  ]

  if (userCount === 0) {
    console.log('⚠️  Veritabanında hiç kullanıcı yok. İlk supervizör kullanıcı oluşturuluyor...')
  }

  // Kullanıcıları oluştur/güncelle
  for (const userData of users) {
    const existingUser = await prisma.user.findUnique({
      where: { username: userData.username },
    })

    if (existingUser) {
      // Mevcut kullanıcının şifresini güncelle (hash'lenmiş olmayabilir veya güncellenmek isteniyor)
      const hashedPassword = await bcrypt.hash(userData.password, 10)
      
      // Şifre değişmiş mi kontrol et (hash ile başlamıyorsa güncelle)
      if (!existingUser.password.startsWith('$2')) {
        await prisma.user.update({
          where: { username: userData.username },
          data: { password: hashedPassword }
        })
        console.log(`✅ Updated user password: ${userData.username}`)
      } else {
        console.log(`ℹ️  User already exists with hashed password: ${userData.username}`)
      }
      continue
    }

    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(userData.password, 10)

    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword
      },
    })

    console.log(`✅ Created user: ${user.fullName} (${user.username}) - ${user.role}`)
  }

  // Final kontrol - En az bir supervizor var mı?
  const supervizorCount = await prisma.user.count({
    where: { role: UserRole.SUPERVIZOR }
  })

  if (supervizorCount === 0) {
    console.log('⚠️  UYARI: Veritabanında hiç supervizor kullanıcı yok!')
    console.log('   İlk giriş için en az bir supervizor kullanıcı oluşturun.')
  }

  console.log('✅ Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
