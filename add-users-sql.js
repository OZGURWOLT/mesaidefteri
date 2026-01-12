const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

// DATABASE_URL'i set et
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function main() {
  console.log('🔐 Kullanıcılar ekleniyor...\n')

  const users = [
    {
      username: 'ebubekirozgur',
      password: '12345',
      fullName: 'Ebubekir ÖZGÜR',
      role: 'SUPERVIZOR',
    },
    {
      username: 'islimkilic',
      password: '12345',
      fullName: 'İslim KILIÇ',
      role: 'MANAGER',
    },
    {
      username: 'muslumdildas',
      password: '12345',
      fullName: 'Müslüm DİLDAŞ',
      role: 'STAFF',
    },
  ]

  for (const userData of users) {
    try {
      // Şifreyi hash'le
      const hashedPassword = await bcrypt.hash(userData.password, 10)

      // Önce kullanıcı var mı kontrol et
      const existingUser = await prisma.user.findUnique({
        where: { username: userData.username },
      })

      if (existingUser) {
        // Var olan kullanıcıyı güncelle
        await prisma.user.update({
          where: { username: userData.username },
          data: {
            password: hashedPassword,
            fullName: userData.fullName,
            role: userData.role,
          },
        })
        console.log(`✅ Güncellendi: ${userData.fullName} (${userData.username}) - ${userData.role}`)
      } else {
        // Yeni kullanıcı oluştur
        const user = await prisma.user.create({
          data: {
            username: userData.username,
            password: hashedPassword,
            fullName: userData.fullName,
            role: userData.role,
          },
        })
        console.log(`✅ Oluşturuldu: ${user.fullName} (${user.username}) - ${user.role}`)
        console.log(`   ID: ${user.id}`)
        console.log(`   Oluşturulma: ${user.createdAt}`)
      }
    } catch (error) {
      console.error(`❌ Hata (${userData.username}):`, error.message)
    }
  }

  console.log('\n✅ İşlem tamamlandı!')
}

main()
  .catch((e) => {
    console.error('❌ Kritik hata:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
