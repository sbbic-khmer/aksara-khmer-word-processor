import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Query added words with user count, sorted by popularity
    const addedWords = await sql`
      SELECT
        word,
        COUNT(*)::int as user_count,
        MIN(created_at) as first_added,
        MAX(created_at) as last_added
      FROM spell_check_added_words
      GROUP BY word
      ORDER BY COUNT(*) DESC, word ASC
    `

    // Query ignored words with user count, sorted by popularity
    const ignoredWords = await sql`
      SELECT
        word,
        COUNT(*)::int as user_count,
        MIN(created_at) as first_added,
        MAX(created_at) as last_added
      FROM spell_check_ignored_words
      GROUP BY word
      ORDER BY COUNT(*) DESC, word ASC
    `

    return NextResponse.json({
      added: addedWords,
      ignored: ignoredWords,
    })
  } catch (error) {
    console.error('Error fetching spell check custom words:', error)
    return NextResponse.json(
      { error: 'Failed to fetch spell check custom words' },
      { status: 500 }
    )
  }
}
