/**
 * Email Parsing Service
 *
 * Parses .eml email files and extracts structured data
 * Handles HTML-to-Markdown conversion for email receipts
 */

import { simpleParser, ParsedMail, Attachment } from 'mailparser'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import * as cheerio from 'cheerio'
import crypto from 'crypto'

export interface EmailMetadata {
  from: string
  to: string
  subject: string
  date: Date | null
  sender_domain: string
  message_id: string
  email_hash: string
}

export interface EmailContent {
  html: string | null
  text: string | null
  structuredText: string
}

export interface EmailAttachment {
  filename: string
  contentType: string
  size: number
  buffer: Buffer
}

export interface EmailParseResult {
  success: boolean
  metadata: EmailMetadata
  content: EmailContent
  attachments: EmailAttachment[]
  hasAttachments: boolean
  isReceiptCandidate: boolean
  detectionScore: number
  error?: string
}

/**
 * Parse .eml file buffer into structured data
 *
 * Uses mailparser for RFC822 compliance
 * Extracts HTML, text, and metadata
 *
 * @param emailBuffer - Raw .eml file buffer
 * @returns Parsed email result with metadata and content
 */
export async function parseEmailFile(
  emailBuffer: Buffer
): Promise<EmailParseResult> {
  try {
    // Use mailparser for proper RFC822 parsing
    const parsed: ParsedMail = await simpleParser(emailBuffer)

    // Extract sender information
    const fromAddress = parsed.from?.value[0]?.address || ''
    const senderDomain = fromAddress.split('@')[1]?.toLowerCase() || ''
    const toAddress = parsed.to?.value[0]?.address || ''

    // Extract metadata
    const metadata: EmailMetadata = {
      from: fromAddress,
      to: toAddress,
      subject: parsed.subject || '',
      date: parsed.date || null,
      sender_domain: senderDomain,
      message_id: parsed.messageId || '',
      email_hash: '', // Will be set below
    }

    // Get HTML and text content
    const htmlContent = parsed.html || null
    const textContent = parsed.text || null

    // Convert HTML to structured Markdown
    let structuredText = ''
    if (htmlContent) {
      structuredText = convertHtmlToStructuredText(
        typeof htmlContent === 'string' ? htmlContent : htmlContent.toString()
      )
    } else if (textContent) {
      structuredText = textContent
    }

    // Generate email hash for deduplication
    metadata.email_hash = generateEmailHash(
      metadata.from,
      metadata.subject,
      metadata.date,
      structuredText
    )

    // Extract attachments
    const emailAttachments: EmailAttachment[] = []
    if (parsed.attachments && parsed.attachments.length > 0) {
      for (const attachment of parsed.attachments) {
        emailAttachments.push({
          filename: attachment.filename || 'unknown',
          contentType: attachment.contentType || 'application/octet-stream',
          size: attachment.size,
          buffer: attachment.content,
        })
      }
    }

    const hasAttachments = emailAttachments.length > 0

    // Detect if this looks like a receipt email
    const { isReceipt, score } = detectReceiptEmail(metadata, structuredText)

    const content: EmailContent = {
      html: typeof htmlContent === 'string' ? htmlContent : htmlContent?.toString() || null,
      text: textContent,
      structuredText,
    }

    return {
      success: true,
      metadata,
      content,
      attachments: emailAttachments,
      hasAttachments,
      isReceiptCandidate: isReceipt,
      detectionScore: score,
    }
  } catch (error) {
    console.error('Email parsing failed:', error)
    return {
      success: false,
      metadata: {
        from: '',
        to: '',
        subject: '',
        date: null,
        sender_domain: '',
        message_id: '',
        email_hash: '',
      },
      content: {
        html: null,
        text: null,
        structuredText: '',
      },
      attachments: [],
      hasAttachments: false,
      isReceiptCandidate: false,
      detectionScore: 0,
      error: error instanceof Error ? error.message : 'Email parsing failed',
    }
  }
}

