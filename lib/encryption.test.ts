/**
 * Tests for Document Encryption Utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  encrypt,
  decrypt,
  encryptJson,
  decryptJson,
  isEncrypted,
  isEncryptionEnabled,
} from './encryption'

// Valid 32-byte key for testing (base64 encoded)
// Generated with: openssl rand -base64 32
const TEST_ENCRYPTION_KEY = 'd9VF3b7d3DKz20FHv2OGySOxla8kU3/Zf67co4NKHdg='

describe('encryption utilities', () => {
  describe('with ENCRYPTION_KEY set', () => {
    beforeEach(() => {
      vi.stubEnv('ENCRYPTION_KEY', TEST_ENCRYPTION_KEY)
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    describe('isEncryptionEnabled', () => {
      it('returns true when ENCRYPTION_KEY is set', () => {
        expect(isEncryptionEnabled()).toBe(true)
      })
    })

    describe('encrypt', () => {
      it('encrypts a string and returns encrypted format', () => {
        const plaintext = 'Hello, World!'
        const encrypted = encrypt(plaintext)

        expect(encrypted).not.toBe(plaintext)
        expect(encrypted).toMatch(/^ENC:v1:/)
        expect(encrypted!.split(':').length).toBe(5) // ENC:v1:iv:ciphertext:authTag
      })

      it('returns null for null input', () => {
        expect(encrypt(null)).toBe(null)
      })

      it('returns null for undefined input', () => {
        expect(encrypt(undefined)).toBe(null)
      })

      it('does not double-encrypt already encrypted data', () => {
        const plaintext = 'Secret message'
        const encrypted = encrypt(plaintext)
        const doubleEncrypted = encrypt(encrypted!)

        expect(doubleEncrypted).toBe(encrypted)
      })

      it('produces different ciphertext for same plaintext (due to random IV)', () => {
        const plaintext = 'Same message'
        const encrypted1 = encrypt(plaintext)
        const encrypted2 = encrypt(plaintext)

        expect(encrypted1).not.toBe(encrypted2)
      })

      it('handles empty string', () => {
        const encrypted = encrypt('')
        expect(encrypted).toMatch(/^ENC:v1:/)
      })

      it('handles Unicode text (Khmer)', () => {
        const khmerText = 'សួស្តី ពិភពលោក' // Hello World in Khmer
        const encrypted = encrypt(khmerText)

        expect(encrypted).toMatch(/^ENC:v1:/)
        expect(decrypt(encrypted!)).toBe(khmerText)
      })

      it('handles long text', () => {
        const longText = 'A'.repeat(10000)
        const encrypted = encrypt(longText)

        expect(encrypted).toMatch(/^ENC:v1:/)
        expect(decrypt(encrypted!)).toBe(longText)
      })
    })

    describe('decrypt', () => {
      it('decrypts encrypted data correctly', () => {
        const plaintext = 'Hello, World!'
        const encrypted = encrypt(plaintext)
        const decrypted = decrypt(encrypted!)

        expect(decrypted).toBe(plaintext)
      })

      it('returns null for null input', () => {
        expect(decrypt(null)).toBe(null)
      })

      it('returns null for undefined input', () => {
        expect(decrypt(undefined)).toBe(null)
      })

      it('returns unencrypted string as-is', () => {
        const plaintext = 'Not encrypted'
        expect(decrypt(plaintext)).toBe(plaintext)
      })

      it('throws error for invalid encrypted format', () => {
        const invalidEncrypted = 'ENC:v1:invalid'

        expect(() => decrypt(invalidEncrypted)).toThrow()
      })
    })

    describe('isEncrypted', () => {
      it('returns true for encrypted string', () => {
        const encrypted = encrypt('test')
        expect(isEncrypted(encrypted!)).toBe(true)
      })

      it('returns false for plaintext string', () => {
        expect(isEncrypted('Hello World')).toBe(false)
      })

      it('returns false for null', () => {
        expect(isEncrypted(null)).toBe(false)
      })

      it('returns false for undefined', () => {
        expect(isEncrypted(undefined)).toBe(false)
      })

      it('returns false for string starting with ENC but not valid format', () => {
        expect(isEncrypted('ENC:notvalid')).toBe(false)
      })
    })

    describe('encryptJson', () => {
      it('encrypts an object', () => {
        const obj = { name: 'Test', value: 123 }
        const encrypted = encryptJson(obj)

        expect(encrypted).toMatch(/^ENC:v1:/)
      })

      it('encrypts an array', () => {
        const arr = [1, 2, 3, 'test']
        const encrypted = encryptJson(arr)

        expect(encrypted).toMatch(/^ENC:v1:/)
      })

      it('returns null for null input', () => {
        expect(encryptJson(null)).toBe(null)
      })

      it('returns null for undefined input', () => {
        expect(encryptJson(undefined)).toBe(null)
      })

      it('handles nested objects', () => {
        const nested = {
          level1: {
            level2: {
              value: 'deep'
            }
          },
          array: [1, { nested: true }]
        }
        const encrypted = encryptJson(nested)
        const decrypted = decryptJson(encrypted!)

        expect(decrypted).toEqual(nested)
      })
    })

    describe('decryptJson', () => {
      it('decrypts encrypted JSON object', () => {
        const obj = { name: 'Test', value: 123 }
        const encrypted = encryptJson(obj)
        const decrypted = decryptJson(encrypted!)

        expect(decrypted).toEqual(obj)
      })

      it('decrypts encrypted JSON array', () => {
        const arr = [1, 2, 3, 'test']
        const encrypted = encryptJson(arr)
        const decrypted = decryptJson(encrypted!)

        expect(decrypted).toEqual(arr)
      })

      it('returns null for null input', () => {
        expect(decryptJson(null)).toBe(null)
      })

      it('returns null for undefined input', () => {
        expect(decryptJson(undefined)).toBe(null)
      })

      it('preserves Khmer text in JSON', () => {
        const khmerObj = {
          title: 'ឯកសារថ្មី',
          content: 'សួស្តី ពិភពលោក'
        }
        const encrypted = encryptJson(khmerObj)
        const decrypted = decryptJson(encrypted!)

        expect(decrypted).toEqual(khmerObj)
      })
    })

    describe('round-trip encryption/decryption', () => {
      it('preserves data integrity for complex objects', () => {
        const complexObj = {
          title: 'Document Title',
          content: 'Some content with special chars: <>&"\' and unicode: 日本語',
          editorState: {
            root: {
              children: [
                { type: 'paragraph', text: 'Hello' },
                { type: 'paragraph', text: 'World' }
              ]
            }
          },
          metadata: {
            created: '2024-01-01T00:00:00Z',
            modified: '2024-01-02T00:00:00Z'
          }
        }

        const encrypted = encryptJson(complexObj)
        const decrypted = decryptJson(encrypted!)

        expect(decrypted).toEqual(complexObj)
      })
    })
  })

  describe('without ENCRYPTION_KEY set', () => {
    beforeEach(() => {
      vi.stubEnv('ENCRYPTION_KEY', '')
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    describe('isEncryptionEnabled', () => {
      it('returns false when ENCRYPTION_KEY is not set', () => {
        expect(isEncryptionEnabled()).toBe(false)
      })
    })

    describe('encrypt', () => {
      it('returns plaintext when encryption is disabled', () => {
        const plaintext = 'Hello, World!'
        const result = encrypt(plaintext)

        expect(result).toBe(plaintext)
      })
    })

    describe('decrypt', () => {
      it('returns plaintext as-is when not encrypted', () => {
        const plaintext = 'Hello, World!'
        const result = decrypt(plaintext)

        expect(result).toBe(plaintext)
      })

      it('throws error when trying to decrypt encrypted data without key', () => {
        // This simulates data that was encrypted with a key, but now the key is missing
        const encryptedData = 'ENC:v1:someIV:someCiphertext:someAuthTag'

        expect(() => decrypt(encryptedData)).toThrow('encryption key not available')
      })
    })

    describe('encryptJson', () => {
      it('returns JSON string when encryption is disabled', () => {
        const obj = { name: 'Test' }
        const result = encryptJson(obj)

        expect(result).toBe(JSON.stringify(obj))
      })
    })
  })

  describe('with invalid ENCRYPTION_KEY', () => {
    beforeEach(() => {
      vi.stubEnv('ENCRYPTION_KEY', 'short-key') // Not 32 bytes
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('returns false for isEncryptionEnabled with invalid key', () => {
      expect(isEncryptionEnabled()).toBe(false)
    })

    it('returns plaintext when key is invalid', () => {
      const plaintext = 'Hello, World!'
      const result = encrypt(plaintext)

      expect(result).toBe(plaintext)
    })
  })
})
