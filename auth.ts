import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { UserRole } from '@prisma/client'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: 'Kullanıcı Adı', type: 'text' },
        password: { label: 'Şifre', type: 'password' }
      },
      async authorize(credentials) {
        const { Client } = await import('pg')
        const bcrypt = await import('bcryptjs')
        const bcryptjs = bcrypt.default || bcrypt

        try {
          if (!credentials?.username || !credentials?.password) {
            console.log('[AUTH] Missing credentials')
            return null
          }

          // Kullanıcı adını normalize et (küçük harfe çevir ve trim et)
          const normalizedUsername = (credentials.username as string).toLowerCase().trim()
          console.log(`[AUTH] Attempting login for: ${normalizedUsername}`)

          // Direkt PostgreSQL bağlantısı kullan (PrismaClient sorunları nedeniyle)
          const client = new Client({
            connectionString: process.env.DATABASE_URL || 'postgresql://ebubekir:12345@localhost:5432/mesaidefteri?schema=public'
          })

          await client.connect()
          console.log('[AUTH] PostgreSQL connected')

          const result = await client.query(
            'SELECT id, username, password, role, "fullName", "mustChangePassword" FROM users WHERE LOWER(username) = $1',
            [normalizedUsername]
          )

          await client.end()

          if (result.rows.length === 0) {
            console.log(`[AUTH] User not found: ${normalizedUsername}`)
            return null
          }

          const user = result.rows[0]
          console.log(`[AUTH] User found: ${user.fullName} (${user.role})`)
          console.log(`[AUTH] Password hash starts with $2: ${user.password.startsWith('$2')}`)

          // Şifre kontrolü (bcrypt ile hash'lenmiş şifreler için)
          let isPasswordValid = false

          if (user.password.startsWith('$2')) {
            // Bcrypt hash'lenmiş şifre
            isPasswordValid = await bcryptjs.compare(
              credentials.password as string,
              user.password
            )
            console.log(`[AUTH] Bcrypt compare result: ${isPasswordValid}`)
          } else {
            // Düz şifre (geçici - production'da tüm şifreler hash'lenmeli)
            isPasswordValid = user.password === credentials.password
            console.log(`[AUTH] Plain password compare result: ${isPasswordValid}`)
          }

          if (!isPasswordValid) {
            console.log(`[AUTH] Password mismatch for user: ${normalizedUsername}`)
            return null
          }

          console.log(`[AUTH] Successfully authenticated user: ${normalizedUsername} (${user.role})`)

          return {
            id: user.id,
            username: user.username,
            name: user.fullName,
            role: user.role as UserRole,
            email: null,
            mustChangePassword: user.mustChangePassword || false
          }
        } catch (error: any) {
          console.error('[AUTH] Error during authorization:', error)
          console.error('[AUTH] Error message:', error?.message)
          console.error('[AUTH] Error stack:', error?.stack?.substring(0, 500))
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = (user as any).username
        token.role = (user as any).role
        token.name = user.name
        token.mustChangePassword = (user as any).mustChangePassword || false
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.role = token.role as UserRole
        if (token.name) {
          session.user.name = token.name as string
        }
        if (token.mustChangePassword !== undefined) {
          (session.user as any).mustChangePassword = token.mustChangePassword as boolean
        }
      }
      return session
    }
  },
  pages: {
    signIn: '/',
    error: '/'
  },
  session: {
    strategy: 'jwt'
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this-in-production',
  trustHost: true, // NextAuth.js v5 için CSRF token sorununu çözmek için
  debug: process.env.NODE_ENV === 'development' // Development'ta debug logları açık
})
