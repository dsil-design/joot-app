/**
 * Types for iCloud email integration
 */

/**
 * Email metadata stored in the database
 */
export interface EmailMetadata {
  id: string;
  user_id: string;
  message_id: string;
  uid: number;
  folder: string;
  subject: string | null;
  from_address: string | null;
  from_name: string | null;
  date: string | null;
  seen: boolean;
  has_attachments: boolean;
  text_body: string | null;
  html_body: string | null;
  synced_at: string;
  created_at: string;
}

/**
 * Email data for insertion (without server-generated fields)
 */
export interface EmailInsertData {
  user_id: string;
  message_id: string;
  uid: number;
  folder: string;
  subject: string | null;
  from_address: string | null;
  from_name: string | null;
  date: string | null;
  seen: boolean;
  has_attachments: boolean;
  text_body?: string | null;
  html_body?: string | null;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  success: boolean;
  synced: number;
  errors: number;
  lastUid: number;
  message?: string;
}

/**
 * Email content fetched on-demand (for future use)
 */
export interface EmailContent {
  uid: number;
  subject: string | null;
  from: {
    address: string | null;
    name: string | null;
  };
  date: Date | null;
  text: string | null;
  html: string | null;
  attachments: EmailAttachment[];
}

/**
 * Email attachment metadata
 */
export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  /** IMAP MIME part ID (e.g. "2", "2.1") used to fetch the attachment content */
  imapPartId?: string;
}

/**
 * A row from the email_attachments table (subset used by extraction).
 */
export interface EmailAttachmentRecord {
  id: string;
  email_id: string;
  filename: string;
  content_type: string | null;
  storage_path: string | null;
  extraction_status: 'pending' | 'extracted' | 'failed' | 'skipped';
  extracted_text: string | null;
  page_count: number | null;
}

/**
 * IMAP connection configuration
 */
export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

/**
 * Email sync state from database
 */
export interface SyncState {
  id: string;
  user_id: string;
  folder: string;
  last_uid: number;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}