/**
 * Convert HTML email to structured Markdown text
 *
 * Preserves tables, headers, emphasis for better AI understanding
 * Removes tracking pixels, scripts, and unwanted elements
 *
 * @param html - Raw HTML content
 * @returns Cleaned Markdown text with preserved structure
 */
export function convertHtmlToStructuredText(html: string): string {
  try {
    // Load HTML with cheerio
    const $ = cheerio.load(html)

    // Remove unwanted elements
    $('script, style, noscript').remove()

    // Remove tracking pixels and spacer images
    $('img').each((_, el) => {
      const width = $(el).attr('width')
      const height = $(el).attr('height')
      const src = $(el).attr('src')

      // Remove 1x1 tracking pixels
      if ((width === '1' && height === '1') || (width === '1px' && height === '1px')) {
        $(el).remove()
        return
      }

      // Remove tracking images by URL pattern
      if (src && (
        src.includes('track') ||
        src.includes('pixel') ||
        src.includes('beacon') ||
        src.includes('analytics')
      )) {
        $(el).remove()
        return
      }

      // Remove images with empty alt (likely decorative)
      if (!$(el).attr('alt') || $(el).attr('alt') === '') {
        $(el).remove()
      }
    })

    // Add spacing around important sections for better readability
    $('table').before('\n').after('\n')
    $('h1, h2, h3, h4, h5, h6').before('\n').after('\n')
    $('hr').before('\n').after('\n')

    // Extract cleaned HTML
    const cleanedHtml = $.html()

    // Initialize Turndown service
    const turndownService = new TurndownService({
      headingStyle: 'atx', // Use # style headings
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**',
      bulletListMarker: '-',
    })

    // Add GitHub Flavored Markdown for table support
    turndownService.use(gfm)

    // Custom rule to handle line breaks
    turndownService.addRule('lineBreaks', {
      filter: ['br'],
      replacement: () => '\n',
    })

    // Custom rule to remove empty links
    turndownService.addRule('removeEmptyLinks', {
      filter: (node) => {
        return (
          node.nodeName === 'A' &&
          !node.textContent?.trim() &&
          !node.querySelector('img')
        )
      },
      replacement: () => '',
    })

    // Convert to Markdown
    const markdown = turndownService.turndown(cleanedHtml)

    // Post-process: clean up excessive whitespace
    return markdown
      .replace(/\n{4,}/g, '\n\n\n') // Max 2 blank lines
      .replace(/[ \t]+$/gm, '') // Remove trailing spaces
      .replace(/^\s+$/gm, '') // Remove lines with only whitespace
      .trim()
  } catch (error) {
    console.error('HTML to Markdown conversion failed:', error)
    // Return plain text as fallback
    const $ = cheerio.load(html)
    return $.text()
  }
}

/**
 * Detect if email is likely a receipt/invoice
 *
 * Uses scoring algorithm based on:
 * - Sender domain
 * - Subject line patterns
 * - Content patterns
 * - Negative signals (promotional/spam)
 *
 * @param metadata - Email metadata
 * @param content - Email content (text or structured text)
 * @returns Object with isReceipt boolean and score (0-100)
 */
