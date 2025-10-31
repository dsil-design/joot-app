/**
 * Vendor Enrichment Service
 *
 * Enriches vendor data with logos and normalized names
 * Uses DuckDuckGo Favicons API (free, no API key required)
 */

import { createClient } from '@/lib/supabase/server'

export interface VendorEnrichmentResult {
  success: boolean
  vendorName: string
  normalizedName: string
  logoUrl: string | null
  domain: string | null
  error?: string
}

/**
 * Normalize vendor name for consistency
 *
 * Removes common suffixes, normalizes case, etc.
 */
export function normalizeVendorName(name: string): string {
  let normalized = name.trim()

  // Remove common business suffixes
  const suffixes = [
    /\s+(Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company|Co\.?)$/i,
    /\s+Restaurant$/i,
    /\s+Store$/i,
    /\s+Shop$/i,
  ]

  for (const suffix of suffixes) {
    normalized = normalized.replace(suffix, '')
  }

  // Normalize case: Title Case
  normalized = normalized
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return normalized.trim()
}

/**
 * Extract potential domain from vendor name
 *
 * Attempts to guess the domain for common vendors
 */
function guessDomain(vendorName: string): string | null {
  const normalized = vendorName.toLowerCase().trim()

  // Common vendor mappings
  const domainMappings: Record<string, string> = {
    'starbucks': 'starbucks.com',
    'mcdonalds': 'mcdonalds.com',
    'walmart': 'walmart.com',
    'target': 'target.com',
    'amazon': 'amazon.com',
    'whole foods': 'wholefoodsmarket.com',
    'shell': 'shell.com',
    'chevron': 'chevron.com',
    'safeway': 'safeway.com',
    'cvs': 'cvs.com',
    'walgreens': 'walgreens.com',
    'best buy': 'bestbuy.com',
    'apple': 'apple.com',
    'microsoft': 'microsoft.com',
    'google': 'google.com',
    'uber': 'uber.com',
    'lyft': 'lyft.com',
    'netflix': 'netflix.com',
    'spotify': 'spotify.com',
  }

  // Check exact matches first
  if (domainMappings[normalized]) {
    return domainMappings[normalized]
  }

  // Check partial matches
  for (const [key, domain] of Object.entries(domainMappings)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return domain
    }
  }

  // Try to construct domain from name
  // Remove spaces and special characters
  const cleanName = normalized.replace(/[^a-z0-9]/g, '')
  if (cleanName.length > 2) {
    return `${cleanName}.com`
  }

  return null
}

/**
 * Fetch vendor logo from DuckDuckGo Favicons
 *
 * Free service, no API key required
 * Returns 32x32 favicon
 *
 * @param domain - Vendor domain (e.g., 'starbucks.com')
 * @returns Logo URL or null
 */
function getDuckDuckGoFaviconUrl(domain: string): string {
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`
}

/**
 * Verify logo URL is accessible
 *
 * @param url - Logo URL to verify
 * @returns True if accessible
 */
async function verifyLogoUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Upload logo to Supabase storage
 *
 * @param logoUrl - External logo URL
 * @param vendorId - Vendor profile ID
 * @returns Storage path or null
 */
async function uploadLogoToStorage(
  logoUrl: string,
  vendorId: string
): Promise<string | null> {
  try {
    const supabase = await createClient()

    // Fetch logo
    const response = await fetch(logoUrl)
    if (!response.ok) return null

    const blob = await response.blob()
    const buffer = Buffer.from(await blob.arrayBuffer())

    // Upload to vendor-logos bucket
    const storagePath = `${vendorId}.png`
    const { error } = await supabase.storage
      .from('vendor-logos')
      .upload(storagePath, buffer, {
        contentType: 'image/png',
        upsert: true,
      })

    if (error) {
      console.error('Failed to upload logo to storage:', error)
      return null
    }

    return storagePath
  } catch (error) {
    console.error('Error uploading logo:', error)
    return null
  }
}

/**
 * Get public URL for vendor logo
 *
 * @param storagePath - Path in vendor-logos bucket
 * @returns Public URL
 */
export function getVendorLogoUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${supabaseUrl}/storage/v1/object/public/vendor-logos/${storagePath}`
}

/**
 * Enrich vendor with logo and normalized name
 *
 * @param vendorName - Raw vendor name from extraction
 * @param userId - User ID
 * @returns Enrichment result with logo URL
 *
 * @example
 * const result = await enrichVendor('STARBUCKS COFFEE', userId)
 * if (result.success && result.logoUrl) {
 *   console.log('Logo:', result.logoUrl)
 * }
 */
export async function enrichVendor(
  vendorName: string,
  userId: string
): Promise<VendorEnrichmentResult> {
  try {
    if (!vendorName || vendorName.trim().length === 0) {
      return {
        success: false,
        vendorName,
        normalizedName: '',
        logoUrl: null,
        domain: null,
        error: 'Vendor name is empty',
      }
    }

    const normalizedName = normalizeVendorName(vendorName)
    const domain = guessDomain(normalizedName)

    if (!domain) {
      return {
        success: true,
        vendorName,
        normalizedName,
        logoUrl: null,
        domain: null,
      }
    }

    // Check if vendor profile already exists
    const supabase = await createClient()
    const { data: existingProfile } = await supabase
      .from('vendor_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('normalized_name', normalizedName)
      .single()

    if (existingProfile && existingProfile.logo_url) {
      // Return existing profile
      return {
        success: true,
        vendorName,
        normalizedName,
        logoUrl: existingProfile.logo_url,
        domain: existingProfile.domain,
      }
    }

    // Fetch logo from DuckDuckGo
    const faviconUrl = getDuckDuckGoFaviconUrl(domain)

    // Verify logo exists
    const isValid = await verifyLogoUrl(faviconUrl)
    if (!isValid) {
      return {
        success: true,
        vendorName,
        normalizedName,
        logoUrl: null,
        domain,
      }
    }

    // Create or update vendor profile
    const vendorId = existingProfile?.id || crypto.randomUUID()
    const storagePath = await uploadLogoToStorage(faviconUrl, vendorId)
    const logoUrl = storagePath ? getVendorLogoUrl(storagePath) : faviconUrl

    if (existingProfile) {
      // Update existing profile
      await supabase
        .from('vendor_profiles')
        .update({
          logo_url: logoUrl,
          domain,
        })
        .eq('id', existingProfile.id)
    } else {
      // Create new profile
      await supabase.from('vendor_profiles').insert({
        id: vendorId,
        user_id: userId,
        name: vendorName,
        normalized_name: normalizedName,
        domain,
        logo_url: logoUrl,
      })
    }

    return {
      success: true,
      vendorName,
      normalizedName,
      logoUrl,
      domain,
    }
  } catch (error) {
    console.error('Vendor enrichment error:', error)
    return {
      success: false,
      vendorName,
      normalizedName: normalizeVendorName(vendorName),
      logoUrl: null,
      domain: null,
      error: error instanceof Error ? error.message : 'Enrichment failed',
    }
  }
}

/**
 * Batch enrich multiple vendors
 *
 * @param vendorNames - Array of vendor names
 * @param userId - User ID
 * @returns Array of enrichment results
 */
export async function batchEnrichVendors(
  vendorNames: string[],
  userId: string
): Promise<VendorEnrichmentResult[]> {
  const results: VendorEnrichmentResult[] = []

  for (const name of vendorNames) {
    const result = await enrichVendor(name, userId)
    results.push(result)

    // Rate limit: 1 request per second to be respectful
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return results
}
