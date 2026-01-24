/**
 * Tests for file validation utilities
 */

import {
  validateFile,
  validateFileSize,
  validateFileType,
  validateFiles,
  getFileExtension,
  isAcceptedMimeType,
  isAcceptedExtension,
  formatFileSize,
  getValidationErrorMessage,
  MAX_FILE_SIZE_BYTES,
  ACCEPTED_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
} from '@/lib/utils/file-validation';

// Helper to create mock File objects
function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  const content = new ArrayBuffer(size);
  return new File([content], name, { type });
}

describe('File Validation', () => {
  describe('validateFile', () => {
    it('should accept valid PDF files', () => {
      const file = createMockFile('statement.pdf', 1024 * 1024, 'application/pdf');
      const result = validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid PNG files', () => {
      const file = createMockFile('screenshot.png', 500 * 1024, 'image/png');
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept valid JPG files', () => {
      const file = createMockFile('photo.jpg', 500 * 1024, 'image/jpeg');
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept valid JPEG files', () => {
      const file = createMockFile('photo.jpeg', 500 * 1024, 'image/jpeg');
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept valid HEIC files', () => {
      const file = createMockFile('photo.heic', 500 * 1024, 'image/heic');
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept HEIC files with empty MIME type (browser quirk)', () => {
      // Some browsers don't recognize HEIC MIME type
      const file = createMockFile('photo.heic', 500 * 1024, '');
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should reject files exceeding 10MB', () => {
      const file = createMockFile('large.pdf', 11 * 1024 * 1024, 'application/pdf');
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('file-too-large');
    });

    it('should reject unsupported file types', () => {
      const file = createMockFile('document.docx', 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('file-invalid-type');
    });

    it('should reject executable files', () => {
      const file = createMockFile('malware.exe', 1024, 'application/x-msdownload');
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('file-invalid-type');
    });

    it('should reject empty files', () => {
      const file = createMockFile('empty.pdf', 0, 'application/pdf');
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('file-empty');
    });

    it('should handle files at exactly 10MB limit', () => {
      const file = createMockFile('exact.pdf', MAX_FILE_SIZE_BYTES, 'application/pdf');
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should reject files just over 10MB limit', () => {
      const file = createMockFile('over.pdf', MAX_FILE_SIZE_BYTES + 1, 'application/pdf');
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('file-too-large');
    });
  });

  describe('validateFileSize', () => {
    it('should accept files under the size limit', () => {
      const file = createMockFile('small.pdf', 1024, 'application/pdf');
      const result = validateFileSize(file);
      expect(result.valid).toBe(true);
    });

    it('should reject empty files', () => {
      const file = createMockFile('empty.pdf', 0, 'application/pdf');
      const result = validateFileSize(file);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('file-empty');
    });

    it('should reject files over the size limit', () => {
      const file = createMockFile('large.pdf', MAX_FILE_SIZE_BYTES + 1, 'application/pdf');
      const result = validateFileSize(file);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('file-too-large');
    });
  });

  describe('validateFileType', () => {
    it('should accept PDF files', () => {
      const file = createMockFile('doc.pdf', 1024, 'application/pdf');
      const result = validateFileType(file);
      expect(result.valid).toBe(true);
    });

    it('should accept PNG files', () => {
      const file = createMockFile('image.png', 1024, 'image/png');
      const result = validateFileType(file);
      expect(result.valid).toBe(true);
    });

    it('should accept JPEG files', () => {
      const file = createMockFile('image.jpg', 1024, 'image/jpeg');
      const result = validateFileType(file);
      expect(result.valid).toBe(true);
    });

    it('should accept HEIC files', () => {
      const file = createMockFile('image.heic', 1024, 'image/heic');
      const result = validateFileType(file);
      expect(result.valid).toBe(true);
    });

    it('should accept files with valid extension but unknown MIME type', () => {
      // Some browsers report application/octet-stream for unknown types
      const file = createMockFile('statement.pdf', 1024, 'application/octet-stream');
      const result = validateFileType(file);
      expect(result.valid).toBe(true);
    });

    it('should reject text files', () => {
      const file = createMockFile('notes.txt', 1024, 'text/plain');
      const result = validateFileType(file);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('file-invalid-type');
    });

    it('should reject ZIP files', () => {
      const file = createMockFile('archive.zip', 1024, 'application/zip');
      const result = validateFileType(file);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('file-invalid-type');
    });
  });

  describe('validateFiles', () => {
    it('should validate multiple files', () => {
      const files = [
        createMockFile('doc1.pdf', 1024, 'application/pdf'),
        createMockFile('doc2.pdf', 1024, 'application/pdf'),
      ];
      const results = validateFiles(files);

      expect(results.size).toBe(2);
      expect(results.get('doc1.pdf')?.valid).toBe(true);
      expect(results.get('doc2.pdf')?.valid).toBe(true);
    });

    it('should identify invalid files in batch', () => {
      const files = [
        createMockFile('valid.pdf', 1024, 'application/pdf'),
        createMockFile('invalid.exe', 1024, 'application/x-msdownload'),
        createMockFile('toolarge.pdf', 15 * 1024 * 1024, 'application/pdf'),
      ];
      const results = validateFiles(files);

      expect(results.get('valid.pdf')?.valid).toBe(true);
      expect(results.get('invalid.exe')?.valid).toBe(false);
      expect(results.get('toolarge.pdf')?.valid).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('should extract extension from simple filename', () => {
      expect(getFileExtension('document.pdf')).toBe('.pdf');
    });

    it('should extract extension from filename with multiple dots', () => {
      expect(getFileExtension('my.document.v2.pdf')).toBe('.pdf');
    });

    it('should return lowercase extension', () => {
      expect(getFileExtension('document.PDF')).toBe('.pdf');
      expect(getFileExtension('image.PNG')).toBe('.png');
    });

    it('should return empty string for files without extension', () => {
      expect(getFileExtension('document')).toBe('');
    });

    it('should handle dotfiles (returns the full name as extension)', () => {
      // Dotfiles like .gitignore are treated as having the whole name as extension
      // This is fine because they'll fail validation anyway
      expect(getFileExtension('.gitignore')).toBe('.gitignore');
    });

    it('should handle trailing dot', () => {
      expect(getFileExtension('document.')).toBe('');
    });
  });

  describe('isAcceptedMimeType', () => {
    it('should accept application/pdf', () => {
      expect(isAcceptedMimeType('application/pdf')).toBe(true);
    });

    it('should accept image/png', () => {
      expect(isAcceptedMimeType('image/png')).toBe(true);
    });

    it('should accept image/jpeg', () => {
      expect(isAcceptedMimeType('image/jpeg')).toBe(true);
    });

    it('should accept image/jpg as variant', () => {
      expect(isAcceptedMimeType('image/jpg')).toBe(true);
    });

    it('should accept image/heic', () => {
      expect(isAcceptedMimeType('image/heic')).toBe(true);
    });

    it('should reject text/plain', () => {
      expect(isAcceptedMimeType('text/plain')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isAcceptedMimeType('')).toBe(false);
    });
  });

  describe('isAcceptedExtension', () => {
    it('should accept .pdf', () => {
      expect(isAcceptedExtension('.pdf')).toBe(true);
      expect(isAcceptedExtension('pdf')).toBe(true);
    });

    it('should accept .png', () => {
      expect(isAcceptedExtension('.png')).toBe(true);
    });

    it('should accept .jpg and .jpeg', () => {
      expect(isAcceptedExtension('.jpg')).toBe(true);
      expect(isAcceptedExtension('.jpeg')).toBe(true);
    });

    it('should accept .heic', () => {
      expect(isAcceptedExtension('.heic')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isAcceptedExtension('.PDF')).toBe(true);
      expect(isAcceptedExtension('.PNG')).toBe(true);
    });

    it('should reject unsupported extensions', () => {
      expect(isAcceptedExtension('.txt')).toBe(false);
      expect(isAcceptedExtension('.exe')).toBe(false);
      expect(isAcceptedExtension('.docx')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isAcceptedExtension('')).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1024 * 500)).toBe('500.0 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(1024 * 1024 * 5.5)).toBe('5.5 MB');
      expect(formatFileSize(1024 * 1024 * 10)).toBe('10.0 MB');
    });

    it('should handle negative values', () => {
      expect(formatFileSize(-1)).toBe('0 B');
    });
  });

  describe('getValidationErrorMessage', () => {
    it('should return correct message for file-too-large', () => {
      const message = getValidationErrorMessage('file-too-large');
      expect(message).toContain('10MB');
      expect(message).toContain('exceeds');
    });

    it('should return correct message for file-invalid-type', () => {
      const message = getValidationErrorMessage('file-invalid-type');
      expect(message).toContain('Invalid file type');
      expect(message).toContain('PDF');
    });

    it('should return correct message for file-empty', () => {
      const message = getValidationErrorMessage('file-empty');
      expect(message).toContain('empty');
    });

    it('should return correct message for file-name-missing', () => {
      const message = getValidationErrorMessage('file-name-missing');
      expect(message).toContain('name');
    });
  });

  describe('Constants', () => {
    it('should have MAX_FILE_SIZE_BYTES set to 10MB', () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
    });

    it('should have all required extensions', () => {
      expect(ACCEPTED_EXTENSIONS).toContain('.pdf');
      expect(ACCEPTED_EXTENSIONS).toContain('.png');
      expect(ACCEPTED_EXTENSIONS).toContain('.jpg');
      expect(ACCEPTED_EXTENSIONS).toContain('.jpeg');
      expect(ACCEPTED_EXTENSIONS).toContain('.heic');
    });

    it('should have all required MIME types', () => {
      expect(ACCEPTED_MIME_TYPES).toHaveProperty('application/pdf');
      expect(ACCEPTED_MIME_TYPES).toHaveProperty('image/png');
      expect(ACCEPTED_MIME_TYPES).toHaveProperty('image/jpeg');
      expect(ACCEPTED_MIME_TYPES).toHaveProperty('image/heic');
    });
  });
});
