import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { ExpectedTransactionCard } from "@/components/month-view/ExpectedTransactionCard"
import type { ExpectedTransaction } from "@/lib/types/recurring-transactions"

describe("ExpectedTransactionCard", () => {
  const mockPendingTransaction: ExpectedTransaction = {
    id: "test-1",
    user_id: "user-1",
    template_id: "template-1",
    month_plan_id: "plan-1",
    vendor_id: "vendor-1",
    payment_method_id: "payment-1",
    description: "Netflix Subscription",
    expected_amount: 419,
    original_currency: "THB",
    transaction_type: "expense",
    expected_date: "2024-03-15",
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
      name: "Netflix",
    },
    payment_method: {
      id: "payment-1",
      name: "Credit Card",
    },
  }

  const mockMatchedTransaction: ExpectedTransaction = {
    ...mockPendingTransaction,
    id: "test-2",
    status: "matched",
    matched_transaction_id: "trans-1",
    matched_at: "2024-03-15T10:00:00Z",
    actual_amount: 419,
    variance_amount: 0,
    variance_percentage: 0,
    matched_transaction: {
      id: "trans-1",
      transaction_date: "2024-03-15",
      amount: 419,
      description: "Netflix Payment",
    },
  }

  it("renders pending transaction correctly", () => {
    render(<ExpectedTransactionCard expectedTransaction={mockPendingTransaction} />)

    expect(screen.getByText("Netflix")).toBeInTheDocument()
    expect(screen.getByText("Netflix Subscription")).toBeInTheDocument()
    expect(screen.getByText(/419/)).toBeInTheDocument()
    expect(screen.getByText("Pending")).toBeInTheDocument()
  })

  it("renders matched transaction with actual amount", () => {
    render(<ExpectedTransactionCard expectedTransaction={mockMatchedTransaction} />)

    expect(screen.getByText("Matched")).toBeInTheDocument()
    expect(screen.getByText(/Expected:/)).toBeInTheDocument()
    expect(screen.getByText(/Actual:/)).toBeInTheDocument()
  })

  it("shows variance for transactions with amount differences", () => {
    const transactionWithVariance: ExpectedTransaction = {
      ...mockMatchedTransaction,
      actual_amount: 450,
      variance_amount: 31,
      variance_percentage: 7.4,
    }

    render(<ExpectedTransactionCard expectedTransaction={transactionWithVariance} />)

    expect(screen.getByText("Variance")).toBeInTheDocument()
    expect(screen.getByText(/\+31/)).toBeInTheDocument()
  })

  it("calls onMatch when match action is clicked", () => {
    const onMatch = jest.fn()
    render(
      <ExpectedTransactionCard
        expectedTransaction={mockPendingTransaction}
        onMatch={onMatch}
      />
    )

    // Open the dropdown menu
    const moreButton = screen.getByRole("button", { name: /more actions/i })
    fireEvent.click(moreButton)

    // Click the match option
    const matchButton = screen.getByText(/Match Transaction/)
    fireEvent.click(matchButton)

    expect(onMatch).toHaveBeenCalledWith(mockPendingTransaction.id)
  })

  it("calls onSkip when skip action is clicked", () => {
    const onSkip = jest.fn()
    render(
      <ExpectedTransactionCard
        expectedTransaction={mockPendingTransaction}
        onSkip={onSkip}
      />
    )

    // Open the dropdown menu
    const moreButton = screen.getByRole("button", { name: /more actions/i })
    fireEvent.click(moreButton)

    // Click the skip option
    const skipButton = screen.getByText(/Skip This Month/)
    fireEvent.click(skipButton)

    expect(onSkip).toHaveBeenCalledWith(mockPendingTransaction.id)
  })

  it("displays overdue status for past pending transactions", () => {
    const overdueTransaction: ExpectedTransaction = {
      ...mockPendingTransaction,
      expected_date: "2024-01-01", // Past date
    }

    render(<ExpectedTransactionCard expectedTransaction={overdueTransaction} />)

    expect(screen.getByText("Overdue")).toBeInTheDocument()
  })

  it("applies correct styling classes for different states", () => {
    const { container, rerender } = render(
      <ExpectedTransactionCard expectedTransaction={mockPendingTransaction} />
    )

    // Pending should have default border
    expect(container.querySelector(".border-zinc-200")).toBeInTheDocument()

    // Matched should have green border
    rerender(<ExpectedTransactionCard expectedTransaction={mockMatchedTransaction} />)
    expect(container.querySelector(".border-green-200")).toBeInTheDocument()
  })
})
