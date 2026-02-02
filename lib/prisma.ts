import { PrismaClient } from "@prisma/client"

// Prevent multiple instances in development (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use INTERNAL_DATABASE_URL in production (Railway internal network)
// Fall back to DATABASE_URL for local development
const databaseUrl = process.env.NODE_ENV === "production"
  ? process.env.INTERNAL_DATABASE_URL || process.env.DATABASE_URL
  : process.env.DATABASE_URL

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma
