import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "./prisma"
import { isPbkdf2Hash, verifyPbkdf2Password } from "./password-migration"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Email/password authentication with PBKDF2 migration support
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Custom password verification to handle migrated PBKDF2 hashes
    password: {
      async verify({ hash, password }) {
        // Check if this is a migrated PBKDF2 hash
        if (isPbkdf2Hash(hash)) {
          const isValid = await verifyPbkdf2Password(password, hash)
          if (isValid) {
            // Return true to indicate valid password
            // Better Auth will automatically re-hash with bcrypt on next update
            return true
          }
          return false
        }

        // For bcrypt hashes, use default verification
        // Better Auth uses bcrypt by default, so we return undefined
        // to let it handle the verification
        return undefined
      },
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes cache
    },
  },

  // Custom user fields
  user: {
    additionalFields: {
      isAdmin: {
        type: "boolean",
        defaultValue: false,
        input: false, // Cannot be set by client
      },
      storageLimitBytes: {
        type: "number",
        defaultValue: 5242880, // 5MB
        input: false,
      },
      showAds: {
        type: "boolean",
        defaultValue: true,
        input: false,
      },
    },
  },

  // Advanced configuration
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "aksara",
  },

  // Trusted origins for CSRF protection
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
  ],
})

// Export types for use in other files
export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
