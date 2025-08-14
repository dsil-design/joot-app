import * as React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe, toHaveNoViolations } from "jest-axe"

import { DatePicker, DateInput } from "@/components/ui/date-picker"

expect.extend(toHaveNoViolations)

describe("DatePicker", () => {
  const mockOnDateChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders without crashing", () => {
      render(<DatePicker />)
      expect(screen.getByRole("textbox")).toBeInTheDocument()
    })

    it("displays placeholder text when no date is selected", () => {
      render(<DatePicker placeholder="Select a date" />)
      expect(screen.getByPlaceholderText("Select a date")).toBeInTheDocument()
    })

    it("displays formatted date when date is provided", () => {
      const testDate = new Date("2024-03-13")
      render(
        <DatePicker 
          date={testDate} 
          formatStr="MMMM d, yyyy"
        />
      )
      expect(screen.getByDisplayValue("March 13, 2024")).toBeInTheDocument()
    })

    it("shows calendar icon button", () => {
      render(<DatePicker />)
      const calendarButton = screen.getByRole("button", { name: /open calendar/i })
      expect(calendarButton).toBeInTheDocument()
    })
  })

  describe("Text Input Interactions", () => {
    it("updates input value when user types", async () => {
      const user = userEvent.setup()
      render(<DatePicker onDateChange={mockOnDateChange} />)
      
      const input = screen.getByRole("textbox")
      await user.type(input, "March 15, 2024")
      
      expect(input).toHaveValue("March 15, 2024")
    })

    it("calls onDateChange when valid date is typed", async () => {
      const user = userEvent.setup()
      render(<DatePicker onDateChange={mockOnDateChange} />)
      
      const input = screen.getByRole("textbox")
      await user.type(input, "March 15, 2024")
      
      expect(mockOnDateChange).toHaveBeenCalled()
      const calledDate = mockOnDateChange.mock.calls[mockOnDateChange.mock.calls.length - 1][0]
      expect(calledDate).toBeInstanceOf(Date)
    })

    it("handles multiple date formats", async () => {
      const user = userEvent.setup()
      render(<DatePicker onDateChange={mockOnDateChange} />)
      
      const input = screen.getByRole("textbox")
      
      // Test MM/dd/yyyy format
      await user.clear(input)
      await user.type(input, "3/15/2024")
      expect(mockOnDateChange).toHaveBeenCalled()
      
      jest.clearAllMocks()
      
      // Test yyyy-MM-dd format
      await user.clear(input)
      await user.type(input, "2024-03-15")
      expect(mockOnDateChange).toHaveBeenCalled()
    })

    it("reformats input on blur when date is valid", async () => {
      const user = userEvent.setup()
      const testDate = new Date("2024-03-13")
      render(
        <DatePicker 
          date={testDate} 
          onDateChange={mockOnDateChange}
          formatStr="MMMM d, yyyy"
        />
      )
      
      const input = screen.getByRole("textbox")
      await user.clear(input)
      await user.type(input, "3/13/2024")
      await user.tab() // Trigger blur
      
      expect(input).toHaveValue("March 13, 2024")
    })

    it("calls onDateChange with undefined when input is cleared", async () => {
      const user = userEvent.setup()
      const testDate = new Date("2024-03-13")
      render(
        <DatePicker 
          date={testDate} 
          onDateChange={mockOnDateChange}
        />
      )
      
      const input = screen.getByRole("textbox")
      await user.clear(input)
      
      expect(mockOnDateChange).toHaveBeenCalledWith(undefined)
    })
  })

  describe("Calendar Popover Interactions", () => {
    it("opens calendar when calendar icon is clicked", async () => {
      const user = userEvent.setup()
      render(<DatePicker />)
      
      const calendarButton = screen.getByRole("button", { name: /open calendar/i })
      await user.click(calendarButton)
      
      await waitFor(() => {
        expect(screen.getByRole("grid")).toBeInTheDocument()
      })
    })

    it("closes calendar when date is selected from calendar", async () => {
      const user = userEvent.setup()
      render(<DatePicker onDateChange={mockOnDateChange} />)
      
      const calendarButton = screen.getByRole("button", { name: /open calendar/i })
      await user.click(calendarButton)
      
      await waitFor(() => {
        expect(screen.getByRole("grid")).toBeInTheDocument()
      })
      
      // Click on a date (day 15)
      const dayButton = screen.getByText("15")
      await user.click(dayButton)
      
      await waitFor(() => {
        expect(screen.queryByRole("grid")).not.toBeInTheDocument()
      })
    })

    it("calls onDateChange when a date is selected from calendar", async () => {
      const user = userEvent.setup()
      render(<DatePicker onDateChange={mockOnDateChange} />)
      
      const calendarButton = screen.getByRole("button", { name: /open calendar/i })
      await user.click(calendarButton)
      
      await waitFor(() => {
        expect(screen.getByRole("grid")).toBeInTheDocument()
      })
      
      const dayButton = screen.getByText("15")
      await user.click(dayButton)
      
      expect(mockOnDateChange).toHaveBeenCalledWith(expect.any(Date))
    })
  })

  describe("Keyboard Navigation", () => {
    it("opens calendar when Arrow Down is pressed on input", async () => {
      const user = userEvent.setup()
      render(<DatePicker />)
      
      const input = screen.getByRole("textbox")
      input.focus()
      
      await user.keyboard("{ArrowDown}")
      
      await waitFor(() => {
        expect(screen.getByRole("grid")).toBeInTheDocument()
      })
    })

    it("closes calendar when Escape is pressed", async () => {
      const user = userEvent.setup()
      render(<DatePicker />)
      
      const input = screen.getByRole("textbox")
      input.focus()
      
      // Open calendar
      await user.keyboard("{ArrowDown}")
      await waitFor(() => {
        expect(screen.getByRole("grid")).toBeInTheDocument()
      })
      
      // Close with Escape
      await user.keyboard("{Escape}")
      
      await waitFor(() => {
        expect(screen.queryByRole("grid")).not.toBeInTheDocument()
      })
    })
  })

  describe("Disabled State", () => {
    it("renders input and calendar button as disabled when disabled prop is true", () => {
      render(<DatePicker disabled />)
      
      const input = screen.getByRole("textbox")
      const calendarButton = screen.getByRole("button", { name: /open calendar/i })
      
      expect(input).toBeDisabled()
      expect(calendarButton).toBeDisabled()
    })

    it("does not open calendar when disabled", async () => {
      const user = userEvent.setup()
      render(<DatePicker disabled />)
      
      const calendarButton = screen.getByRole("button", { name: /open calendar/i })
      await user.click(calendarButton)
      
      expect(screen.queryByRole("grid")).not.toBeInTheDocument()
    })

    it("does not accept input when disabled", async () => {
      const user = userEvent.setup()
      render(<DatePicker disabled onDateChange={mockOnDateChange} />)
      
      const input = screen.getByRole("textbox")
      await user.type(input, "2024-03-15")
      
      expect(input).toHaveValue("")
      expect(mockOnDateChange).not.toHaveBeenCalled()
    })
  })

  describe("Custom Format", () => {
    it("formats date according to formatStr prop", () => {
      const testDate = new Date("2024-03-13")
      render(
        <DatePicker 
          date={testDate} 
          formatStr="yyyy-MM-dd"
        />
      )
      expect(screen.getByDisplayValue("2024-03-13")).toBeInTheDocument()
    })
  })

  describe("Label Support", () => {
    it("applies label as aria-label to input", () => {
      render(<DatePicker label="Subscription Date" />)
      const input = screen.getByRole("textbox")
      expect(input).toHaveAttribute("aria-label", "Subscription Date")
    })
  })

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      const testDate = new Date("2024-03-13")
      render(<DatePicker date={testDate} label="Date picker" />)
      
      const input = screen.getByRole("textbox")
      const calendarButton = screen.getByRole("button", { name: /open calendar/i })
      
      expect(input).toHaveAttribute("aria-label", "Date picker")
      expect(calendarButton).toHaveAttribute("aria-label", "Open calendar")
    })

    it("should not have any accessibility violations", async () => {
      const { container } = render(<DatePicker />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })
})

