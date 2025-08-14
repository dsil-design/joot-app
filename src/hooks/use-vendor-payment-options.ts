"use client"

import { useState, useEffect } from "react"
import { useVendors } from "./use-vendors"

export interface VendorPaymentOption {
  value: string
  label: string
  disabled?: boolean
}

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
    const defaults = type === "vendor" ? [] : defaultPaymentOptions
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

// Updated vendor options hook that uses database vendors
export function useVendorOptions() {
  const { vendors, loading, error, createVendor } = useVendors()
  
  const options: VendorPaymentOption[] = vendors.map(vendor => ({
    value: vendor.id,
    label: vendor.name,
    disabled: false
  }))

  const addCustomOption = async (vendorName: string) => {
    const newVendor = await createVendor(vendorName)
    return newVendor ? newVendor.id : null
  }

  return {
    options,
    addCustomOption,
    loading,
    error
  }
}

export function usePaymentMethodOptions() {
  return useVendorPaymentOptions("payment")
}