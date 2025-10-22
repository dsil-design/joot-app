/**
 * Vendor Duplicate Detection Utilities
 *
 * This module provides algorithms for detecting potential duplicate vendors
 * based on name similarity, transaction patterns, and other heuristics.
 */

export interface VendorWithTransactions {
  id: string
  name: string
  transactionCount: number
  totalAmount?: number
  firstTransactionDate?: Date | string
  lastTransactionDate?: Date | string
}

export interface DuplicateSuggestion {
  sourceVendor: VendorWithTransactions
  targetVendor: VendorWithTransactions
  confidence: number
  reasons: string[]
}

/**
 * Calculate Levenshtein distance between two strings
 * This measures how many single-character edits are needed to change one string into another
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = []

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return matrix[len1][len2]
}

/**
 * Calculate similarity percentage based on Levenshtein distance
 * Returns a value between 0 (completely different) and 100 (identical)
 */
export function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2)
  const maxLength = Math.max(str1.length, str2.length)
  if (maxLength === 0) return 100
  return ((maxLength - distance) / maxLength) * 100
}

/**
 * Normalize a vendor name for comparison
 * - Convert to lowercase
 * - Remove special characters
 * - Remove extra whitespace
 * - Expand common abbreviations
 * - Handle common typos
 */
export function normalizeVendorName(name: string): string {
  let normalized = name.toLowerCase().trim()

  // Remove all leading/trailing special characters and whitespace
  normalized = normalized.replace(/^[\s\-_\.\,\!\@\#\$\%\^\&\*\(\)]+|[\s\-_\.\,\!\@\#\$\%\^\&\*\(\)]+$/g, '')

  // Common abbreviations and variations
  const expansions: Record<string, string> = {
    '&': 'and',
    '+': 'plus',
    'mc': 'mac',
    "mcd's": 'mcdonalds',
    "mickey d's": 'mcdonalds',
    'sbux': 'starbucks',
    'amzn': 'amazon',
    'tgt': 'target',
    'wmt': 'walmart',
    'costco wholesale': 'costco',
    'kroger co': 'kroger',
    // Common number words
    '7 eleven': '7eleven',
    '7eleven': '7eleven',
    '711': '7eleven',
  }

  // Expand abbreviations
  Object.entries(expansions).forEach(([abbr, full]) => {
    // Escape special regex characters in abbreviation
    const escapedAbbr = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escapedAbbr}\\b`, 'gi')
    normalized = normalized.replace(regex, full)
  })

  // Remove common business suffixes
  const suffixes = [
    'inc', 'llc', 'ltd', 'corp', 'corporation', 'company', 'co',
    'group', 'international', 'intl', 'enterprises',
    'bar', 'restaurant', 'cafe', 'coffee', 'shop', 'store'
  ]
  suffixes.forEach(suffix => {
    const regex = new RegExp(`\\s+${suffix}\\.?$`, 'i')
    normalized = normalized.replace(regex, '')
  })

  // Remove ALL special characters and spaces for matching
  normalized = normalized.replace(/[^a-z0-9]/g, '')

  return normalized
}

/**
 * Check if two vendor names are similar using multiple algorithms
 */
export function calculateNameSimilarity(name1: string, name2: string): {
  score: number
  reasons: string[]
} {
  const reasons: string[] = []
  let totalScore = 0
  let weightSum = 0

  // Exact match (case-insensitive)
  if (name1.toLowerCase() === name2.toLowerCase()) {
    return { score: 100, reasons: ['Exact match (case-insensitive)'] }
  }

  // Normalized comparison
  const normalized1 = normalizeVendorName(name1)
  const normalized2 = normalizeVendorName(name2)

  if (normalized1 === normalized2) {
    return {
      score: 95,
      reasons: ['Identical after normalization (removing special chars, abbreviations)']
    }
  }

  // Levenshtein similarity on normalized names
  const levenshteinScore = calculateLevenshteinSimilarity(normalized1, normalized2)
  const levenshteinWeight = 0.6
  totalScore += levenshteinScore * levenshteinWeight
  weightSum += levenshteinWeight

  if (levenshteinScore >= 80) {
    reasons.push(`Very similar spelling: "${normalized1}" ↔ "${normalized2}"`)
  } else if (levenshteinScore >= 60) {
    reasons.push(`Similar spelling (${Math.round(levenshteinScore)}% match)`)
  }

  // Check if one name contains the other
  const containsScore = (() => {
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      reasons.push('One name contains the other')
      return 80
    }
    return 0
  })()
  const containsWeight = 0.2
  totalScore += containsScore * containsWeight
  weightSum += containsWeight

  // Check for common word overlap
  const words1 = normalized1.split(' ')
  const words2 = normalized2.split(' ')
  const commonWords = words1.filter(word => words2.includes(word) && word.length > 2)
  const wordOverlapScore = (commonWords.length / Math.max(words1.length, words2.length)) * 100
  const wordOverlapWeight = 0.2
  totalScore += wordOverlapScore * wordOverlapWeight
  weightSum += wordOverlapWeight

  if (commonWords.length > 0 && wordOverlapScore >= 50) {
    reasons.push(`Common words: ${commonWords.join(', ')}`)
  }

  const finalScore = weightSum > 0 ? totalScore / weightSum : 0
  return { score: Math.round(finalScore * 100) / 100, reasons }
}

/**
 * Calculate date overlap between two vendors' transaction date ranges
 * Returns a value between 0 (no overlap) and 100 (complete overlap)
 */
export function calculateDateOverlap(
  vendor1: VendorWithTransactions,
  vendor2: VendorWithTransactions
): number {
  if (!vendor1.firstTransactionDate || !vendor1.lastTransactionDate ||
      !vendor2.firstTransactionDate || !vendor2.lastTransactionDate) {
    return 0
  }

  const date1Start = new Date(vendor1.firstTransactionDate).getTime()
  const date1End = new Date(vendor1.lastTransactionDate).getTime()
  const date2Start = new Date(vendor2.firstTransactionDate).getTime()
  const date2End = new Date(vendor2.lastTransactionDate).getTime()

  // Calculate overlap
  const overlapStart = Math.max(date1Start, date2Start)
  const overlapEnd = Math.min(date1End, date2End)

  if (overlapStart > overlapEnd) {
    return 0 // No overlap
  }

  const overlapDuration = overlapEnd - overlapStart
  const totalDuration = Math.max(date1End - date1Start, date2End - date2Start)

  if (totalDuration === 0) return 0

  return (overlapDuration / totalDuration) * 100
}

/**
 * Determine if two vendors have complementary date ranges (suggesting one replaced the other)
 */
export function hasComplementaryDateRanges(
  vendor1: VendorWithTransactions,
  vendor2: VendorWithTransactions
): boolean {
  if (!vendor1.firstTransactionDate || !vendor1.lastTransactionDate ||
      !vendor2.firstTransactionDate || !vendor2.lastTransactionDate) {
    return false
  }

  const date1Start = new Date(vendor1.firstTransactionDate)
  const date1End = new Date(vendor1.lastTransactionDate)
  const date2Start = new Date(vendor2.firstTransactionDate)
  const date2End = new Date(vendor2.lastTransactionDate)

  // Check if vendor2 starts shortly after vendor1 ends (within 30 days)
  const daysBetween = Math.abs(date2Start.getTime() - date1End.getTime()) / (1000 * 60 * 60 * 24)
  return daysBetween <= 30 && date2Start > date1End
}

/**
 * Calculate overall vendor similarity score
 * Returns a confidence score from 0-100 and reasons for the match
 */
export function calculateVendorSimilarity(
  vendor1: VendorWithTransactions,
  vendor2: VendorWithTransactions
): { confidence: number; reasons: string[] } {
  const reasons: string[] = []
  let totalScore = 0
  let weightSum = 0

  // 1. Name similarity (60% weight)
  const { score: nameScore, reasons: nameReasons } = calculateNameSimilarity(
    vendor1.name,
    vendor2.name
  )
  const nameWeight = 0.6
  totalScore += nameScore * nameWeight
  weightSum += nameWeight
  reasons.push(...nameReasons)

  // 2. Date overlap analysis (20% weight)
  const dateOverlap = calculateDateOverlap(vendor1, vendor2)
  const dateWeight = 0.2

  if (hasComplementaryDateRanges(vendor1, vendor2)) {
    // Complementary dates suggest one replaced the other
    totalScore += 75 * dateWeight
    reasons.push('Sequential date ranges (one vendor may have replaced the other)')
  } else if (dateOverlap === 0) {
    // No overlap might indicate they're different, or one replaced the other
    totalScore += 40 * dateWeight
  } else {
    // Some overlap
    totalScore += dateOverlap * dateWeight
    if (dateOverlap > 50) {
      reasons.push('Overlapping transaction date ranges')
    }
  }
  weightSum += dateWeight

  // 3. Transaction volume comparison (20% weight)
  const volumeWeight = 0.2
  const avgCount = (vendor1.transactionCount + vendor2.transactionCount) / 2
  const countDifference = Math.abs(vendor1.transactionCount - vendor2.transactionCount)
  const volumeSimilarity = avgCount > 0 ? (1 - (countDifference / avgCount)) * 100 : 0
  totalScore += volumeSimilarity * volumeWeight
  weightSum += volumeWeight

  if (Math.abs(vendor1.transactionCount - vendor2.transactionCount) <= 2) {
    reasons.push('Similar transaction volumes')
  }

  const finalConfidence = weightSum > 0 ? totalScore / weightSum : 0

  return {
    confidence: Math.round(finalConfidence * 100) / 100,
    reasons
  }
}

/**
 * Calculate a preference score for determining the better merge target
 * Higher score = better candidate to be the target (the one to keep)
 */
function calculateTargetPreferenceScore(
  vendor: VendorWithTransactions,
  otherVendor: VendorWithTransactions
): number {
  let score = 0

  // 1. Transaction count is the primary factor (heavily weighted)
  // Vendors with significantly more transactions should be strongly preferred
  const transactionDiff = vendor.transactionCount - otherVendor.transactionCount
  const avgTransactions = (vendor.transactionCount + otherVendor.transactionCount) / 2

  if (avgTransactions > 0) {
    // Scale transaction difference: more transactions = higher score
    // Use logarithmic scaling to prevent overwhelming other factors
    const transactionScore = Math.log1p(vendor.transactionCount) * 100
    score += transactionScore

    // Add bonus if this vendor has significantly more transactions (>2x)
    if (vendor.transactionCount >= otherVendor.transactionCount * 2) {
      score += 200
    }
  }

  // 2. Name quality factors (secondary)
  // Prefer longer, more complete names
  const nameLengthScore = vendor.name.length * 2
  score += nameLengthScore

  // 3. Prefer names that look more "official" or complete
  // Names with spaces and proper capitalization are often more canonical
  const hasSpaces = vendor.name.includes(' ')
  const hasUpperCase = vendor.name !== vendor.name.toLowerCase()
  if (hasSpaces) score += 20
  if (hasUpperCase) score += 10

  // 4. Penalize names that look truncated or abbreviated
  const looksAbbreviated = vendor.name.length < 5 || /\d{4,}/.test(vendor.name)
  if (looksAbbreviated) score -= 30

  return score
}

/**
 * Find potential duplicate vendors from a list
 * Returns suggestions sorted by confidence (highest first)
 */
export function findDuplicateVendors(
  vendors: VendorWithTransactions[],
  options: {
    minConfidence?: number
    maxSuggestions?: number
    excludePairs?: Set<string> // Set of "vendorId1:vendorId2" to exclude
  } = {}
): DuplicateSuggestion[] {
  const {
    minConfidence = 40, // Lowered from 50 to catch more potential duplicates
    maxSuggestions = 100, // Increased from 50
    excludePairs = new Set()
  } = options

  const suggestions: DuplicateSuggestion[] = []
  const processedPairs = new Set<string>()

  // Compare each vendor with every other vendor
  for (let i = 0; i < vendors.length; i++) {
    for (let j = i + 1; j < vendors.length; j++) {
      const vendor1 = vendors[i]
      const vendor2 = vendors[j]

      // Create a unique pair identifier
      const pairId1 = `${vendor1.id}:${vendor2.id}`
      const pairId2 = `${vendor2.id}:${vendor1.id}`

      // Skip if this pair has been excluded or already processed
      if (excludePairs.has(pairId1) || excludePairs.has(pairId2) ||
          processedPairs.has(pairId1) || processedPairs.has(pairId2)) {
        continue
      }

      processedPairs.add(pairId1)

      const { confidence, reasons } = calculateVendorSimilarity(vendor1, vendor2)

      if (confidence >= minConfidence) {
        // Determine which vendor should be the target using preference scores
        // The target is the one we keep (merge INTO), source is the one we merge FROM
        const vendor1Score = calculateTargetPreferenceScore(vendor1, vendor2)
        const vendor2Score = calculateTargetPreferenceScore(vendor2, vendor1)

        const [sourceVendor, targetVendor] =
          vendor1Score >= vendor2Score
            ? [vendor2, vendor1]
            : [vendor1, vendor2]

        suggestions.push({
          sourceVendor,
          targetVendor,
          confidence,
          reasons
        })
      }
    }
  }

  // Sort by confidence (highest first)
  suggestions.sort((a, b) => b.confidence - a.confidence)

  // Return top suggestions
  return suggestions.slice(0, maxSuggestions)
}

/**
 * Determine confidence level category
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 80) return 'high'  // Lowered from 85
  if (confidence >= 55) return 'medium' // Lowered from 65
  return 'low'
}

/**
 * Group vendors into clusters where multiple vendors might be duplicates of each other
 */
export function clusterDuplicateVendors(
  suggestions: DuplicateSuggestion[],
  minClusterConfidence = 70
): Map<string, Set<string>> {
  const clusters = new Map<string, Set<string>>()
  const vendorToCluster = new Map<string, string>()

  // Filter suggestions by confidence
  const highConfSuggestions = suggestions.filter(s => s.confidence >= minClusterConfidence)

  highConfSuggestions.forEach(suggestion => {
    const sourceId = suggestion.sourceVendor.id
    const targetId = suggestion.targetVendor.id

    const sourceCluster = vendorToCluster.get(sourceId)
    const targetCluster = vendorToCluster.get(targetId)

    if (sourceCluster && targetCluster && sourceCluster !== targetCluster) {
      // Merge clusters
      const sourceSet = clusters.get(sourceCluster)!
      const targetSet = clusters.get(targetCluster)!

      targetSet.forEach(id => {
        sourceSet.add(id)
        vendorToCluster.set(id, sourceCluster)
      })

      clusters.delete(targetCluster)
    } else if (sourceCluster) {
      // Add target to source cluster
      clusters.get(sourceCluster)!.add(targetId)
      vendorToCluster.set(targetId, sourceCluster)
    } else if (targetCluster) {
      // Add source to target cluster
      clusters.get(targetCluster)!.add(sourceId)
      vendorToCluster.set(sourceId, targetCluster)
    } else {
      // Create new cluster
      const clusterId = targetId // Use target as cluster representative
      const newCluster = new Set([sourceId, targetId])
      clusters.set(clusterId, newCluster)
      vendorToCluster.set(sourceId, clusterId)
      vendorToCluster.set(targetId, clusterId)
    }
  })

  return clusters
}
