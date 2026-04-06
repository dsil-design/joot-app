"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import type { DateRange } from "react-day-picker"

/**
 * Payment slips filter types
 *
 * `slipState` is a single, user-facing bucket derived from the two underlying
 * DB columns (`status` = extraction pipeline state, `review_status` = user's
 * review decision). The same bucket order as the badge in the slip list:
 *
 *   failed -> processing -> pending -> approved -> rejected -> ready
 *
 * Server-side, the bucket is translated into the right (status, review_status)
 * predicate. See /api/payment-slips route handler.
 */
export type PaymentSlipState =
  | "all"
  | "processing"
  | "pending"
  | "failed"
  | "ready"
  | "approved"
  | "rejected"

export type PaymentSlipDirection = "all" | "income" | "expense"
export type PaymentSlipBank = "all" | "kbank" | "bangkok_bank"
export type PaymentSlipConfidence = "all" | "high" | "medium" | "low"
export type PaymentSlipSortField = "uploaded_at" | "transaction_date" | "amount" | "confidence"
export type PaymentSlipSortOrder = "asc" | "desc"

export interface PaymentSlipFilters {
  search: string
  direction: PaymentSlipDirection
  slipState: PaymentSlipState
  bank: PaymentSlipBank
  confidence: PaymentSlipConfidence
  dateRange: DateRange | undefined
  sortField: PaymentSlipSortField
  sortOrder: PaymentSlipSortOrder
}

export const defaultPaymentSlipFilters: PaymentSlipFilters = {
  search: "",
  direction: "all",
  slipState: "all",
  bank: "all",
  confidence: "all",
  dateRange: undefined,
  sortField: "transaction_date",
  sortOrder: "desc",
}

const validStates: PaymentSlipState[] = [
  "all", "processing", "pending", "failed", "ready", "approved", "rejected",
]
const validDirections: PaymentSlipDirection[] = ["all", "income", "expense"]
const validBanks: PaymentSlipBank[] = ["all", "kbank", "bangkok_bank"]
const validConfidences: PaymentSlipConfidence[] = ["all", "high", "medium", "low"]
const validSortFields: PaymentSlipSortField[] = ["uploaded_at", "transaction_date", "amount", "confidence"]
const validSortOrders: PaymentSlipSortOrder[] = ["asc", "desc"]

export function parseUrlParams(searchParams: URLSearchParams): Partial<PaymentSlipFilters> {
  const filters: Partial<PaymentSlipFilters> = {}

  const search = searchParams.get("search")
  if (search) filters.search = search

  const direction = searchParams.get("direction")
  if (direction && validDirections.includes(direction as PaymentSlipDirection)) {
    filters.direction = direction as PaymentSlipDirection
  }

  const slipState = searchParams.get("slipState")
  if (slipState && validStates.includes(slipState as PaymentSlipState)) {
    filters.slipState = slipState as PaymentSlipState
  }

  const bank = searchParams.get("bank")
  if (bank && validBanks.includes(bank as PaymentSlipBank)) {
    filters.bank = bank as PaymentSlipBank
  }

  const confidence = searchParams.get("confidence")
  if (confidence && validConfidences.includes(confidence as PaymentSlipConfidence)) {
    filters.confidence = confidence as PaymentSlipConfidence
  }

  const sortField = searchParams.get("sortField")
  if (sortField && validSortFields.includes(sortField as PaymentSlipSortField)) {
    filters.sortField = sortField as PaymentSlipSortField
  }

  const sortOrder = searchParams.get("sortOrder")
  if (sortOrder && validSortOrders.includes(sortOrder as PaymentSlipSortOrder)) {
    filters.sortOrder = sortOrder as PaymentSlipSortOrder
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

export function filtersToUrlParams(filters: PaymentSlipFilters): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.search) params.set("search", filters.search)
  if (filters.direction !== "all") params.set("direction", filters.direction)
  if (filters.slipState !== "all") params.set("slipState", filters.slipState)
  if (filters.bank !== "all") params.set("bank", filters.bank)
  if (filters.confidence !== "all") params.set("confidence", filters.confidence)
  if (filters.sortField !== defaultPaymentSlipFilters.sortField) {
    params.set("sortField", filters.sortField)
  }
  if (filters.sortOrder !== defaultPaymentSlipFilters.sortOrder) {
    params.set("sortOrder", filters.sortOrder)
  }
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

export function hasActiveFilters(filters: PaymentSlipFilters): boolean {
  return (
    filters.search !== "" ||
    filters.direction !== "all" ||
    filters.slipState !== "all" ||
    filters.bank !== "all" ||
    filters.confidence !== "all" ||
    filters.dateRange !== undefined ||
    filters.sortField !== defaultPaymentSlipFilters.sortField ||
    filters.sortOrder !== defaultPaymentSlipFilters.sortOrder
  )
}

export function usePaymentSlipFilters(): [
  PaymentSlipFilters,
  (filters: PaymentSlipFilters) => void,
] {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [filters, setFiltersState] = React.useState<PaymentSlipFilters>(() => {
    const urlFilters = searchParams ? parseUrlParams(searchParams) : {}
    return { ...defaultPaymentSlipFilters, ...urlFilters }
  })

  React.useEffect(() => {
    const params = filtersToUrlParams(filters)
    const newUrl = params.toString()
      ? `${pathname ?? ""}?${params.toString()}`
      : (pathname ?? "")
    router.replace(newUrl, { scroll: false })
  }, [filters, pathname, router])

  return [filters, setFiltersState]
}
