import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET - Fetch user's custom spell check words (both added and ignored)
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const addedWords = await sql`
      SELECT id, word, created_at
      FROM spell_check_added_words
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `

    const ignoredWords = await sql`
      SELECT id, word, created_at
      FROM spell_check_ignored_words
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      added: addedWords,
      ignored: ignoredWords
    })
  } catch (error) {
    console.error('Error fetching spell check custom words:', error)
    return NextResponse.json({ error: 'Failed to fetch custom words' }, { status: 500 })
  }
}

// POST - Add a word to spell check custom dictionary (add or ignore)
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { word, action } = await request.json()

    if (!word || typeof word !== 'string' || word.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid word' }, { status: 400 })
    }

    if (!action || !['add', 'ignore'].includes(action)) {
      return NextResponse.json({ error: 'Action must be "add" or "ignore"' }, { status: 400 })
    }

    const trimmedWord = word.trim()

    // Insert or ignore if already exists - use conditional logic for dynamic table
    const result = action === 'add'
      ? await sql`
          INSERT INTO spell_check_added_words (user_id, word)
          VALUES (${user.id}, ${trimmedWord})
          ON CONFLICT (user_id, word) DO NOTHING
          RETURNING id, word, created_at
        `
      : await sql`
          INSERT INTO spell_check_ignored_words (user_id, word)
          VALUES (${user.id}, ${trimmedWord})
          ON CONFLICT (user_id, word) DO NOTHING
          RETURNING id, word, created_at
        `

    if (result.length === 0) {
      // Word already exists
      return NextResponse.json({ message: `Word already ${action === 'add' ? 'added' : 'ignored'}` }, { status: 200 })
    }

    return NextResponse.json({ word: result[0], action }, { status: 201 })
  } catch (error) {
    console.error('Error adding custom word:', error)
    return NextResponse.json({ error: 'Failed to add custom word' }, { status: 500 })
  }
}

// DELETE - Remove a word from spell check custom dictionary
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const wordId = searchParams.get('id')
    const action = searchParams.get('action')

    if (!wordId) {
      return NextResponse.json({ error: 'Word ID required' }, { status: 400 })
    }

    if (!action || !['add', 'ignore'].includes(action)) {
      return NextResponse.json({ error: 'Action must be "add" or "ignore"' }, { status: 400 })
    }

    // Use conditional logic for dynamic table
    if (action === 'add') {
      await sql`
        DELETE FROM spell_check_added_words
        WHERE id = ${wordId} AND user_id = ${user.id}
      `
    } else {
      await sql`
        DELETE FROM spell_check_ignored_words
        WHERE id = ${wordId} AND user_id = ${user.id}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting custom word:', error)
    return NextResponse.json({ error: 'Failed to delete custom word' }, { status: 500 })
  }
}
