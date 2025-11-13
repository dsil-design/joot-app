import React from "react"
import { render, screen } from "@testing-library/react"
import { MonthViewSummaryCards } from "@/components/month-view/MonthViewSummaryCards"
import type { MonthPlanStats } from "@/lib/types/recurring-transactions"

describe("MonthViewSummaryCards", () => {
  const mockStats: MonthPlanStats = {
    expected_count: 10,
    matched_count: 6,
    pending_count: 3,
    overdue_count: 1,
    skipped_count: 0,
    total_expected_expenses: {
      THB: 35000,
      USD: 500,
    },
    total_actual_expenses: {
      THB: 36500,
      USD: 525,
    },
    total_expected_income: {
      THB: 100000,
      USD: 2800,
    },
    total_actual_income: {
      THB: 100000,
      USD: 2800,
    },
  }

  it("renders all 4 summary cards", () => {
    render(<MonthViewSummaryCards stats={mockStats} />)

    expect(screen.getByText("EXPECTED INCOME")).toBeInTheDocument()
    expect(screen.getByText("ACTUAL INCOME")).toBeInTheDocument()
    expect(screen.getByText("EXPECTED EXPENSES")).toBeInTheDocument()
    expect(screen.getByText("ACTUAL EXPENSES")).toBeInTheDocument()
  })

  it("displays amounts by currency", () => {
    render(<MonthViewSummaryCards stats={mockStats} />)

    // Check for THB amounts
    expect(screen.getByText(/35,000/)).toBeInTheDocument()
    expect(screen.getByText(/100,000/)).toBeInTheDocument()
  })

  it("shows variance indicators", () => {
    render(<MonthViewSummaryCards stats={mockStats} />)

    // Should show variance for expenses (over budget)
    const varianceElements = screen.getAllByText(/⚠/)
    expect(varianceElements.length).toBeGreaterThan(0)
  })

  it("applies correct color classes for income and expenses", () => {
    const { container } = render(<MonthViewSummaryCards stats={mockStats} />)

    // Check for green text (income)
    const greenElements = container.querySelectorAll(".text-green-600")
    expect(greenElements.length).toBeGreaterThan(0)

    // Check for red text (expenses)
    const redElements = container.querySelectorAll(".text-red-600")
    expect(redElements.length).toBeGreaterThan(0)
  })

  it("handles empty stats gracefully", () => {
    const emptyStats: MonthPlanStats = {
      expected_count: 0,
      matched_count: 0,
      pending_count: 0,
      overdue_count: 0,
      skipped_count: 0,
      total_expected_expenses: {},
      total_actual_expenses: {},
      total_expected_income: {},
      total_actual_income: {},
    }

    render(<MonthViewSummaryCards stats={emptyStats} />)

    // Should still render the 4 cards
    expect(screen.getByText("EXPECTED INCOME")).toBeInTheDocument()
    expect(screen.getByText("ACTUAL INCOME")).toBeInTheDocument()
  })
})
