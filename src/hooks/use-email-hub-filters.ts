"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import type { DateRange } from "react-day-picker"
import { getMonthRange } from "@/lib/utils/date-filters"

/**
 * Email hub filter types
 */
export type EmailHubStatus =
  | "all"
  | "unprocessed"
  | "pending_review"
  | "matched"
  | "waiting_for_statement"
  | "waiting_for_email"
  | "waiting_for_slip"
  | "ready_to_import"
  | "imported"
  | "skipped"

export type EmailHubClassification =
  | "all"
  | "receipt"
  | "order_confirmation"
  | "bank_transfer"
  | "bill_payment"
  | "unknown"

export type EmailHubCurrency = "all" | "USD" | "THB"
export type EmailHubConfidence = "all" | "high" | "medium" | "low"
export type EmailHubSort = "email_date_desc" | "email_date_asc" | "amount_desc" | "confidence_desc"

export interface EmailHubFilters {
  status: EmailHubStatus
  classification: EmailHubClassification
  currency: EmailHubCurrency
  confidence: EmailHubConfidence
  search: string
  dateRange: DateRange | undefined
  sort: EmailHubSort
}

export const defaultEmailHubFilters: EmailHubFilters = {
  status: "all",
  classification: "all",
  currency: "all",
  confidence: "all",
  search: "",
  dateRange: getMonthRange(),
  sort: "email_date_desc",
}

const validStatuses: EmailHubStatus[] = [
  "all", "unprocessed", "pending_review", "matched", "waiting_for_statement",
  "waiting_for_email", "waiting_for_slip", "ready_to_import", "imported", "skipped",
]
const validClassifications: EmailHubClassification[] = [
  "all", "receipt", "order_confirmation", "bank_transfer", "bill_payment", "unknown",
]
const validCurrencies: EmailHubCurrency[] = ["all", "USD", "THB"]
const validConfidences: EmailHubConfidence[] = ["all", "high", "medium", "low"]
const validSorts: EmailHubSort[] = ["email_date_desc", "email_date_asc", "amount_desc", "confidence_desc"]

/**
 * Parse URL search params to filters
 */
export function parseUrlParams(searchParams: URLSearchParams): Partial<EmailHubFilters> {
  const filters: Partial<EmailHubFilters> = {}

  const status = searchParams.get("status")
  if (status && validStatuses.includes(status as EmailHubStatus)) {
    filters.status = status as EmailHubStatus
  }

  const classification = searchParams.get("classification")
  if (classification && validClassifications.includes(classification as EmailHubClassification)) {
    filters.classification = classification as EmailHubClassification
  }

  const currency = searchParams.get("currency")
  if (currency && validCurrencies.includes(currency as EmailHubCurrency)) {
    filters.currency = currency as EmailHubCurrency
  }

  const confidence = searchParams.get("confidence")
  if (confidence && validConfidences.includes(confidence as EmailHubConfidence)) {
    filters.confidence = confidence as EmailHubConfidence
  }

  const search = searchParams.get("search")
  if (search) {
    filters.search = search
    // When searching (e.g. by email ID from a deep link), clear date range
    // so results aren't hidden by the default "this month" filter
    if (!searchParams.has("from") && !searchParams.has("to")) {
      filters.dateRange = undefined
    }
  }

  const sort = searchParams.get("sort")
  if (sort && validSorts.includes(sort as EmailHubSort)) {
    filters.sort = sort as EmailHubSort
  }

  const from = searchParams.get("from")
  const to = searchParams.get("to")
  if (from || to) {
    filters.dateRange = {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    }
  }

  return filters
}

/**
 * Convert filters to URL search params
 */
export function filtersToUrlParams(filters: EmailHubFilters): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.status !== "all") params.set("status", filters.status)
  if (filters.classification !== "all") params.set("classification", filters.classification)
  if (filters.currency !== "all") params.set("currency", filters.currency)
  if (filters.confidence !== "all") params.set("confidence", filters.confidence)
  if (filters.search) params.set("search", filters.search)
  if (filters.sort !== "email_date_desc") params.set("sort", filters.sort)
  if (filters.dateRange?.from) {
    const d = filters.dateRange.from
    params.set("from", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
  }
  if (filters.dateRange?.to) {
    const d = filters.dateRange.to
    params.set("to", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
  }

  return params
}

/**
 * Check if filters have active (non-default) values
 */
export function hasActiveFilters(filters: EmailHubFilters): boolean {
  return (
    filters.status !== "all" ||
    filters.classification !== "all" ||
    filters.currency !== "all" ||
    filters.confidence !== "all" ||
    filters.search !== "" ||
    filters.dateRange?.from?.getTime() !== defaultEmailHubFilters.dateRange?.from?.getTime() ||
    filters.dateRange?.to?.getTime() !== defaultEmailHubFilters.dateRange?.to?.getTime()
  )
}

/**
 * Hook to manage email hub filters with URL sync
 */
export function useEmailHubFilters(
  initialFilters: Partial<EmailHubFilters> = {}
): [EmailHubFilters, (filters: EmailHubFilters) => void] {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [filters, setFiltersState] = React.useState<EmailHubFilters>(() => {
    const urlFilters = searchParams ? parseUrlParams(searchParams) : {}
    return { ...defaultEmailHubFilters, ...initialFilters, ...urlFilters }
  })

  // Sync filters to URL
  React.useEffect(() => {
    const params = filtersToUrlParams(filters)
    const newUrl = params.toString()
      ? `${pathname ?? ""}?${params.toString()}`
      : (pathname ?? "")
    router.replace(newUrl, { scroll: false })
  }, [filters, pathname, router])

  return [filters, setFiltersState]
}
