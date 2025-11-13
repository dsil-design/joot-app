import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { QuickMatchModal } from "@/components/month-view/QuickMatchModal"
import type { ExpectedTransaction, MatchSuggestion } from "@/lib/types/recurring-transactions"

describe("QuickMatchModal", () => {
  const mockExpectedTransaction: ExpectedTransaction = {
    id: "expected-1",
    user_id: "user-1",
    template_id: "template-1",
    month_plan_id: "plan-1",
    vendor_id: "vendor-1",
    payment_method_id: null,
    description: "Rent Payment",
    expected_amount: 15000,
    original_currency: "THB",
    transaction_type: "expense",
    expected_date: "2024-03-01",
    status: "pending",
    matched_transaction_id: null,
    matched_at: null,
    actual_amount: null,
    variance_amount: null,
    variance_percentage: null,
    notes: null,
    created_at: "2024-03-01T00:00:00Z",
    updated_at: "2024-03-01T00:00:00Z",
    vendor: {
      id: "vendor-1",
      name: "Landlord",
    },
  }

  const mockSuggestions: MatchSuggestion[] = [
    {
      expected_transaction_id: "expected-1",
      transaction_id: "trans-1",
      confidence_score: 95,
      match_reasons: ["Exact amount match", "Same vendor", "Date within 3 days"],
      expected: mockExpectedTransaction,
      actual: {
        id: "trans-1",
        user_id: "user-1",
        vendor_id: "vendor-1",
        payment_method_id: null,
        description: "Rent - March 2024",
        amount: 15000,
        original_currency: "THB",
        transaction_type: "expense",
        transaction_date: "2024-03-01",
        source_type: "manual",
        expected_transaction_id: null,
        created_at: "2024-03-01T00:00:00Z",
        updated_at: "2024-03-01T00:00:00Z",
      },
    },
    {
      expected_transaction_id: "expected-1",
      transaction_id: "trans-2",
      confidence_score: 75,
      match_reasons: ["Similar amount", "Same vendor"],
      expected: mockExpectedTransaction,
      actual: {
        id: "trans-2",
        user_id: "user-1",
        vendor_id: "vendor-1",
        payment_method_id: null,
        description: "Rent Payment",
        amount: 15200,
        original_currency: "THB",
        transaction_type: "expense",
        transaction_date: "2024-03-02",
        source_type: "manual",
        expected_transaction_id: null,
        created_at: "2024-03-02T00:00:00Z",
        updated_at: "2024-03-02T00:00:00Z",
      },
    },
  ]

  it("renders modal with expected transaction details", () => {
    render(
      <QuickMatchModal
        open={true}
        onOpenChange={() => {}}
        expectedTransaction={mockExpectedTransaction}
        matchSuggestions={mockSuggestions}
        onMatch={async () => {}}
      />
    )

    expect(screen.getByText("Match Transaction")).toBeInTheDocument()
    expect(screen.getByText("Landlord")).toBeInTheDocument()
    expect(screen.getByText(/15,000/)).toBeInTheDocument()
  })

  it("displays match suggestions with confidence scores", () => {
    render(
      <QuickMatchModal
        open={true}
        onOpenChange={() => {}}
        expectedTransaction={mockExpectedTransaction}
        matchSuggestions={mockSuggestions}
        onMatch={async () => {}}
      />
    )

    expect(screen.getByText("95% match")).toBeInTheDocument()
    expect(screen.getByText("75% match")).toBeInTheDocument()
  })

  it("displays match reasons for suggestions", () => {
    render(
      <QuickMatchModal
        open={true}
        onOpenChange={() => {}}
        expectedTransaction={mockExpectedTransaction}
        matchSuggestions={mockSuggestions}
        onMatch={async () => {}}
      />
    )

    expect(screen.getByText("Exact amount match")).toBeInTheDocument()
    expect(screen.getByText("Same vendor")).toBeInTheDocument()
  })

  it("allows selecting a suggestion", () => {
    render(
      <QuickMatchModal
        open={true}
        onOpenChange={() => {}}
        expectedTransaction={mockExpectedTransaction}
        matchSuggestions={mockSuggestions}
        onMatch={async () => {}}
      />
    )

    const firstSuggestion = screen.getByText("Rent - March 2024").closest("button")
    expect(firstSuggestion).toBeInTheDocument()

    if (firstSuggestion) {
      fireEvent.click(firstSuggestion)
      // Check if selection is visually indicated (e.g., via a checkmark)
      expect(screen.getByRole("button", { name: /confirm match/i })).not.toBeDisabled()
    }
  })

  it("calls onMatch with correct IDs when confirming", async () => {
    const onMatch = jest.fn().mockResolvedValue(undefined)
    render(
      <QuickMatchModal
        open={true}
        onOpenChange={() => {}}
        expectedTransaction={mockExpectedTransaction}
        matchSuggestions={mockSuggestions}
        onMatch={onMatch}
      />
    )

    // Select first suggestion
    const firstSuggestion = screen.getByText("Rent - March 2024").closest("button")
    if (firstSuggestion) {
      fireEvent.click(firstSuggestion)
    }

    // Click confirm
    const confirmButton = screen.getByRole("button", { name: /confirm match/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(onMatch).toHaveBeenCalledWith("expected-1", "trans-1")
    })
  })

  it("filters suggestions based on search query", () => {
    render(
      <QuickMatchModal
        open={true}
        onOpenChange={() => {}}
        expectedTransaction={mockExpectedTransaction}
        matchSuggestions={mockSuggestions}
        onMatch={async () => {}}
      />
    )

    const searchInput = screen.getByPlaceholderText(/search/i)
    fireEvent.change(searchInput, { target: { value: "March" } })

    // Should show the first suggestion (contains "March")
    expect(screen.getByText("Rent - March 2024")).toBeInTheDocument()
  })

  it("shows empty state when no suggestions available", () => {
    render(
      <QuickMatchModal
        open={true}
        onOpenChange={() => {}}
        expectedTransaction={mockExpectedTransaction}
        matchSuggestions={[]}
        onMatch={async () => {}}
      />
    )

    expect(screen.getByText(/No match suggestions available/i)).toBeInTheDocument()
  })

  it("disables confirm button when no suggestion selected", () => {
    render(
      <QuickMatchModal
        open={true}
        onOpenChange={() => {}}
        expectedTransaction={mockExpectedTransaction}
        matchSuggestions={mockSuggestions}
        onMatch={async () => {}}
      />
    )

    const confirmButton = screen.getByRole("button", { name: /confirm match/i })
    expect(confirmButton).toBeDisabled()
  })
})
