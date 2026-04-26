import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { after } from "next/server"
import { prisma } from "./prisma"
import { isPbkdf2Hash, verifyPbkdf2Password } from "./password-migration"
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  isEmailConfigured,
} from "./email/email-service"
import { defaultLocale, isValidLocale } from "@/i18n/config"

const APP_URL =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
  process.env.BETTER_AUTH_URL ||
  "https://aksarapro.app"

// Build a locale-prefixed URL on the app side. Better Auth's `url` already
// includes the right token, but we want the redirect target inside our app to
// preserve the user's language.
function withLocalePrefix(path: string, locale: string | undefined): string {
  const resolved = locale && isValidLocale(locale) ? locale : defaultLocale
  const prefix = resolved === defaultLocale ? "" : `/${resolved}`
  return `${APP_URL}${prefix}${path}`
}

// Pull a locale hint from the request URL or Referer header. Server callbacks
// don't get explicit locale, so we sniff it from where the user is browsing.
function detectLocale(request?: Request): string {
  const candidates: string[] = []
  if (request) {
    const referer = request.headers.get("referer")
    if (referer) candidates.push(referer)
    candidates.push(request.url)
  }
  for (const candidate of candidates) {
    try {
      const { pathname } = new URL(candidate)
      const seg = pathname.split("/").filter(Boolean)[0]
      if (seg && isValidLocale(seg)) return seg
    } catch {
      // ignore malformed URLs
    }
  }
  return defaultLocale
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
    autoSignIn: false,

    // Keep all writers (signup, change-password, reset) on bcrypt. Without a
    // matching `hash`, Better Auth defaults to scrypt and the bcrypt-based
    // `verify` below would reject every new signup.
    password: {
      async hash(password) {
        const bcrypt = await import("bcryptjs")
        return bcrypt.hash(password, 10)
      },
      async verify({ hash, password }) {
        if (isPbkdf2Hash(hash)) {
          return verifyPbkdf2Password(password, hash)
        }
        const bcrypt = await import("bcryptjs")
        return bcrypt.compare(password, hash)
      },
    },

    sendResetPassword: async ({ user, token }, request) => {
      if (!isEmailConfigured()) {
        console.error("Password reset requested but email is not configured")
        return
      }
      // Better Auth's default `url` points at its GET callback which validates
      // the token and then redirects to the client's `redirectTo`. We send the
      // user directly to our locale-aware reset page; the POST handler still
      // validates the token on submit.
      const locale = detectLocale(request)
      const finalUrl = `${withLocalePrefix("/reset-password", locale)}?token=${encodeURIComponent(token)}`
      const result = await sendPasswordResetEmail(user.email, finalUrl)
      if (!result.success) {
        console.error("Failed to send password reset email:", result.error)
      }
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    // sendOnSignIn intentionally false — otherwise the post-signup redirect to
    // /editor falls through to the LoginScreen and any sign-in attempt fires a
    // duplicate verification email. Users who genuinely lost the email use the
    // "Resend" button on the login screen / verify-email page.
    sendOnSignIn: false,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 48, // 48 hours

    sendVerificationEmail: async ({ user, url }, request) => {
      if (!isEmailConfigured()) {
        console.error("Verification email requested but email is not configured")
        return
      }
      // Better Auth builds the URL with a default `callbackURL=/` already
      // appended. Replace it (don't append a second one) with our locale-aware
      // editor URL so users land in their chosen language after verification.
      const locale = detectLocale(request)
      const callbackURL = withLocalePrefix("/editor?verified=true", locale)
      const parsed = new URL(url)
      parsed.searchParams.set("callbackURL", callbackURL)
      const finalUrl = parsed.toString()
      const result = await sendVerificationEmail(
        user.email,
        finalUrl,
        user.name || undefined
      )
      if (!result.success) {
        console.error("Failed to send verification email:", result.error)
      }
    },
  },

  // Defer SMTP work until after the response is sent so signup/forgot-password
  // /resend-verification responses aren't blocked by 200-800ms email latency.
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "aksara",
    backgroundTasks: {
      handler: (promise) => {
        after(promise.catch((err) => console.error("background task failed:", err)))
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  user: {
    additionalFields: {
      isAdmin: {
        type: "boolean",
        defaultValue: false,
        input: false,
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

  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "https://aksarapro.app",
  ],
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
