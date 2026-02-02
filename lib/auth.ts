import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "./prisma"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Email/password authentication
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
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
