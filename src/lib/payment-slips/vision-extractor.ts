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
Extract all transaction data into the JSON schema below.

There are two bank formats:

**KBank (K PLUS / K+)**:
- Title: "โอนเงินสำเร็จ" with K+ logo
- Date is in Thai Buddhist Era (BE) — subtract 543 from the year to get CE. Example: "8 มี.ค. 69" means March 8, 2569 BE = March 8, 2026 CE. The "69" is short for 2569.
- Thai month abbreviations: ม.ค.=Jan, ก.พ.=Feb, มี.ค.=Mar, เม.ย.=Apr, พ.ค.=May, มิ.ย.=Jun, ก.ค.=Jul, ส.ค.=Aug, ก.ย.=Sep, ต.ค.=Oct, พ.ย.=Nov, ธ.ค.=Dec
- Time format: "21:22 น."
- Sender at top, arrow pointing down to recipient
- Bank shown as "ธ.กสิกรไทย" (Kasikorn Bank)
- Transaction ref: "เลขที่รายการ:"
- Amount: "จำนวน:" in "บาท" (Baht)
- Fee: "ค่าธรรมเนียม:"
- Memo: "บันทึกช่วยจำ:"

**Bangkok Bank**:
- Header: "Bangkok Bank" logo, "Transaction successful"
- Date in Western format: "14 Mar 26, 21:04" (2-digit year, already CE)
- Amount displayed prominently with "THB"
- From/To sections with name, account, bank
- May show "PromptPay" as transfer type
- Fee, Note (optional), Bank reference no., Transaction reference

Return ONLY valid JSON matching this schema:
{
  "bank_detected": "kbank" | "bangkok_bank" | "unknown",
  "date": "YYYY-MM-DD",
  "date_raw": "<exact date string as shown on the slip, e.g. '20 ต.ค. 69' or '14 Mar 26'>",
  "time": "HH:MM" | null,
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
- CRITICAL for amount: Read the EXACT digits and decimal point from the slip. The amount "117.00 บาท" means 117.00, NOT 11700. Thai slips use a period (.) as the decimal separator — for example "1,500.00" means 1500.00 and "117.00" means 117.00. Pay very careful attention to commas (thousands separator) vs periods (decimal point). Also provide the raw amount string exactly as shown on the slip.
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

  return {
    extraction,
    promptTokens: result.usage?.input_tokens ?? 0,
    responseTokens: result.usage?.output_tokens ?? 0,
    durationMs,
  }
}
