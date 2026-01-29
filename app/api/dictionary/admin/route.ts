import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET - Fetch all user dictionary words with aggregation (admin only)
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get aggregated word data - words that appear across multiple users
    // are shown with their count
    const words = await sql`
      SELECT 
        udw.word,
        COUNT(*)::int as user_count,
        MIN(udw.created_at) as first_added,
        MAX(udw.created_at) as last_added
      FROM user_dictionary_words udw
      GROUP BY udw.word
      ORDER BY COUNT(*) DESC, MAX(udw.created_at) DESC
    `

    return NextResponse.json({ words })
  } catch (error) {
    console.error('Error fetching admin dictionary view:', error)
    return NextResponse.json({ error: 'Failed to fetch dictionary data' }, { status: 500 })
  }
}
