/**
 * Payment Slip Vision Extractor
 *
 * Uses Claude Vision API to extract structured transaction data
 * from Thai bank payment slip images (KBank K PLUS, Bangkok Bank).
 */

import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/email/ai-client'
import type { PaymentSlipExtraction } from './types'

const VISION_TIMEOUT_MS = 60000

const EXTRACTION_PROMPT = `You are analyzing a Thai bank payment slip (transfer receipt) image.

IMPORTANT — Read amounts carefully using this 2-step process:
1. Find the text next to "จำนวน:" (KBank) or the prominent amount (Bangkok Bank)
2. Read each character one by one, including periods (.) and commas (,)
   - Period (.) is a DECIMAL separator: "117.00" means one hundred seventeen baht
   - Comma (,) is a THOUSANDS separator: "1,500.00" means one thousand five hundred baht
   - Thai bank slips ALWAYS show exactly 2 decimal places
   - Example: if you see the characters 1 1 7 . 0 0 next to "บาท", the amount is 117.00

There are two bank formats:

**KBank (K PLUS / K+)**:
- Title: "โอนเงินสำเร็จ" with K+ logo
- Date is in Thai Buddhist Era (BE) — subtract 543 from the year to get CE. Example: "8 มี.ค. 69" means March 8, 2569 BE = March 8, 2026 CE. The "69" is short for 2569.
- Thai month abbreviations: ม.ค.=Jan, ก.พ.=Feb, มี.ค.=Mar, เม.ย.=Apr, พ.ค.=May, มิ.ย.=Jun, ก.ค.=Jul, ส.ค.=Aug, ก.ย.=Sep, ต.ค.=Oct, พ.ย.=Nov, ธ.ค.=Dec
- Time format: "21:22 น."
- Sender at top, arrow pointing down to recipient
- Bank shown as "ธ.กสิกรไทย" (Kasikorn Bank)
- Transaction ref: "เลขที่รายการ:"
- Amount: "จำนวน:" — read the number carefully including the decimal point. It is ALWAYS formatted as X.XX or X,XXX.XX
- Fee: "ค่าธรรมเนียม:" — also always has 2 decimal places
- Memo: "บันทึกช่วยจำ:"

**Bangkok Bank**:
- Header: "Bangkok Bank" logo, "Transaction successful"
- Date in Western format: "14 Mar 26, 21:04" (2-digit year, already CE)
- Amount displayed prominently with "THB"
- From/To sections with name, account, bank
- May show "PromptPay" as transfer type
- Fee, Note (optional), Bank reference no., Transaction reference

First, write out your character-by-character reading of the amount inside an "amount_characters" field (e.g. "1,5,0,0,.,0,0" for 1500.00 or "1,1,7,.,0,0" for 117.00), then provide the numeric value.

Return ONLY valid JSON matching this schema:
{
  "bank_detected": "kbank" | "bangkok_bank" | "unknown",
  "date": "YYYY-MM-DD",
  "date_raw": "<exact date string as shown on the slip, e.g. '20 ต.ค. 69' or '14 Mar 26'>",
  "time": "HH:MM" | null,
  "amount_characters": "<each character of the amount separated by commas, e.g. '1,1,7,.,0,0' or '1,COMMA,5,0,0,.,0,0'>",
  "amount": <number>,
  "amount_raw": "<exact amount string as displayed on slip, e.g. '117.00' or '1,500.00'>",
  "fee": <number>,
  "currency": "THB",
  "sender_name": "<full name as shown>",
  "sender_bank": "<bank name in English>",
  "sender_account": "<masked account as shown>",
  "recipient_name": "<full name as shown>",
  "recipient_bank": "<bank name in English or PromptPay>",
  "recipient_account": "<masked account or phone as shown>",
  "transaction_reference": "<reference number>",
  "bank_reference": "<bank ref number if shown, else null>",
  "memo": "<memo/note text if present, else null>",
  "transfer_type": "promptpay" | "direct" | "unknown"
}

Important:
- date_raw: Copy the EXACT date text from the slip — do not modify or translate it
- date: Convert Thai BE dates to CE (Western calendar). Double-check the Thai month abbreviation carefully: ก.ย.=Sep, ต.ค.=Oct — these are commonly confused
- Convert Thai bank names to English: ธ.กสิกรไทย = "Kasikorn Bank", ธ.กรุงเทพ = "Bangkok Bank"
- Amount and fee must be numbers (no currency symbols)
- amount_characters: List each visible character of the amount one by one. Use "COMMA" for the comma character to avoid ambiguity with the separator. This forces careful reading of each digit and punctuation mark.
- amount_raw: The exact string as displayed (e.g. "117.00" or "1,500.00")
- amount: The numeric value parsed from amount_raw. "117.00" → 117, "1,500.00" → 1500
- Return ONLY the JSON object, no markdown`

export interface VisionExtractionResult {
  extraction: PaymentSlipExtraction
  promptTokens: number
  responseTokens: number
  durationMs: number
}

/**
 * Extract transaction data from a payment slip image using Claude Vision.
 */
export async function extractFromPaymentSlip(
  imageBase64: string,
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'
): Promise<VisionExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const client = new Anthropic({ apiKey, timeout: VISION_TIMEOUT_MS })

  const startTime = Date.now()
  const result = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  })
  const durationMs = Date.now() - startTime

  const textBlock = result.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in Claude Vision response')
  }

  // Strip markdown code fences if present
  let text = textBlock.text.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }

  const extraction = JSON.parse(text) as PaymentSlipExtraction

  // Cross-check: parse amount_characters to derive the real amount.
  // The character-by-character reading is more reliable than the model's
  // direct numeric interpretation, since it forces careful OCR of each glyph.
  const amountChars = (extraction as Record<string, unknown>).amount_characters
  if (typeof amountChars === 'string' && amountChars.length > 0) {
    // Reconstruct the number: "1,1,7,.,0,0" → "117.00", "1,COMMA,5,0,0,.,0,0" → "1,500.00"
    const reconstructed = amountChars
      .split(',')
      .map(c => c.trim())
      .map(c => c === 'COMMA' ? ',' : c)
      .join('')
    const parsed = parseFloat(reconstructed.replace(/,/g, ''))
    if (!isNaN(parsed) && parsed > 0 && Math.abs(parsed - extraction.amount) > 0.01) {
      extraction.amount = parsed
      extraction.amount_raw = reconstructed
    }
  }

  return {
    extraction,
    promptTokens: result.usage?.input_tokens ?? 0,
    responseTokens: result.usage?.output_tokens ?? 0,
    durationMs,
  }
}
