#!/bin/bash

# Manuel Kurulum Script'i
# Git authentication olmadan gerekli dosyaları oluşturur

set -e

PROJECT_DIR="/opt/mesaidefteri"
cd $PROJECT_DIR

echo "📝 Gerekli dosyalar oluşturuluyor..."

# docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    container_name: mesaidefteri-app
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public
    depends_on:
      - db

  db:
    container_name: mesaidefteri-db
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:
EOF

# Dockerfile
cat > Dockerfile << 'EOF'
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy package files and Prisma schema
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies with legacy peer deps
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]
EOF

# .env.example
cat > env.example << 'EOF'
POSTGRES_USER=ebubekir
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=mesaidefteri
DATABASE_URL=postgresql://ebubekir:your_secure_password_here@db:5432/mesaidefteri?schema=public

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here_min_32_chars

NETGSM_USERNAME=4146060654
NETGSM_PASSWORD=T1.69r3E
NETGSM_MSGHEADER=EVDESIPARIS
NETGSM_PARTNERCODE=

CRON_API_KEY=your_secure_cron_api_key_here

NODE_ENV=production
EOF

# next.config.js
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@prisma/client'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
    minimumCacheTTL: 60,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
}

module.exports = nextConfig
EOF

# package.json (minimal - gerçek dosya GitHub'da)
cat > package.json << 'EOF'
{
  "name": "mesaidefteri",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:migrate:deploy": "prisma migrate deploy",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@auth/prisma-adapter": "^2.11.1",
    "@hookform/resolvers": "^5.2.2",
    "@prisma/client": "^7.2.0",
    "bcryptjs": "^3.0.3",
    "cloudinary": "^2.8.0",
    "lucide-react": "^0.294.0",
    "next": "^14.0.0",
    "next-auth": "^5.0.0-beta.30",
    "next-cloudinary": "^6.17.5",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.70.0",
    "zod": "^4.3.5"
  },
  "devDependencies": {
    "@prisma/config": "^7.2.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.16",
    "dotenv": "^16.3.1",
    "pg": "^8.16.3",
    "postcss": "^8.4.31",
    "prisma": "^7.2.0",
    "tailwindcss": "^3.3.5",
    "ts-node": "^10.9.2",
    "tsx": "^4.7.0",
    "typescript": "^5.2.2"
  }
}
EOF

echo "✅ Temel dosyalar oluşturuldu!"
echo ""
echo "⚠️  NOT: Bu dosyalar minimal versiyonlar. Tüm proje dosyaları için:"
echo "   1. GitHub repository'yi public yapın, VEYA"
echo "   2. Personal Access Token kullanın"
echo ""
echo "📝 Şimdi yapmanız gerekenler:"
echo "   1. .env dosyası oluşturun: cp env.example .env"
echo "   2. .env dosyasını düzenleyin: nano .env"
echo "   3. Prisma schema'yı oluşturmanız gerekecek (GitHub'dan)"
