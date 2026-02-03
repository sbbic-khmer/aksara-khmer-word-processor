import { PrismaClient } from "@prisma/client"
import { createEncryptionExtension } from "./prisma-encryption-extension"

// Prevent multiple instances in development (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

// Use INTERNAL_DATABASE_URL in production (Railway internal network)
// Fall back to DATABASE_URL for local development
const databaseUrl = process.env.NODE_ENV === "production"
  ? process.env.INTERNAL_DATABASE_URL || process.env.DATABASE_URL
  : process.env.DATABASE_URL

function createPrismaClient() {
  const client = new PrismaClient({
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

  // Apply encryption extension for document fields
  return client.$extends(createEncryptionExtension())
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma
