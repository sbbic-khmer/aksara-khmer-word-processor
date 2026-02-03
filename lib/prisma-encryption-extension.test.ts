/**
 * Tests for Prisma Encryption Extension
 *
 * These tests verify the extension functions that transform data
 * before/after Prisma operations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  isDocumentEncrypted,
} from './prisma-encryption-extension'
import { encrypt, encryptJson, isEncrypted } from './encryption'

// Valid 32-byte key for testing (base64 encoded)
const TEST_ENCRYPTION_KEY = 'd9VF3b7d3DKz20FHv2OGySOxla8kU3/Zf67co4NKHdg='

describe('prisma-encryption-middleware', () => {
  describe('isDocumentEncrypted', () => {
    describe('with encryption enabled', () => {
      beforeEach(() => {
        vi.stubEnv('ENCRYPTION_KEY', TEST_ENCRYPTION_KEY)
      })

      afterEach(() => {
        vi.unstubAllEnvs()
      })

      it('returns true when title is encrypted', () => {
        const doc = {
          title: encrypt('My Document'),
          content: 'plain content',
          editorState: { root: {} },
        }

        expect(isDocumentEncrypted(doc)).toBe(true)
      })

      it('returns true when content is encrypted', () => {
        const doc = {
          title: 'Plain Title',
          content: encrypt('encrypted content'),
          editorState: { root: {} },
        }

        expect(isDocumentEncrypted(doc)).toBe(true)
      })

      it('returns true when editorState is encrypted string', () => {
        const doc = {
          title: 'Plain Title',
          content: 'plain content',
          editorState: encryptJson({ root: { children: [] } }),
        }

        expect(isDocumentEncrypted(doc)).toBe(true)
      })

      it('returns false when no fields are encrypted', () => {
        const doc = {
          title: 'Plain Title',
          content: 'plain content',
          editorState: { root: {} },
        }

        expect(isDocumentEncrypted(doc)).toBe(false)
      })

      it('returns false for empty document', () => {
        const doc = {
          title: null,
          content: null,
          editorState: null,
        }

        expect(isDocumentEncrypted(doc)).toBe(false)
      })

      it('handles missing fields', () => {
        const doc = {}

        expect(isDocumentEncrypted(doc)).toBe(false)
      })
    })

    describe('without encryption', () => {
      beforeEach(() => {
        vi.stubEnv('ENCRYPTION_KEY', '')
      })

      afterEach(() => {
        vi.unstubAllEnvs()
      })

      it('returns false for plaintext document', () => {
        const doc = {
          title: 'Plain Title',
          content: 'Plain content',
          editorState: { root: {} },
        }

        expect(isDocumentEncrypted(doc)).toBe(false)
      })
    })
  })

  describe('encryption format detection', () => {
    beforeEach(() => {
      vi.stubEnv('ENCRYPTION_KEY', TEST_ENCRYPTION_KEY)
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('correctly identifies encrypted strings', () => {
      const encrypted = encrypt('test')
      expect(isEncrypted(encrypted!)).toBe(true)
    })

    it('correctly identifies non-encrypted strings', () => {
      expect(isEncrypted('plain text')).toBe(false)
      expect(isEncrypted('ENC:notvalid')).toBe(false)
      expect(isEncrypted('')).toBe(false)
    })

    it('correctly identifies encrypted JSON', () => {
      const encrypted = encryptJson({ key: 'value' })
      expect(isEncrypted(encrypted!)).toBe(true)
    })
  })

  describe('Khmer text handling', () => {
    beforeEach(() => {
      vi.stubEnv('ENCRYPTION_KEY', TEST_ENCRYPTION_KEY)
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('encrypts and identifies Khmer document title', () => {
      const khmerTitle = 'ឯកសារថ្មី'
      const encrypted = encrypt(khmerTitle)

      expect(isEncrypted(encrypted!)).toBe(true)
      expect(isDocumentEncrypted({ title: encrypted })).toBe(true)
    })

    it('encrypts and identifies Khmer content', () => {
      const khmerContent = 'សួស្តី ពិភពលោក។ នេះជាឯកសារថ្មី។'
      const encrypted = encrypt(khmerContent)

      expect(isEncrypted(encrypted!)).toBe(true)
      expect(isDocumentEncrypted({ content: encrypted })).toBe(true)
    })

    it('handles Khmer text with special characters', () => {
      // Khmer text with various special characters
      const specialKhmer = 'អ្វីៗផ្សេងៗ «សួស្តី» ។ល។'
      const encrypted = encrypt(specialKhmer)

      expect(isEncrypted(encrypted!)).toBe(true)
    })
  })
})
