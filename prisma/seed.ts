/**
 * Prisma Seed Script - Full Data Migration
 *
 * Seeds the database with:
 * 1. Default app settings (always applied)
 * 2. Full data from Neon exports (if exports/ directory exists)
 *    - Users (with PBKDF2 password hashes)
 *    - Documents
 *    - User preferences
 *    - Dictionary words
 *    - Spell check words
 *    - Replacements
 *
 * Usage:
 *   npm run db:seed
 *
 * To import from Neon:
 *   1. First run: NEON_DATABASE_URL=... npx tsx scripts/export-from-neon.ts
 *   2. Then run: npm run db:seed
 */

import { PrismaClient } from "@prisma/client"
import { existsSync, readFileSync } from "fs"
import { join } from "path"

// For seeds/migrations, always use the public DATABASE_URL (not internal Railway URL)
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required for seeding")
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: databaseUrl },
  },
})

const exportsDir = join(process.cwd(), "exports")

// Helper to load JSON file
function loadExport<T>(filename: string): T[] {
  const filepath = join(exportsDir, filename)
  if (!existsSync(filepath)) {
    return []
  }
  try {
    const data = readFileSync(filepath, "utf-8")
    return JSON.parse(data)
  } catch (e) {
    console.error(`   ⚠️  Could not parse ${filename}:`, e)
    return []
  }
}

// Type definitions for exported data
interface ExportedUser {
  id: string
  email: string
  password_hash: string | null
  name: string | null
  role: string
  created_at: string
  updated_at: string
}

interface ExportedDocument {
  id: string
  user_id: string
  title: string
  content: string
  editor_state: unknown
  created_at: string
  updated_at: string
}

interface ExportedUserPreference {
  id: string
  user_id: string
  vad_silence_threshold: number | null
  vad_threshold: number | null
  preferred_mic_device_id: string | null
  show_breaks: boolean | null
  theme: string | null
  stt_provider: string | null
  last_opened_document_id: string | null
  created_at: string
  updated_at: string
}

interface ExportedDictionaryWord {
  id: string
  user_id: string
  word: string
  frequency?: number
  notes?: string | null
  created_at: string
  updated_at?: string
}

interface ExportedIgnoredWord {
  id: string
  user_id: string
  word: string
  created_at: string
}

interface ExportedSpellCheckWord {
  id: string
  user_id: string
  word: string
  notes?: string | null
  created_at: string
  updated_at?: string
}

interface ExportedUserReplacement {
  id: string
  user_id: string
  incorrect_word: string
  correct_word: string
  notes?: string | null
  promoted_to_master?: boolean
  promoted_at?: string | null
  created_at: string
  updated_at: string
}

interface ExportedMasterReplacement {
  id?: string
  incorrect_word: string
  correct_word: string
  notes?: string | null
  created_by?: string | null
  promoted_from?: string | null
  created_at?: string
  updated_at?: string
}

interface ExportedAppSetting {
  key: string
  value: unknown
  updated_at?: string
}

