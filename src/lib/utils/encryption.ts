/**
 * Encryption Utility
 *
 * Provides AES-256-GCM encryption/decryption for sensitive data (IMAP passwords)
 * Uses environment variable EMAIL_ENCRYPTION_KEY for the encryption key
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 16 bytes for GCM
const AUTH_TAG_LENGTH = 16 // 16 bytes for GCM auth tag
const KEY_LENGTH = 32 // 32 bytes for AES-256

/**
 * Get the encryption key from environment
 * Throws if key is not set or invalid
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.EMAIL_ENCRYPTION_KEY

  if (!keyHex) {
    throw new Error('EMAIL_ENCRYPTION_KEY environment variable is not set')
  }

  if (keyHex.length !== KEY_LENGTH * 2) { // Hex string is 2 chars per byte
    throw new Error(`EMAIL_ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes)`)
  }

  try {
    return Buffer.from(keyHex, 'hex')
  } catch (error) {
    throw new Error('EMAIL_ENCRYPTION_KEY must be a valid hex string')
  }
}

/**
 * Encrypt a string using AES-256-GCM
 *
 * @param plaintext - The string to encrypt
 * @returns Object containing encrypted text and IV
 *
 * @example
 * const { encrypted, iv } = encryptString('my-secret-password')
 * // Store both encrypted and iv in database
 */
export function encryptString(plaintext: string): {
  encrypted: string
  iv: string
} {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string')
  }

  const key = getEncryptionKey()

  // Generate random IV (initialization vector)
  const iv = crypto.randomBytes(IV_LENGTH)

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  // Encrypt the plaintext
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  // Get the authentication tag
  const authTag = cipher.getAuthTag()

  // Combine encrypted text with auth tag
  const encryptedWithTag = encrypted + authTag.toString('hex')

  return {
    encrypted: encryptedWithTag,
    iv: iv.toString('hex')
  }
}

/**
 * Decrypt a string using AES-256-GCM
 *
 * @param encrypted - The encrypted string (hex)
 * @param iv - The initialization vector (hex)
 * @returns Decrypted plaintext string
 *
 * @example
 * const password = decryptString(account.imap_password_encrypted, account.encryption_iv)
 */
export function decryptString(encrypted: string, iv: string): string {
  if (!encrypted || !iv) {
    throw new Error('Cannot decrypt: encrypted text and IV are required')
  }

  const key = getEncryptionKey()

  // Convert IV from hex to buffer
  const ivBuffer = Buffer.from(iv, 'hex')

  if (ivBuffer.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH} bytes, got ${ivBuffer.length}`)
  }

  // Extract auth tag from the end of encrypted data
  const authTagStart = encrypted.length - (AUTH_TAG_LENGTH * 2) // 2 hex chars per byte
  const encryptedData = encrypted.substring(0, authTagStart)
  const authTagHex = encrypted.substring(authTagStart)
  const authTag = Buffer.from(authTagHex, 'hex')

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer)
  decipher.setAuthTag(authTag)

  // Decrypt
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Validate that encryption is properly configured
 * Throws if configuration is invalid
 */
export function validateEncryptionConfig(): void {
  getEncryptionKey() // Will throw if invalid
}

/**
 * Test encryption/decryption roundtrip
 * Useful for verifying configuration
 */
export function testEncryption(): boolean {
  try {
    const testString = 'test-password-123'
    const { encrypted, iv } = encryptString(testString)
    const decrypted = decryptString(encrypted, iv)
    return decrypted === testString
  } catch (error) {
    console.error('Encryption test failed:', error)
    return false
  }
}
