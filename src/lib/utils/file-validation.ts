/**
 * File validation utilities for statement uploads
 *
 * Validates files before upload based on:
 * - File type (MIME type and extension)
 * - File size
 */

// ============================================================================
// Constants
// ============================================================================

/** Maximum file size in bytes (10MB) */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

/** Maximum file size for display */
export const MAX_FILE_SIZE_DISPLAY = '10MB'

/**
 * Accepted MIME types mapped to their file extensions
 * Used for validation and display purposes
 */
export const ACCEPTED_MIME_TYPES = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/heic': ['.heic'],
} as const

/** All accepted file extensions (flattened) */
export const ACCEPTED_EXTENSIONS = Object.values(ACCEPTED_MIME_TYPES).flat()

/** Human-readable list of accepted file types */
export const ACCEPTED_FILE_TYPES_DISPLAY = 'PDF, PNG, JPG, HEIC'

/** Set of accepted MIME types for quick lookup */
export const ACCEPTED_MIME_TYPE_SET = new Set(Object.keys(ACCEPTED_MIME_TYPES))

// ============================================================================
// Types
// ============================================================================

export type FileValidationErrorCode =
  | 'file-too-large'
  | 'file-invalid-type'
  | 'file-empty'
  | 'file-name-missing'

export interface FileValidationError {
  code: FileValidationErrorCode
  message: string
}

export interface FileValidationResult {
  valid: boolean
  error?: FileValidationError
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Get a human-readable error message for a validation error code
 */
export function getValidationErrorMessage(code: FileValidationErrorCode): string {
  switch (code) {
    case 'file-too-large':
      return `File exceeds the ${MAX_FILE_SIZE_DISPLAY} size limit.`
    case 'file-invalid-type':
      return `Invalid file type. Please upload ${ACCEPTED_FILE_TYPES_DISPLAY} files.`
    case 'file-empty':
      return 'File is empty. Please select a valid file.'
    case 'file-name-missing':
      return 'File name is missing. Please select a valid file.'
    default:
      return 'File could not be validated.'
  }
}

/**
 * Validate file size
 *
 * @param file - The file to validate
 * @returns Validation result with error if file is too large
 */
export function validateFileSize(file: File): FileValidationResult {
  if (file.size === 0) {
    return {
      valid: false,
      error: {
        code: 'file-empty',
        message: getValidationErrorMessage('file-empty'),
      },
    }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: {
        code: 'file-too-large',
        message: getValidationErrorMessage('file-too-large'),
      },
    }
  }

  return { valid: true }
}

/**
 * Get file extension from filename (lowercase, with dot)
 *
 * @param filename - The filename to extract extension from
 * @returns The file extension (e.g., '.pdf') or empty string if none
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return ''
  }
  return filename.slice(lastDot).toLowerCase()
}

/**
 * Check if a MIME type is accepted
 *
 * @param mimeType - The MIME type to check
 * @returns True if the MIME type is accepted
 */
export function isAcceptedMimeType(mimeType: string): boolean {
  // Handle empty or undefined MIME type
  if (!mimeType) return false

  // Direct match
  if (ACCEPTED_MIME_TYPE_SET.has(mimeType)) return true

  // Handle JPEG variants (some systems report different MIME types)
  if (mimeType === 'image/jpg') return true

  return false
}

/**
 * Check if a file extension is accepted
 *
 * @param extension - The file extension to check (with or without dot)
 * @returns True if the extension is accepted
 */
export function isAcceptedExtension(extension: string): boolean {
  if (!extension) return false

  const normalizedExt = extension.startsWith('.')
    ? extension.toLowerCase()
    : `.${extension.toLowerCase()}`

  return ACCEPTED_EXTENSIONS.includes(normalizedExt as typeof ACCEPTED_EXTENSIONS[number])
}

/**
 * Validate file type based on MIME type and extension
 *
 * Performs validation using both the MIME type and file extension
 * to handle cases where browsers report incorrect MIME types.
 *
 * @param file - The file to validate
 * @returns Validation result with error if file type is invalid
 */
export function validateFileType(file: File): FileValidationResult {
  // Check if filename exists
  if (!file.name) {
    return {
      valid: false,
      error: {
        code: 'file-name-missing',
        message: getValidationErrorMessage('file-name-missing'),
      },
    }
  }

  const extension = getFileExtension(file.name)
  const mimeType = file.type

  // Accept if either MIME type or extension is valid
  // This handles cases where:
  // - Browser doesn't know the MIME type (reports empty string or application/octet-stream)
  // - HEIC files which some browsers don't recognize
  const hasValidMimeType = isAcceptedMimeType(mimeType)
  const hasValidExtension = isAcceptedExtension(extension)

  // For HEIC files, browsers often don't know the MIME type
  // so we accept based on extension alone
  if (extension === '.heic' && hasValidExtension) {
    return { valid: true }
  }

  // For other files, prefer MIME type validation but fall back to extension
  if (hasValidMimeType || hasValidExtension) {
    return { valid: true }
  }

  return {
    valid: false,
    error: {
      code: 'file-invalid-type',
      message: getValidationErrorMessage('file-invalid-type'),
    },
  }
}

/**
 * Validate a file for upload
 *
 * Performs complete validation including:
 * - File type (MIME type and extension)
 * - File size (max 10MB)
 *
 * Validation happens synchronously and should be called before
 * starting any upload.
 *
 * @param file - The file to validate
 * @returns Validation result with error details if invalid
 *
 * @example
 * ```ts
 * const result = validateFile(file)
 * if (!result.valid) {
 *   console.error(result.error?.message)
 *   return
 * }
 * // Proceed with upload
 * ```
 */
export function validateFile(file: File): FileValidationResult {
  // Validate type first (catches most common issues)
  const typeResult = validateFileType(file)
  if (!typeResult.valid) {
    return typeResult
  }

  // Validate size
  const sizeResult = validateFileSize(file)
  if (!sizeResult.valid) {
    return sizeResult
  }

  return { valid: true }
}

/**
 * Validate multiple files for upload
 *
 * @param files - Array of files to validate
 * @returns Map of file names to validation results
 *
 * @example
 * ```ts
 * const results = validateFiles(fileList)
 * const invalidFiles = Array.from(results.entries())
 *   .filter(([, result]) => !result.valid)
 * ```
 */
export function validateFiles(files: File[]): Map<string, FileValidationResult> {
  const results = new Map<string, FileValidationResult>()

  for (const file of files) {
    results.set(file.name, validateFile(file))
  }

  return results
}

/**
 * Format file size for display
 *
 * @param bytes - File size in bytes
 * @returns Human-readable file size string
 *
 * @example
 * ```ts
 * formatFileSize(1024) // "1.0 KB"
 * formatFileSize(1048576) // "1.0 MB"
 * ```
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
