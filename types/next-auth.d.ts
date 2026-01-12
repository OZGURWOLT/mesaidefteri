import { UserRole } from '@prisma/client'
import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    username: string
    role: UserRole
  }

  interface Session {
    user: {
      id: string
      username: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: UserRole
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    username: string
    role: UserRole
  }
}
