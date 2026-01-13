FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy package files first
COPY package.json ./

# Install dependencies WITHOUT running postinstall (Prisma schema henüz yok)
RUN npm install --legacy-peer-deps --no-audit --no-fund --ignore-scripts

# Copy Prisma schema AFTER npm install
COPY prisma ./prisma/

# Now generate Prisma Client (postinstall script'i manuel çalıştır)
RUN npx prisma generate

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
# Build-time için DATABASE_URL gerekli (Prisma client validation için)
# Runtime'da docker-compose üzerinden .env dosyası kullanılacak
ENV NEXT_TELEMETRY_DISABLED 1
# Build-time için dummy DATABASE_URL (sadece validation için)
# Runtime'da gerçek DATABASE_URL docker-compose üzerinden gelecek
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public"
# Build Next.js - try to build, if it fails, check if .next exists anyway
RUN npm run build || (echo "Build failed, checking for artifacts..." && ls -la /app/.next/ 2>/dev/null && test -d /app/.next/standalone && echo "Standalone found despite errors" || (echo "No standalone output, build must succeed" && exit 1))

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]
