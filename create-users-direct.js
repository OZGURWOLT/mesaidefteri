require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public';

const client = new Client({
  connectionString: DATABASE_URL
});

async function main() {
  await client.connect();
  console.log('✅ Veritabanına bağlandı');

  const users = [
    { username: 'ebubekirozgur', password: '12345', fullName: 'Ebubekir ÖZGÜR', role: 'SUPERVIZOR' },
    { username: 'islimkilic', password: '12345', fullName: 'İslim KILIÇ', role: 'MANAGER' },
    { username: 'muslumdildas', password: '12345', fullName: 'Müslüm DİLDAŞ', role: 'STAFF' },
  ];

  for (const userData of users) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    try {
      const result = await client.query(
        `INSERT INTO users (id, username, password, role, "fullName", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (username) 
         DO UPDATE SET 
           password = EXCLUDED.password,
           "updatedAt" = NOW()
         RETURNING username, role, "fullName"`,
        [userData.username, hashedPassword, userData.role, userData.fullName]
      );
      console.log(`✅ ${result.rows[0].fullName} (${result.rows[0].username}) - ${result.rows[0].role}`);
    } catch (err) {
      console.error(`❌ Hata (${userData.username}):`, err.message);
    }
  }

  await client.end();
  console.log('✅ Tamamlandı');
}

main().catch(console.error);
