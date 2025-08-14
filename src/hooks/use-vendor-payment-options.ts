"use client"

import { useState, useEffect } from "react"

export interface VendorPaymentOption {
  value: string
  label: string
  disabled?: boolean
}

// Default vendor options
const defaultVendorOptions: VendorPaymentOption[] = [
  { value: "7-eleven", label: "7-Eleven" },
  { value: "grab", label: "Grab" },
  { value: "apple", label: "Apple" },
  { value: "netflix", label: "Netflix" },
  { value: "shell", label: "Shell" },
  { value: "grocery-store", label: "Grocery Store" },
  { value: "gas-station", label: "Gas Station" },
  { value: "restaurant", label: "Restaurant" },
  { value: "pharmacy", label: "Pharmacy" },
]

// Default payment method options
const defaultPaymentOptions: VendorPaymentOption[] = [
  { value: "cash", label: "Cash" },
  { value: "credit-card", label: "Credit Card" },
  { value: "debit-card", label: "Debit Card" },
  { value: "checking-account", label: "Checking Account" },
  { value: "bank-transfer", label: "Bank Transfer" },
]

// Simple hook that just provides static options for now
// In the future, this could be enhanced to store user's custom options in localStorage
export function useVendorPaymentOptions(type: "vendor" | "payment") {
  const [customOptions, setCustomOptions] = useState<string[]>([])
  
  // Load custom options from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`custom-${type}-options`)
    if (stored) {
      try {
        setCustomOptions(JSON.parse(stored))
      } catch {
        // Ignore parse errors
      }
    }
  }, [type])

  // Save custom options to localStorage
  const saveCustomOptions = (options: string[]) => {
    setCustomOptions(options)
    localStorage.setItem(`custom-${type}-options`, JSON.stringify(options))
  }

  // Add a new custom option
  const addCustomOption = (newOption: string) => {
    const normalizedOption = newOption.trim()
    if (!normalizedOption) return null
    
    const newCustomOptions = [...customOptions, normalizedOption]
    saveCustomOptions(newCustomOptions)
    return normalizedOption
  }

  // Get all options (defaults + custom)
  const getOptions = (): VendorPaymentOption[] => {
    const defaults = type === "vendor" ? defaultVendorOptions : defaultPaymentOptions
    const customOptionsList = customOptions.map(option => ({
      value: option,
      label: option,
      disabled: false
    }))
    
    return [...defaults, ...customOptionsList]
  }

  return {
    options: getOptions(),
    addCustomOption,
    loading: false,
    error: null
  }
}

// Convenience hooks
export function useVendorOptions() {
  return useVendorPaymentOptions("vendor")
}

export function usePaymentMethodOptions() {
  return useVendorPaymentOptions("payment")
}