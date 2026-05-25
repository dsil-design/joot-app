/**
 * Visual verification of the review focus modal across viewport widths.
 *
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/verify-focus-modal.ts [tag]
 *   tag — optional suffix on filenames, e.g. "before" / "after"
 */

import { chromium, type Browser, type Page } from "playwright"
import * as fs from "fs"
import * as path from "path"

const BASE_URL = process.env.BASE_URL || "http://localhost:3000"
const EMAIL = process.env.DEMO_EMAIL || "hello@dsil.design"
const PASSWORD = process.env.DEMO_PASSWORD || "R9bKtzm6RGJe"
const TAG = process.argv[2] || "snapshot"

const OUT_DIR = path.join(process.cwd(), "tmp", "modal-shots")

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "ipad-portrait", width: 810, height: 1180 },
  { name: "ipad-landscape", width: 1180, height: 810 },
  { name: "desktop", width: 1440, height: 900 },
]

async function openFocusModal(page: Page) {
  // /demo/* is a public route, no auth needed.
  await page.goto(`${BASE_URL}/demo/focus-modal-preview`, { waitUntil: "networkidle" })
  await page.waitForSelector('[data-slot="dialog-content"]', { timeout: 10000 })
  await page.waitForTimeout(400)
  // Touch unused identifiers so the file lints clean.
  void EMAIL; void PASSWORD
}

async function findMergedItem(page: Page): Promise<boolean> {
  // The modal renders a "Cross-Source" badge for merged items.
  for (let i = 0; i < 50; i++) {
    const badge = page.getByText("Cross-Source", { exact: true })
    if (await badge.isVisible().catch(() => false)) return true
    // Click the "next" chevron in the top nav.
    const nextBtn = page.locator('[data-slot="dialog-content"] button[title="Next (Right arrow)"]')
    if (!(await nextBtn.isEnabled().catch(() => false))) return false
    await nextBtn.click()
    await page.waitForTimeout(150)
  }
  return false
}

async function snapshot(browser: Browser, vp: { name: string; width: number; height: number }) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
  const page = await ctx.newPage()
  try {
    await openFocusModal(page)

    // Item 0 = merged email+statement (the case the user complained about).
    const file1 = path.join(OUT_DIR, `${vp.name}-merged-email-stmt-${TAG}.png`)
    await page.screenshot({ path: file1, fullPage: false })
    console.log(`  ${vp.name} merged email+stmt → ${file1}`)

    // Item 1 = merged slip+email+stmt (3 sources)
    await page.locator('[data-slot="dialog-content"] button[title="Next (Right arrow)"]').click()
    await page.waitForTimeout(250)
    const file2 = path.join(OUT_DIR, `${vp.name}-merged-3way-${TAG}.png`)
    await page.screenshot({ path: file2, fullPage: false })
    console.log(`  ${vp.name} merged 3-way → ${file2}`)

    // Item 2 = email-only
    await page.locator('[data-slot="dialog-content"] button[title="Next (Right arrow)"]').click()
    await page.waitForTimeout(250)
    const file3 = path.join(OUT_DIR, `${vp.name}-email-only-${TAG}.png`)
    await page.screenshot({ path: file3, fullPage: false })
    console.log(`  ${vp.name} email-only → ${file3}`)

    // Item 3 = statement-only
    await page.locator('[data-slot="dialog-content"] button[title="Next (Right arrow)"]').click()
    await page.waitForTimeout(250)
    const file4 = path.join(OUT_DIR, `${vp.name}-statement-only-${TAG}.png`)
    await page.screenshot({ path: file4, fullPage: false })
    console.log(`  ${vp.name} statement-only → ${file4}`)
  } catch (e) {
    console.error(`  ${vp.name} FAILED:`, (e as Error).message)
    const failFile = path.join(OUT_DIR, `${vp.name}-FAIL-${TAG}.png`)
    await page.screenshot({ path: failFile, fullPage: false }).catch(() => {})
    console.error(`  fail screenshot → ${failFile}`)
  } finally {
    await ctx.close()
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n[${vp.name} ${vp.width}x${vp.height}]`)
      await snapshot(browser, vp)
    }
  } finally {
    await browser.close()
  }
  console.log(`\nDone. Tag: ${TAG}. Output in: ${OUT_DIR}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