export function detectReceiptEmail(
  metadata: EmailMetadata,
  content: string
): { isReceipt: boolean; score: number } {
  let score = 0

  // Known receipt sender domains (40 points)
  const knownReceiptDomains = [
    'amazon.com', 'ebay.com', 'shopify.com', 'etsy.com',
    'uber.com', 'lyft.com', 'doordash.com', 'grubhub.com',
    'airbnb.com', 'booking.com', 'expedia.com',
    'netflix.com', 'spotify.com', 'aws.amazon.com',
    'paypal.com', 'stripe.com', 'square.com',
  ]

  const domain = metadata.sender_domain.toLowerCase()
  const hasKnownDomain = knownReceiptDomains.some(known =>
    domain === known || domain.endsWith(`.${known}`)
  )

  if (hasKnownDomain) {
    score += 40
  }

  // Check for billing/invoice/receipt subdomains (30 points)
  if (
    domain.startsWith('billing.') ||
    domain.startsWith('invoice.') ||
    domain.startsWith('receipts.') ||
    domain.startsWith('noreply.') ||
    domain.startsWith('orders.')
  ) {
    score += 30
  }

  // Receipt subject patterns (30 points)
  const receiptSubjectPatterns = [
    /receipt/i,
    /invoice/i,
    /order.*confirmation/i,
    /order.*#?\d+/i,
    /your.*purchase/i,
    /payment.*received/i,
    /payment.*confirmation/i,
    /booking.*confirmation/i,
    /trip.*receipt/i,
    /delivery.*complete/i,
    /thank.*you.*order/i,
    /statement/i,
  ]

  const subject = metadata.subject.toLowerCase()
  const hasReceiptSubject = receiptSubjectPatterns.some(pattern =>
    pattern.test(subject)
  )

  if (hasReceiptSubject) {
    score += 30
  }

  // Promotional/spam patterns (negative 50 points)
  const promotionalPatterns = [
    /unsubscribe/i,
    /sale.*now/i,
    /\d+%.*off/i,
    /limited.*time/i,
    /buy.*now/i,
    /free shipping/i,
    /don't miss out/i,
    /act now/i,
    /exclusive offer/i,
  ]

  const hasPromotional = promotionalPatterns.some(pattern =>
    pattern.test(subject) || pattern.test(content)
  )

  if (hasPromotional) {
    score -= 50
  }

  // Content patterns that suggest receipt (10 points each, max 30)
  const receiptContentPatterns = [
    /total.*\$\d+/i,
    /amount.*\$\d+/i,
    /order.*#?\d{6,}/i,
    /tracking.*number/i,
    /qty|quantity/i,
    /item.*price/i,
    /subtotal/i,
    /payment.*method/i,
    /transaction.*id/i,
    /order.*date/i,
  ]

  const contentLower = content.toLowerCase()
  let contentMatches = 0
  for (const pattern of receiptContentPatterns) {
    if (pattern.test(contentLower)) {
      contentMatches++
      if (contentMatches >= 3) break // Cap at 3 matches
    }
  }

  score += contentMatches * 10

  // Decision threshold: 60 or higher = likely receipt
  const isReceipt = score >= 60

  return { isReceipt, score: Math.max(0, Math.min(100, score)) }
}

/**
 * Generate unique hash for email deduplication
 *
 * Creates SHA-256 hash based on:
 * - Sender email
 * - Subject line
 * - Date
 * - First 500 characters of content
 *
 * @param from - Sender email
 * @param subject - Email subject
 * @param date - Email date
 * @param content - Email content
 * @returns SHA-256 hash string
 */
export function generateEmailHash(
  from: string,
  subject: string,
  date: Date | null,
  content: string
): string {
  const hashInput = [
    from.toLowerCase().trim(),
    subject.toLowerCase().trim(),
    date?.toISOString() || '',
    content.substring(0, 500).trim(), // First 500 chars
  ].join('|')

  return crypto.createHash('sha256').update(hashInput).digest('hex')
}

/**
 * Check if email is likely forwarded
 *
 * @param subject - Email subject
 * @param content - Email content
 * @returns True if email appears to be forwarded
 */
export function isForwardedEmail(subject: string, content: string): boolean {
  // Check for forward indicators in subject
  if (/^(fwd?|forward):/i.test(subject.trim())) {
    return true
  }

  // Check for forward indicators in content
  const forwardPatterns = [
    /forwarded message/i,
    /begin forwarded message/i,
    /---------- forwarded/i,
  ]

  return forwardPatterns.some(pattern => pattern.test(content))
}

/**
 * Extract original sender from forwarded email
 *
 * @param content - Email content
 * @returns Original sender email or null
 */
export function extractOriginalSender(content: string): string | null {
  // Look for "From: email@domain.com" pattern in forwarded content
  const fromMatch = content.match(/^From:\s*(.+@.+)$/m)
  if (fromMatch) {
    return fromMatch[1].trim()
  }

  return null
}
