const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const users = [
    { username: 'ebubekirozgur', password: '12345', fullName: 'Ebubekir ÖZGÜR', role: 'SUPERVIZOR' },
    { username: 'islimkilic', password: '12345', fullName: 'İslim KILIÇ', role: 'MANAGER' },
    { username: 'muslumdildas', password: '12345', fullName: 'Müslüm DİLDAŞ', role: 'STAFF' },
  ];

  for (const userData of users) {
    const existingUser = await prisma.user.findUnique({
      where: { username: userData.username },
    });

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    if (existingUser) {
      await prisma.user.update({
        where: { username: userData.username },
        data: { password: hashedPassword }
      });
      console.log(`✅ Updated: ${userData.username}`);
    } else {
      await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword
        }
      });
      console.log(`✅ Created: ${userData.username}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
