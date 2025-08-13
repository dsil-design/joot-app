"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function AddTransactionPage() {
  const [currency, setCurrency] = React.useState("THB")
  const [vendor, setVendor] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [amount, setAmount] = React.useState("")

  const handleSave = () => {
    // Handle save functionality
    console.log("Save transaction:", {
      description,
      vendor,
      paymentMethod,
      amount,
      currency,
    })
  }

  const handleCancel = () => {
    // Handle cancel functionality
    console.log("Cancel transaction")
  }

  return (
    <div className="bg-background flex flex-col gap-6 items-start justify-start pb-0 pt-20 px-10 min-h-screen w-full">
      {/* Page Title */}
      <h1 className="text-3xl font-medium text-foreground leading-9">
        Add transaction
      </h1>

      {/* Form */}
      <div className="flex flex-col gap-8 items-start justify-start w-full">
        {/* Fields */}
        <div className="flex flex-col gap-6 items-start justify-start w-full">
          {/* Description Input Group */}
          <div className="flex flex-col gap-1 items-start justify-start w-full">
            <Label htmlFor="description" className="text-sm font-medium text-foreground">
              Description
            </Label>
            <Input
              id="description"
              type="text"
              placeholder="e.g., Groceries, Drinks, Gas"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-10 w-full bg-background border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Vendor Select Group */}
          <div className="flex flex-col gap-1 items-start justify-start w-full">
            <Label htmlFor="vendor" className="text-sm font-medium text-foreground">
              Vendor
            </Label>
            <Select value={vendor} onValueChange={setVendor}>
              <SelectTrigger className="h-10 w-full bg-background border-input rounded-md px-3 py-2">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grocery-store">Grocery Store</SelectItem>
                <SelectItem value="gas-station">Gas Station</SelectItem>
                <SelectItem value="restaurant">Restaurant</SelectItem>
                <SelectItem value="pharmacy">Pharmacy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method Select Group */}
          <div className="flex flex-col gap-1 items-start justify-start w-full">
            <Label htmlFor="payment-method" className="text-sm font-medium text-foreground">
              Payment Method
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-10 w-full bg-background border-input rounded-md px-3 py-2">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="credit-card">Credit Card</SelectItem>
                <SelectItem value="debit-card">Debit Card</SelectItem>
                <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount and Currency Row */}
          <div className="flex flex-row gap-6 items-center justify-start w-full">
            {/* Amount Input Group */}
            <div className="flex flex-col gap-1 items-start justify-start flex-1">
              <Label htmlFor="amount" className="text-sm font-medium text-foreground">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-10 w-full bg-background border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Currency Radio Group */}
            <div className="flex flex-col gap-1 items-start justify-start">
              <Label className="text-sm font-medium text-foreground">
                Currency
              </Label>
              <RadioGroup
                value={currency}
                onValueChange={setCurrency}
                className="flex flex-row gap-6 h-10 items-center justify-start"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="THB" id="thb" />
                  <Label htmlFor="thb" className="text-sm font-medium text-foreground">
                    THB
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="USD" id="usd" />
                  <Label htmlFor="usd" className="text-sm font-medium text-foreground">
                    USD
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 items-start justify-start w-full">
          <Button
            onClick={handleSave}
            className="h-10 w-full bg-primary text-primary-foreground rounded-lg px-6 text-sm font-medium"
          >
            Save
          </Button>
          <Button
            variant="secondary"
            onClick={handleCancel}
            className="h-10 w-full bg-secondary text-secondary-foreground rounded-lg px-6 text-sm font-medium"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
