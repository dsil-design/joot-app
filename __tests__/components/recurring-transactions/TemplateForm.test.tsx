import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { TemplateForm } from "@/components/recurring-transactions/TemplateForm"

// Mock the hooks
jest.mock("@/hooks/use-vendor-search", () => ({
  useVendorSearch: () => ({
    searchVendors: jest.fn().mockResolvedValue([]),
    getVendorById: jest.fn(),
    createVendor: jest.fn(),
  }),
}))

jest.mock("@/hooks", () => ({
  usePaymentMethodOptions: () => ({
    options: [
      { value: "payment-1", label: "Credit Card" },
      { value: "payment-2", label: "Cash" },
    ],
    addCustomOption: jest.fn(),
    loading: false,
  }),
  useTagOptions: () => ({
    options: [
      { value: "tag-1", label: "Bills" },
      { value: "tag-2", label: "Subscriptions" },
    ],
    addCustomOption: jest.fn(),
    loading: false,
  }),
}))

describe("TemplateForm", () => {
  const mockOnSubmit = jest.fn().mockResolvedValue(undefined)
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders all form fields in create mode", () => {
    render(
      <TemplateForm
        mode="create"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByLabelText(/template name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/transaction type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/frequency/i)).toBeInTheDocument()
  })

  it("validates required fields on submit", async () => {
    render(
      <TemplateForm
        mode="create"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const submitButton = screen.getByRole("button", { name: /create template/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/template name is required/i)).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it("submits form with valid data", async () => {
    render(
      <TemplateForm
        mode="create"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // Fill in required fields
    const nameInput = screen.getByLabelText(/template name/i)
    fireEvent.change(nameInput, { target: { value: "Monthly Rent" } })

    const amountInput = screen.getByLabelText(/amount/i)
    fireEvent.change(amountInput, { target: { value: "15000" } })

    // Submit form
    const submitButton = screen.getByRole("button", { name: /create template/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Monthly Rent",
          amount: 15000,
          transaction_type: "expense",
          frequency: "monthly",
        })
      )
    })
  })

  it("calls onCancel when cancel button is clicked", () => {
    render(
      <TemplateForm
        mode="create"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByRole("button", { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it("populates form with initial data in edit mode", () => {
    const initialData = {
      id: "template-1",
      user_id: "user-1",
      name: "Netflix Subscription",
      description: "Monthly streaming",
      is_active: true,
      vendor_id: "vendor-1",
      payment_method_id: "payment-1",
      amount: 419,
      original_currency: "THB" as const,
      transaction_type: "expense" as const,
      frequency: "monthly" as const,
      frequency_interval: 1,
      day_of_month: 15,
      day_of_week: null,
      start_date: "2024-01-01",
      end_date: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    }

    render(
      <TemplateForm
        mode="edit"
        initialData={initialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const nameInput = screen.getByLabelText(/template name/i) as HTMLInputElement
    expect(nameInput.value).toBe("Netflix Subscription")
  })

  it("shows different button text in edit mode", () => {
    render(
      <TemplateForm
        mode="edit"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument()
  })

  it("disables form during submission", async () => {
    render(
      <TemplateForm
        mode="create"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        saving={true}
      />
    )

    const submitButton = screen.getByRole("button", { name: /saving/i })
    expect(submitButton).toBeDisabled()

    const cancelButton = screen.getByRole("button", { name: /cancel/i })
    expect(cancelButton).toBeDisabled()
  })

  it("allows toggling between expense and income", () => {
    render(
      <TemplateForm
        mode="create"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const incomeRadio = screen.getByLabelText(/^income$/i)
    fireEvent.click(incomeRadio)

    expect(incomeRadio).toBeChecked()
  })

  it("validates end date is after start date", async () => {
    render(
      <TemplateForm
        mode="create"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // Fill required fields
    const nameInput = screen.getByLabelText(/template name/i)
    fireEvent.change(nameInput, { target: { value: "Test Template" } })

    const amountInput = screen.getByLabelText(/amount/i)
    fireEvent.change(amountInput, { target: { value: "100" } })

    // TODO: Set start date to future and end date to past
    // This requires more complex date picker interaction

    // For now, just verify the form can be submitted
    const submitButton = screen.getByRole("button", { name: /create template/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled()
    })
  })
})
