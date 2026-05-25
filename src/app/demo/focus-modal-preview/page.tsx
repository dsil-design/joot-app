"use client"

/**
 * Throwaway preview for visual verification of ReviewFocusModal at multiple
 * viewport sizes. Mock data covers source variants (merged, slip+stmt,
 * slip+email+stmt, email-only, statement-only). Safe to delete after the
 * row-layout work lands.
 */

import * as React from "react"
import { ReviewFocusModal } from "@/components/page-specific/review-focus-modal"
import { Button } from "@/components/ui/button"
import type { MatchCardData } from "@/components/page-specific/match-card/types"

const items: MatchCardData[] = [
  {
    id: "merged:email:00000000-0000-0000-0000-000000000001:statement:00000000-0000-0000-0000-000000000002:0",
    confidence: 92,
    confidenceLevel: "high",
    reasons: [],
    isNew: true,
    status: "pending",
    source: "merged",
    statementTransaction: {
      date: "2026-05-13",
      description: "Ring Multi Plan Ring.COM CA",
      amount: 10.69,
      currency: "USD",
      sourceFilename: "chase-sapphire-may.pdf",
    },
    mergedEmailData: {
      date: "2026-05-13",
      description: "Coffee: Mingmitr",
      amount: 77,
      currency: "THB",
      metadata: {
        subject: "Your Grab E-Receipt",
        fromName: "Grab",
        fromAddress: "no-reply@grab.com",
        vendorNameRaw: "GrabFood",
        parserKey: "grab",
      },
    },
    crossCurrencyInfo: {
      emailAmount: 77,
      emailCurrency: "THB",
      statementAmount: 10.69,
      statementCurrency: "USD",
      rate: 0.1388,
      rateDate: "2026-05-13",
      percentDiff: 0,
    },
  },
  {
    id: "merged_slip_email_stmt:slip:00000000-0000-0000-0000-000000000010:email:00000000-0000-0000-0000-000000000011:statement:00000000-0000-0000-0000-000000000012:0",
    confidence: 88,
    confidenceLevel: "high",
    reasons: [],
    isNew: true,
    status: "pending",
    source: "merged",
    statementTransaction: {
      date: "2026-04-22",
      description: "K PLUS TRANSFER",
      amount: 1500,
      currency: "THB",
    },
    mergedPaymentSlipData: {
      date: "2026-04-22",
      description: "Transfer to Nidnoi",
      amount: 1500,
      currency: "THB",
      metadata: {
        senderName: "Dennis",
        recipientName: "Nidnoi",
        bankDetected: "K PLUS",
      },
    },
    mergedEmailData: {
      date: "2026-04-22",
      description: "K PLUS Transfer Notification",
      amount: 1500,
      currency: "THB",
      metadata: {
        subject: "Transfer Successful — THB 1,500",
        fromName: "K PLUS",
        fromAddress: "no-reply@kasikornbank.com",
        vendorNameRaw: "Nidnoi",
        parserKey: "kasikorn",
      },
    },
  },
  {
    id: "email:00000000-0000-0000-0000-000000000020",
    confidence: 75,
    confidenceLevel: "medium",
    reasons: [],
    isNew: true,
    status: "pending",
    source: "email",
    statementTransaction: {
      date: "2026-05-10",
      description: "Lazada Order #12345",
      amount: 45.5,
      currency: "USD",
    },
    emailMetadata: {
      subject: "Your Lazada order has shipped",
      fromName: "Lazada",
      fromAddress: "noreply@lazada.com",
      vendorNameRaw: "Lazada",
      parserKey: "lazada",
      paymentCardLastFour: "4242",
      paymentCardType: "Visa",
    },
  },
  {
    id: "statement:00000000-0000-0000-0000-000000000030:0",
    confidence: 60,
    confidenceLevel: "medium",
    reasons: [],
    isNew: true,
    status: "pending",
    source: "statement",
    statementTransaction: {
      date: "2026-05-01",
      description: "AMAZON.COM*MS3X45",
      amount: 89.99,
      currency: "USD",
      sourceFilename: "chase-sapphire-may.pdf",
    },
  },
]

export default function FocusModalPreviewPage() {
  const [open, setOpen] = React.useState(true)
  const [index, setIndex] = React.useState(0)

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Focus Modal Preview</h1>
      <p className="text-muted-foreground">
        Throwaway preview for visual verification of ReviewFocusModal across viewport sizes.
      </p>
      <Button onClick={() => setOpen(true)}>Open Modal</Button>

      <ReviewFocusModal
        open={open}
        onOpenChange={setOpen}
        items={items}
        currentIndex={index}
        onIndexChange={setIndex}
        onApprove={() => {}}
        onReject={() => {}}
        onLinkManually={() => {}}
        onCreateTransaction={async () => {}}
        isProcessing={() => false}
      />
    </div>
  )
}
