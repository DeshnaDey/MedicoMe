// Prisma client singleton. Next.js hot-reloads server modules on every save in
// dev, which without this guard would leak a new PrismaClient every time. The
// global-cast trick is Prisma's own recommendation.

import { PrismaClient } from './prisma-client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Only log queries in dev — production logs should be kept clean.
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
