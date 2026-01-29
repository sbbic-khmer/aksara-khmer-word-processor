import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET - Fetch user's dictionary words
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const words = await sql`
      SELECT id, word, created_at
      FROM user_dictionary_words
      WHERE user_id = ${session.user.id}
      ORDER BY created_at DESC
    `

    return NextResponse.json({ words })
  } catch (error) {
    console.error('Error fetching user dictionary:', error)
    return NextResponse.json({ error: 'Failed to fetch dictionary' }, { status: 500 })
  }
}

// POST - Add a word to user's dictionary
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { word } = await request.json()
    
    if (!word || typeof word !== 'string' || word.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid word' }, { status: 400 })
    }

    const trimmedWord = word.trim()

    // Insert or ignore if already exists
    const result = await sql`
      INSERT INTO user_dictionary_words (user_id, word)
      VALUES (${session.user.id}, ${trimmedWord})
      ON CONFLICT (user_id, word) DO NOTHING
      RETURNING id, word, created_at
    `

    if (result.length === 0) {
      // Word already exists
      return NextResponse.json({ message: 'Word already in dictionary' }, { status: 200 })
    }

    return NextResponse.json({ word: result[0] }, { status: 201 })
  } catch (error) {
    console.error('Error adding word to dictionary:', error)
    return NextResponse.json({ error: 'Failed to add word' }, { status: 500 })
  }
}

// DELETE - Remove a word from user's dictionary
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const wordId = searchParams.get('id')
    
    if (!wordId) {
      return NextResponse.json({ error: 'Word ID required' }, { status: 400 })
    }

    await sql`
      DELETE FROM user_dictionary_words
      WHERE id = ${wordId} AND user_id = ${session.user.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting word from dictionary:', error)
    return NextResponse.json({ error: 'Failed to delete word' }, { status: 500 })
  }
}