async function main() {
  console.log("🌱 Starting database seed...")

  const hasExports = existsSync(exportsDir)
  if (hasExports) {
    console.log("\n📁 Found exports directory - importing Neon data...")
  }

  // ============================================================
  // Users
  // ============================================================
  const users = loadExport<ExportedUser>("users.json")
  const userIdMap = new Map<string, string>() // old ID -> new ID

  if (users.length > 0) {
    console.log(`\n📦 Importing ${users.length} users...`)

    for (const user of users) {
      try {
        // Create user with Better Auth compatible structure
        const createdUser = await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name,
            isAdmin: user.role === "admin",
            updatedAt: new Date(user.updated_at),
          },
          create: {
            id: user.id, // Preserve original ID
            email: user.email,
            name: user.name,
            emailVerified: true, // Migrated users are verified
            isAdmin: user.role === "admin",
            createdAt: new Date(user.created_at),
            updatedAt: new Date(user.updated_at),
          },
        })

        userIdMap.set(user.id, createdUser.id)

        // Create account record for password authentication
        if (user.password_hash) {
          await prisma.account.upsert({
            where: {
              id: `${createdUser.id}-credential`, // Unique ID for the account
            },
            update: {
              password: user.password_hash,
            },
            create: {
              id: `${createdUser.id}-credential`,
              userId: createdUser.id,
              accountId: createdUser.id,
              providerId: "credential",
              password: user.password_hash,
            },
          })
        }
      } catch (e) {
        console.error(`   ❌ Failed to import user ${user.email}:`, e)
      }
    }

    console.log(`   ✅ Imported ${userIdMap.size} users`)
  }

  // ============================================================
  // Documents
  // ============================================================
  const documents = loadExport<ExportedDocument>("documents.json")

  if (documents.length > 0) {
    console.log(`\n📦 Importing ${documents.length} documents...`)
    let imported = 0

    for (const doc of documents) {
      const userId = userIdMap.get(doc.user_id) || doc.user_id
      try {
        await prisma.document.upsert({
          where: { id: doc.id },
          update: {
            title: doc.title,
            content: doc.content,
            editorState: doc.editor_state as object,
            updatedAt: new Date(doc.updated_at),
          },
          create: {
            id: doc.id,
            userId,
            title: doc.title,
            content: doc.content,
            editorState: doc.editor_state as object,
            createdAt: new Date(doc.created_at),
            updatedAt: new Date(doc.updated_at),
          },
        })
        imported++
      } catch (e) {
        console.error(`   ❌ Failed to import document ${doc.id}:`, e)
      }
    }

    console.log(`   ✅ Imported ${imported} documents`)
  }

  // ============================================================
  // User Preferences
  // ============================================================
  const preferences = loadExport<ExportedUserPreference>("user_preferences.json")

  if (preferences.length > 0) {
    console.log(`\n📦 Importing ${preferences.length} user preferences...`)
    let imported = 0

    for (const pref of preferences) {
      const userId = userIdMap.get(pref.user_id) || pref.user_id
      // Parse string values to floats (PostgreSQL DECIMAL comes as string)
      const vadSilence = parseFloat(String(pref.vad_silence_threshold)) || 1.0
      const vadThreshold = parseFloat(String(pref.vad_threshold)) || 0.4
      try {
        await prisma.userPreference.upsert({
          where: { userId },
          update: {
            vadSilenceThreshold: vadSilence,
            vadThreshold: vadThreshold,
            preferredMicDeviceId: pref.preferred_mic_device_id,
            showBreaks: pref.show_breaks ?? true,
            theme: pref.theme ?? "light",
            sttProvider: pref.stt_provider ?? "browser",
            lastOpenedDocumentId: pref.last_opened_document_id,
          },
          create: {
            userId,
            vadSilenceThreshold: vadSilence,
            vadThreshold: vadThreshold,
            preferredMicDeviceId: pref.preferred_mic_device_id,
            showBreaks: pref.show_breaks ?? true,
            theme: pref.theme ?? "light",
            sttProvider: pref.stt_provider ?? "browser",
            lastOpenedDocumentId: pref.last_opened_document_id,
          },
        })
        imported++
      } catch (e) {
        console.error(`   ❌ Failed to import preference for user ${pref.user_id}:`, e)
      }
    }

    console.log(`   ✅ Imported ${imported} user preferences`)
  }

  // ============================================================
  // User Dictionary Words
  // ============================================================
  const dictWords = loadExport<ExportedDictionaryWord>("user_dictionary_words.json")

  if (dictWords.length > 0) {
    console.log(`\n📦 Importing ${dictWords.length} dictionary words...`)
    let imported = 0

    for (const word of dictWords) {
      const userId = userIdMap.get(word.user_id) || word.user_id
      try {
        await prisma.userDictionaryWord.upsert({
          where: {
            userId_word: { userId, word: word.word },
          },
          update: {
            frequency: word.frequency ?? 50000,
            notes: word.notes,
          },
          create: {
            userId,
            word: word.word,
            frequency: word.frequency ?? 50000,
            notes: word.notes,
          },
        })
        imported++
      } catch (e) {
        // Silently skip duplicates
      }
    }

    console.log(`   ✅ Imported ${imported} dictionary words`)
  }

  // ============================================================
  // User Ignored Dictionary Words
  // ============================================================
  const ignoredWords = loadExport<ExportedIgnoredWord>(
    "user_ignored_dictionary_words.json"
  )

  if (ignoredWords.length > 0) {
    console.log(`\n📦 Importing ${ignoredWords.length} ignored dictionary words...`)
    let imported = 0

    for (const word of ignoredWords) {
      const userId = userIdMap.get(word.user_id) || word.user_id
      try {
        await prisma.userIgnoredDictionaryWord.upsert({
          where: {
            userId_word: { userId, word: word.word },
          },
          update: {},
          create: {
            userId,
            word: word.word,
            createdAt: new Date(word.created_at),
          },
        })
        imported++
      } catch (e) {
        // Silently skip duplicates
      }
    }

    console.log(`   ✅ Imported ${imported} ignored dictionary words`)
  }

  // ============================================================
  // Spell Check Added Words
  // ============================================================
  const addedWords = loadExport<ExportedSpellCheckWord>(
    "spell_check_added_words.json"
  )

  if (addedWords.length > 0) {
    console.log(`\n📦 Importing ${addedWords.length} spell check added words...`)
    let imported = 0

    for (const word of addedWords) {
      const userId = userIdMap.get(word.user_id) || word.user_id
      try {
        await prisma.spellCheckAddedWord.upsert({
          where: {
            userId_word: { userId, word: word.word },
          },
          update: {
            notes: word.notes,
          },
          create: {
            userId,
            word: word.word,
            notes: word.notes,
          },
        })
        imported++
      } catch (e) {
        // Silently skip duplicates
      }
    }

    console.log(`   ✅ Imported ${imported} spell check added words`)
  }

  // ============================================================
  // Spell Check Ignored Words
  // ============================================================
  const scIgnoredWords = loadExport<ExportedSpellCheckWord>(
    "spell_check_ignored_words.json"
  )

  if (scIgnoredWords.length > 0) {
    console.log(`\n📦 Importing ${scIgnoredWords.length} spell check ignored words...`)
    let imported = 0

    for (const word of scIgnoredWords) {
      const userId = userIdMap.get(word.user_id) || word.user_id
      try {
        await prisma.spellCheckIgnoredWord.upsert({
          where: {
            userId_word: { userId, word: word.word },
          },
          update: {
            notes: word.notes,
          },
          create: {
            userId,
            word: word.word,
            notes: word.notes,
          },
        })
        imported++
      } catch (e) {
        // Silently skip duplicates
      }
    }

    console.log(`   ✅ Imported ${imported} spell check ignored words`)
  }

  // ============================================================
  // User Replacements
  // ============================================================
  const userReplacements = loadExport<ExportedUserReplacement>(
    "user_replacements.json"
  )

  if (userReplacements.length > 0) {
    console.log(`\n📦 Importing ${userReplacements.length} user replacements...`)
    let imported = 0

    for (const rep of userReplacements) {
      const userId = userIdMap.get(rep.user_id) || rep.user_id
      try {
        await prisma.userReplacement.upsert({
          where: {
            userId_incorrectWord: { userId, incorrectWord: rep.incorrect_word },
          },
          update: {
            correctWord: rep.correct_word,
            notes: rep.notes,
            promotedToMaster: rep.promoted_to_master ?? false,
            promotedAt: rep.promoted_at ? new Date(rep.promoted_at) : null,
          },
          create: {
            userId,
            incorrectWord: rep.incorrect_word,
            correctWord: rep.correct_word,
            notes: rep.notes,
            promotedToMaster: rep.promoted_to_master ?? false,
            promotedAt: rep.promoted_at ? new Date(rep.promoted_at) : null,
          },
        })
        imported++
      } catch (e) {
        // Silently skip duplicates
      }
    }

    console.log(`   ✅ Imported ${imported} user replacements`)
  }

  // ============================================================
  // Master Replacements
  // ============================================================
  const masterReplacements = loadExport<ExportedMasterReplacement>(
    "master_replacements.json"
  )

  if (masterReplacements.length > 0) {
    console.log(`\n📦 Importing ${masterReplacements.length} master replacements...`)
    let imported = 0

    for (const rep of masterReplacements) {
      try {
        await prisma.masterReplacement.upsert({
          where: { incorrectWord: rep.incorrect_word },
          update: {
            correctWord: rep.correct_word,
            notes: rep.notes,
          },
          create: {
            incorrectWord: rep.incorrect_word,
            correctWord: rep.correct_word,
            notes: rep.notes,
            promotedFrom: rep.promoted_from,
          },
        })
        imported++
      } catch (e) {
        // Silently skip duplicates
      }
    }

    console.log(`   ✅ Imported ${imported} master replacements`)
  }

  // ============================================================
  // App Settings (always applied)
  // ============================================================
  console.log("\n📦 Seeding app settings...")

  const defaultSettings = [
    { key: "ad_frequency_schedule", value: [2, 5, 10, 15] },
    { key: "default_storage_limit_bytes", value: 5242880 },
  ]

  const exportedSettings = loadExport<ExportedAppSetting>("app_settings.json")
  const settingsToSeed =
    exportedSettings.length > 0
      ? exportedSettings.map((s) => ({ key: s.key, value: s.value }))
      : defaultSettings

  for (const setting of settingsToSeed) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value as object },
      create: { key: setting.key, value: setting.value as object },
    })
    console.log(`   ✅ ${setting.key}`)
  }

  // ============================================================
  // Summary
  // ============================================================
  console.log("\n" + "=".repeat(60))
  console.log("✨ Seed completed successfully!")
  console.log("=".repeat(60))

  // Show current counts
  const counts = {
    users: await prisma.user.count(),
    documents: await prisma.document.count(),
    userPreferences: await prisma.userPreference.count(),
    dictionaryWords: await prisma.userDictionaryWord.count(),
    ignoredDictionaryWords: await prisma.userIgnoredDictionaryWord.count(),
    spellCheckAdded: await prisma.spellCheckAddedWord.count(),
    spellCheckIgnored: await prisma.spellCheckIgnoredWord.count(),
    userReplacements: await prisma.userReplacement.count(),
    masterReplacements: await prisma.masterReplacement.count(),
    appSettings: await prisma.appSetting.count(),
  }

  console.log("\nDatabase summary:")
  console.log(`   - Users: ${counts.users}`)
  console.log(`   - Documents: ${counts.documents}`)
  console.log(`   - User Preferences: ${counts.userPreferences}`)
  console.log(`   - Dictionary Words: ${counts.dictionaryWords}`)
  console.log(`   - Ignored Dictionary Words: ${counts.ignoredDictionaryWords}`)
  console.log(`   - Spell Check Added: ${counts.spellCheckAdded}`)
  console.log(`   - Spell Check Ignored: ${counts.spellCheckIgnored}`)
  console.log(`   - User Replacements: ${counts.userReplacements}`)
  console.log(`   - Master Replacements: ${counts.masterReplacements}`)
  console.log(`   - App Settings: ${counts.appSettings}`)

  if (users.length > 0) {
    console.log("\n⚠️  Password Migration Note:")
    console.log("   Migrated users have PBKDF2 password hashes.")
    console.log("   They can log in with their existing passwords.")
    console.log("   Passwords will be automatically re-hashed to bcrypt on login.")
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e)
    await prisma.$disconnect()
    process.exit(1)
  })
