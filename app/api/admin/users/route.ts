import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { isAdmin } from "@/lib/auth"
import { DEFAULT_STORAGE_LIMIT } from "@/lib/storage"

// GET all users with their ad status and optionally storage info (admin only)
export async function GET(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const includeStorage = searchParams.get("includeStorage") === "true"

  try {
    if (includeStorage) {
      // Include storage usage calculation
      const result = await sql`
        SELECT
          u.id,
          u.email,
          u.name,
          u.role,
          u.show_ads,
          COALESCE(u.storage_limit_bytes, ${DEFAULT_STORAGE_LIMIT})::bigint as storage_limit_bytes,
          COALESCE(
            (SELECT SUM(
              OCTET_LENGTH(COALESCE(content, '')) +
              OCTET_LENGTH(COALESCE(editor_state::text, ''))
            ) FROM documents WHERE user_id = u.id), 0
          )::bigint as storage_used,
          u.created_at
        FROM users u
        ORDER BY u.email
      `
      return NextResponse.json({ users: result })
    }

    // Standard query without storage
    const result = await sql`
      SELECT
        id,
        email,
        name,
        role,
        show_ads,
        created_at
      FROM users
      ORDER BY created_at DESC
    `
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