describe("DateInput (Legacy)", () => {
  const mockOnDateChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders without crashing", () => {
      render(<DateInput />)
      expect(screen.getByRole("textbox")).toBeInTheDocument()
    })

    it("displays placeholder text when no date is selected", () => {
      render(<DateInput placeholder="Enter date" />)
      expect(screen.getByPlaceholderText("Enter date")).toBeInTheDocument()
    })

    it("displays formatted date when date is provided", () => {
      const testDate = new Date("2024-03-13")
      render(
        <DateInput 
          date={testDate} 
          formatStr="MMMM d, yyyy"
        />
      )
      expect(screen.getByDisplayValue("March 13, 2024")).toBeInTheDocument()
    })
  })

  describe("Interactions", () => {
    it("updates input value when user types", async () => {
      const user = userEvent.setup()
      render(<DateInput onDateChange={mockOnDateChange} />)
      
      const input = screen.getByRole("textbox")
      await user.type(input, "March 15, 2024")
      
      expect(input).toHaveValue("March 15, 2024")
    })

    it("calls onDateChange when valid date is entered", async () => {
      const user = userEvent.setup()
      render(<DateInput onDateChange={mockOnDateChange} />)
      
      const input = screen.getByRole("textbox")
      await user.type(input, "2024-03-15")
      
      expect(mockOnDateChange).toHaveBeenCalled()
    })

    it("reformats input on blur when date is valid", async () => {
      const user = userEvent.setup()
      const testDate = new Date("2024-03-13")
      render(
        <DateInput 
          date={testDate} 
          onDateChange={mockOnDateChange}
          formatStr="MMMM d, yyyy"
        />
      )
      
      const input = screen.getByRole("textbox")
      await user.clear(input)
      await user.type(input, "3/13/2024")
      await user.tab() // Trigger blur
      
      expect(input).toHaveValue("March 13, 2024")
    })

    it("calls onDateChange with undefined when input is cleared", async () => {
      const user = userEvent.setup()
      const testDate = new Date("2024-03-13")
      render(
        <DateInput 
          date={testDate} 
          onDateChange={mockOnDateChange}
        />
      )
      
      const input = screen.getByRole("textbox")
      await user.clear(input)
      
      expect(mockOnDateChange).toHaveBeenCalledWith(undefined)
    })
  })

  describe("Disabled State", () => {
    it("renders as disabled when disabled prop is true", () => {
      render(<DateInput disabled />)
      const input = screen.getByRole("textbox")
      expect(input).toBeDisabled()
    })

    it("does not accept input when disabled", async () => {
      const user = userEvent.setup()
      render(<DateInput disabled onDateChange={mockOnDateChange} />)
      
      const input = screen.getByRole("textbox")
      await user.type(input, "2024-03-15")
      
      expect(input).toHaveValue("")
      expect(mockOnDateChange).not.toHaveBeenCalled()
    })
  })

  describe("Custom Format", () => {
    it("displays date in custom format", () => {
      const testDate = new Date("2024-03-13")
      render(
        <DateInput 
          date={testDate} 
          formatStr="yyyy-MM-dd"
        />
      )
      expect(screen.getByDisplayValue("2024-03-13")).toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("should not have any accessibility violations", async () => {
      const { container } = render(<DateInput />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it("maintains proper input semantics", () => {
      render(<DateInput />)
      const input = screen.getByRole("textbox")
      expect(input).toHaveAttribute("type", "text")
    })
  })
})