import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET - Fetch user's ignored dictionary words
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const words = await sql`
      SELECT id, word, created_at
      FROM user_ignored_dictionary_words
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `

    return NextResponse.json({ words })
  } catch (error) {
    console.error('Error fetching ignored dictionary words:', error)
    return NextResponse.json({ error: 'Failed to fetch ignored words' }, { status: 500 })
  }
}

// POST - Add a word to user's ignored list
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { word } = await request.json()

    if (!word || typeof word !== 'string' || word.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid word' }, { status: 400 })
    }

    const trimmedWord = word.trim()

    // Insert or ignore if already exists
    const result = await sql`
      INSERT INTO user_ignored_dictionary_words (user_id, word)
      VALUES (${user.id}, ${trimmedWord})
      ON CONFLICT (user_id, word) DO NOTHING
      RETURNING id, word, created_at
    `

    if (result.length === 0) {
      // Word already in ignore list
      return NextResponse.json({ message: 'Word already in ignore list' }, { status: 200 })
    }

    return NextResponse.json({ word: result[0] }, { status: 201 })
  } catch (error) {
    console.error('Error adding word to ignore list:', error)
    return NextResponse.json({ error: 'Failed to add word to ignore list' }, { status: 500 })
  }
}

// DELETE - Remove a word from user's ignored list (by id or word)
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const wordId = searchParams.get('id')
    const word = searchParams.get('word')

    if (!wordId && !word) {
      return NextResponse.json({ error: 'Word ID or word required' }, { status: 400 })
    }

    if (wordId) {
      // Delete by ID
      await sql`
        DELETE FROM user_ignored_dictionary_words
        WHERE id = ${wordId} AND user_id = ${user.id}
      `
    } else if (word) {
      // Delete by word text
      await sql`
        DELETE FROM user_ignored_dictionary_words
        WHERE word = ${word} AND user_id = ${user.id}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting word from ignore list:', error)
    return NextResponse.json({ error: 'Failed to delete word' }, { status: 500 })
  }
}
