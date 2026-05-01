/**
 * Email Attachment Processor
 *
 * Downloads PDF attachments from synced emails over an open IMAP connection,
 * uploads the bytes to the `email-attachments` storage bucket, runs PDF text
 * extraction, and persists the results to `email_attachments`.
 *
 * Designed to run inline with `EmailSyncService.syncFolder` so we can reuse
 * the already-open IMAP connection; the IMAP client is passed in.
 */

import type { ImapFlow } from 'imapflow';
import { createServiceRoleClient } from '../supabase/server';
import { extractPDFText, isValidPDF } from '../statements/pdf-extractor';

const ATTACHMENT_BUCKET = 'email-attachments';
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB, matches storage bucket limit

export interface AttachmentNode {
  partId: string;
  filename: string;
  contentType: string;
  size: number;
}

interface BodyStructureLike {
  part?: string;
  type?: string;
  disposition?: string;
  dispositionParameters?: Record<string, string>;
  parameters?: Record<string, string>;
  size?: number;
  childNodes?: BodyStructureLike[];
}

/**
 * Walk a bodyStructure and collect all PDF attachment nodes (regardless of
 * disposition — some clients send PDFs as inline parts).
 */
export function collectPdfAttachments(bodyStructure: unknown): AttachmentNode[] {
  const nodes: AttachmentNode[] = [];
  const stack: BodyStructureLike[] = [];

  if (bodyStructure && typeof bodyStructure === 'object') {
    stack.push(bodyStructure as BodyStructureLike);
  }

  while (stack.length > 0) {
    const node = stack.pop()!;

    // Recurse into multipart children
    if (Array.isArray(node.childNodes)) {
      for (const child of node.childNodes) stack.push(child);
    }

    if (!node.part) continue;

    const contentType = (node.type || '').toLowerCase();
    const isPdf =
      contentType === 'application/pdf' ||
      contentType === 'application/x-pdf' ||
      contentType === 'application/octet-stream';

    if (!isPdf) continue;

    const filename =
      node.dispositionParameters?.filename ||
      node.parameters?.name ||
      'attachment.pdf';

    // For octet-stream, only accept it if the filename looks like a PDF.
    if (
      contentType === 'application/octet-stream' &&
      !/\.pdf$/i.test(filename)
    ) {
      continue;
    }

    nodes.push({
      partId: node.part,
      filename,
      contentType: node.type || 'application/pdf',
      size: typeof node.size === 'number' ? node.size : 0,
    });
  }

  return nodes;
}

/**
 * Read an imapflow download stream into a Buffer.
 */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks);
}

export interface ProcessAttachmentsForEmailOptions {
  client: ImapFlow;
  userId: string;
  emailId: string;
  uid: number;
  bodyStructure: unknown;
}

export interface AttachmentProcessingSummary {
  attempted: number;
  extracted: number;
  failed: number;
  skipped: number;
}

/**
 * Process all PDF attachments for a single email. Persists rows to
 * `email_attachments` with extraction results. Errors are caught per-attachment
 * so one bad PDF doesn't break the whole sync.
 */
export async function processAttachmentsForEmail({
  client,
  userId,
  emailId,
  uid,
  bodyStructure,
}: ProcessAttachmentsForEmailOptions): Promise<AttachmentProcessingSummary> {
  const summary: AttachmentProcessingSummary = {
    attempted: 0,
    extracted: 0,
    failed: 0,
    skipped: 0,
  };

  const attachments = collectPdfAttachments(bodyStructure);
  if (attachments.length === 0) return summary;

  const supabase = createServiceRoleClient();

  for (const attachment of attachments) {
    summary.attempted++;

    // Skip overly large attachments — Storage will reject them anyway.
    if (attachment.size && attachment.size > MAX_ATTACHMENT_BYTES) {
      await supabase.from('email_attachments').upsert(
        {
          user_id: userId,
          email_id: emailId,
          filename: attachment.filename,
          content_type: attachment.contentType,
          size_bytes: attachment.size,
          imap_part_id: attachment.partId,
          extraction_status: 'skipped',
          extraction_error: `Attachment too large (${attachment.size} bytes > ${MAX_ATTACHMENT_BYTES})`,
        },
        { onConflict: 'email_id,imap_part_id', ignoreDuplicates: true }
      );
      summary.skipped++;
      continue;
    }

    try {
      // 1. Download bytes from IMAP
      const downloaded = await client.download(uid.toString(), attachment.partId, {
        uid: true,
        maxBytes: MAX_ATTACHMENT_BYTES,
      });
      const buffer = await streamToBuffer(downloaded.content);

      if (!isValidPDF(buffer)) {
        await supabase.from('email_attachments').upsert(
          {
            user_id: userId,
            email_id: emailId,
            filename: attachment.filename,
            content_type: attachment.contentType,
            size_bytes: buffer.length,
            imap_part_id: attachment.partId,
            extraction_status: 'skipped',
            extraction_error: 'Not a valid PDF (magic number missing)',
          },
          { onConflict: 'email_id,imap_part_id', ignoreDuplicates: true }
        );
        summary.skipped++;
        continue;
      }

      // 2. Insert pending row to get an attachment id (used for the storage path).
      const { data: inserted, error: insertError } = await supabase
        .from('email_attachments')
        .insert({
          user_id: userId,
          email_id: emailId,
          filename: attachment.filename,
          content_type: attachment.contentType,
          size_bytes: buffer.length,
          imap_part_id: attachment.partId,
          extraction_status: 'pending',
        })
        .select('id')
        .single();

      if (insertError || !inserted) {
        // Most likely a duplicate (unique on email_id + imap_part_id).
        // Skip silently; row already exists from a prior run.
        if (insertError && insertError.code !== '23505') {
          console.error('email_attachments insert error', insertError);
          summary.failed++;
        } else {
          summary.skipped++;
        }
        continue;
      }

      const storagePath = `${userId}/${emailId}/${inserted.id}.pdf`;

      // 3. Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(storagePath, buffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        await supabase
          .from('email_attachments')
          .update({
            extraction_status: 'failed',
            extraction_error: `Storage upload failed: ${uploadError.message}`,
          })
          .eq('id', inserted.id);
        summary.failed++;
        continue;
      }

      // 4. Extract text
      const extraction = await extractPDFText(buffer);

      if (!extraction.success) {
        await supabase
          .from('email_attachments')
          .update({
            storage_path: storagePath,
            extraction_status: 'failed',
            extraction_error: extraction.errors.join('; ') || 'Unknown extraction error',
          })
          .eq('id', inserted.id);
        summary.failed++;
        continue;
      }

      await supabase
        .from('email_attachments')
        .update({
          storage_path: storagePath,
          extraction_status: 'extracted',
          extracted_text: extraction.text,
          page_count: extraction.pageCount,
          pdf_metadata: extraction.metadata ?? null,
          extracted_at: new Date().toISOString(),
        })
        .eq('id', inserted.id);

      summary.extracted++;
    } catch (error) {
      console.error(
        `Attachment processing failed for email ${emailId} part ${attachment.partId}:`,
        error
      );
      // Best-effort: record the failure so we don't keep retrying it.
      await supabase.from('email_attachments').upsert(
        {
          user_id: userId,
          email_id: emailId,
          filename: attachment.filename,
          content_type: attachment.contentType,
          size_bytes: attachment.size,
          imap_part_id: attachment.partId,
          extraction_status: 'failed',
          extraction_error: error instanceof Error ? error.message : String(error),
        },
        { onConflict: 'email_id,imap_part_id', ignoreDuplicates: true }
      );
      summary.failed++;
    }
  }

  return summary;
}
