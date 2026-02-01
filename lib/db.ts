import { neon } from "@neondatabase/serverless"

// Create a SQL client using the DATABASE_URL environment variable
export const sql = neon(process.env.DATABASE_URL!, {
  disableWarningInBrowsers: true,
})

// Types for database entities
export interface User {
  id: string
  email: string
  password_hash: string
  name: string | null
  role: "user" | "admin"
  profile_picture_url: string | null
  show_ads: boolean
  created_at: Date
  updated_at: Date
}

export interface AppSetting {
  key: string
  value: unknown
  updated_at: Date
}

export interface UserPreferences {
  id: string
  user_id: string
  vad_silence_threshold: number
  vad_threshold: number
  preferred_mic_device_id: string | null
  show_breaks: boolean
  theme: string
  created_at: Date
  updated_at: Date
}

export interface MasterReplacement {
  id: string
  incorrect_word: string
  correct_word: string
  notes: string | null
  created_by: string | null
  promoted_from: string | null
  created_at: Date
  updated_at: Date
}

export interface UserReplacement {
  id: string
  user_id: string
  incorrect_word: string
  correct_word: string
  notes: string | null
  promoted_to_master: boolean
  promoted_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface Session {
  id: string
  user_id: string
  token_hash: string
  expires_at: Date
  created_at: Date
}
