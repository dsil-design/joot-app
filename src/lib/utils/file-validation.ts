/**
 * File Validation Utilities
 *
 * Client-side validation for document uploads
 * Matches backend validation rules in /api/documents/upload
 */

// Maximum file size: 10MB (must match backend)
export const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed file types (must match backend)
export const ALLOWED_FILE_TYPES = {
  'application/pdf': { extension: '.pdf', label: 'PDF' },
  'image/jpeg': { extension: '.jpg,.jpeg', label: 'JPEG' },
  'image/png': { extension: '.png', label: 'PNG' },
  'message/rfc822': { extension: '.eml', label: 'Email' },
} as const

export type AllowedMimeType = keyof typeof ALLOWED_FILE_TYPES

export interface FileValidationError {
  code: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'NO_FILE' | 'MULTIPLE_FILES'
  message: string
}

export interface FileValidationResult {
  valid: boolean
  error?: FileValidationError
  file?: File
}

/**
 * Validate a single file for upload
 *
 * @param file - File to validate
 * @returns Validation result with error details if invalid
 *
 * @example
 * const result = validateFile(file)
 * if (!result.valid) {
 *   console.error(result.error.message)
 * }
 */
export function validateFile(file: File | null | undefined): FileValidationResult {
  // Check if file exists
  if (!file) {
    return {
      valid: false,
      error: {
        code: 'NO_FILE',
        message: 'No file selected',
      },
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024)
    return {
      valid: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: `File size must be less than ${maxSizeMB}MB`,
      },
    }
  }

  // Check file type
  if (!isAllowedFileType(file.type)) {
    const allowedTypes = Object.values(ALLOWED_FILE_TYPES)
      .map((t) => t.label)
      .join(', ')
    return {
      valid: false,
      error: {
        code: 'INVALID_TYPE',
        message: `Invalid file type. Allowed types: ${allowedTypes}`,
      },
    }
  }

  return {
    valid: true,
    file,
  }
}

/**
 * Validate multiple files (for batch upload)
 *
 * @param files - FileList or File array to validate
 * @returns Array of validation results
 */
export function validateFiles(
  files: FileList | File[]
): FileValidationResult[] {
  const fileArray = Array.from(files)
  return fileArray.map((file) => validateFile(file))
}

/**
 * Check if MIME type is allowed
 *
 * @param mimeType - MIME type to check
 * @returns True if allowed
 */
export function isAllowedFileType(mimeType: string): mimeType is AllowedMimeType {
  return mimeType in ALLOWED_FILE_TYPES
}

/**
 * Get file type label from MIME type
 *
 * @param mimeType - MIME type
 * @returns Human-readable label (e.g., "PDF", "JPEG")
 */
export function getFileTypeLabel(mimeType: string): string {
  if (isAllowedFileType(mimeType)) {
    return ALLOWED_FILE_TYPES[mimeType].label
  }
  return 'Unknown'
}

/**
 * Get accepted file extensions for file input
 *
 * @returns Comma-separated string of extensions for accept attribute
 *
 * @example
 * <input type="file" accept={getAcceptedExtensions()} />
 */
export function getAcceptedExtensions(): string {
  return Object.values(ALLOWED_FILE_TYPES)
    .map((t) => t.extension)
    .join(',')
}

/**
 * Format file size for display
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Get file icon based on MIME type
 *
 * @param mimeType - MIME type
 * @returns Icon name (for use with icon library)
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'file-pdf'
  if (mimeType.startsWith('image/')) return 'file-image'
  if (mimeType === 'message/rfc822') return 'mail'
  return 'file'
}

/**
 * Check if file is an image type
 *
 * @param mimeType - MIME type
 * @returns True if image type
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

/**
 * Check if file is a PDF
 *
 * @param mimeType - MIME type
 * @returns True if PDF type
 */
export function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}

/**
 * Get color variant for file type badge
 *
 * @param mimeType - MIME type
 * @returns Color variant string
 */
export function getFileTypeBadgeColor(
  mimeType: string
): 'blue' | 'green' | 'purple' | 'gray' {
  if (mimeType === 'application/pdf') return 'blue'
  if (mimeType.startsWith('image/')) return 'green'
  if (mimeType === 'message/rfc822') return 'purple'
  return 'gray'
}
