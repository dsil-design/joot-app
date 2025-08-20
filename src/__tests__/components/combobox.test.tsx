import * as React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe } from "jest-axe"

import { ComboBox, type ComboBoxOption } from "@/components/ui/combobox"

const testOptions: ComboBoxOption[] = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue.js" },
  { value: "angular", label: "Angular" },
  { value: "svelte", label: "Svelte" },
  { value: "solid", label: "Solid.js" },
]

const testOptionsWithDisabled: ComboBoxOption[] = [
  { value: "option1", label: "Option 1" },
  { value: "option2", label: "Option 2", disabled: true },
  { value: "option3", label: "Option 3" },
]

describe("ComboBox", () => {
  const mockOnValueChange = jest.fn()
  const mockOnAddNew = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders without crashing", () => {
      render(<ComboBox options={testOptions} />)
      expect(screen.getByRole("combobox")).toBeInTheDocument()
    })

    it("displays placeholder text when no value is selected", () => {
      render(
        <ComboBox 
          options={testOptions} 
          placeholder="Select an option..." 
        />
      )
      expect(screen.getByText("Select an option...")).toBeInTheDocument()
    })

    it("displays selected option label when value is provided", () => {
      render(
        <ComboBox 
          options={testOptions} 
          value="react" 
          placeholder="Select framework"
        />
      )
      expect(screen.getByText("React")).toBeInTheDocument()
    })

    it("shows chevron down icon", () => {
      render(<ComboBox options={testOptions} />)
      const chevronIcon = document.querySelector('svg')
      expect(chevronIcon).toBeInTheDocument()
    })

    it("applies custom className", () => {
      render(
        <ComboBox 
          options={testOptions} 
          className="custom-class" 
        />
      )
      const combobox = screen.getByRole("combobox")
      expect(combobox).toHaveClass("custom-class")
    })
  })

  describe("Dropdown Interaction", () => {
    it("opens dropdown when combobox is clicked", async () => {
      const user = userEvent.setup()
      render(<ComboBox options={testOptions} />)
      
      const combobox = screen.getByRole("combobox")
      await user.click(combobox)
      
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument()
      })
    })

    it("displays all options when dropdown is opened", async () => {
      const user = userEvent.setup()
      render(<ComboBox options={testOptions} />)
      
      const combobox = screen.getByRole("combobox")
      await user.click(combobox)
      
      await waitFor(() => {
        testOptions.forEach(option => {
          expect(screen.getByText(option.label)).toBeInTheDocument()
        })
      })
    })

    it("closes dropdown when an option is selected", async () => {
      const user = userEvent.setup()
      render(<ComboBox options={testOptions} onValueChange={mockOnValueChange} />)
      
      const combobox = screen.getByRole("combobox")
      await user.click(combobox)
      
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument()
      })
      
      const reactOption = screen.getByText("React")
      await user.click(reactOption)
      
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
      })
    })

    it("calls onValueChange when an option is selected", async () => {
      const user = userEvent.setup()
      render(<ComboBox options={testOptions} onValueChange={mockOnValueChange} />)
      
      const combobox = screen.getByRole("combobox")
      await user.click(combobox)
      
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument()
      })
      
      const vueOption = screen.getByText("Vue.js")
      await user.click(vueOption)
      
      expect(mockOnValueChange).toHaveBeenCalledWith("vue")
    })

    it("toggles selection when same option is clicked", async () => {
      const user = userEvent.setup()
      render(
        <ComboBox 
          options={testOptions} 
          value="react" 
          onValueChange={mockOnValueChange} 
        />
      )
      
      const combobox = screen.getByRole("combobox")
      await user.click(combobox)
      
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument()
      })
      
      const reactOption = screen.getAllByText("React")[1] // Get the one in dropdown
      await user.click(reactOption)
      
      expect(mockOnValueChange).toHaveBeenCalledWith("")
    })
  })

  describe("Search Functionality", () => {
    it("displays search input when dropdown is opened", async () => {
      const user = userEvent.setup()
      render(<ComboBox options={testOptions} searchPlaceholder="Search..." />)
      
      const combobox = screen.getByRole("combobox")
      await user.click(combobox)
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument()
      })
    })
  })

  describe("Add New Functionality", () => {
    it("does not show add new option when allowAdd is false", async () => {
      const user = userEvent.setup()
      render(
        <ComboBox 
          options={testOptions} 
          allowAdd={false}
          onAddNew={mockOnAddNew}
          placeholder="Select framework"
        />
      )
      
      const combobox = screen.getByRole("combobox")
      await user.click(combobox)
      
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument()
      })
      
      // Add new functionality should not be available when allowAdd is false
      expect(screen.queryByText(/Add new/)).not.toBeInTheDocument()
    })
  })

  describe("Disabled State", () => {
    it("renders as disabled when disabled prop is true", () => {
      render(<ComboBox options={testOptions} disabled />)
      const combobox = screen.getByRole("combobox")
      expect(combobox).toBeDisabled()
    })

    it("does not open dropdown when disabled", async () => {
      const user = userEvent.setup()
      render(<ComboBox options={testOptions} disabled />)
      
      const combobox = screen.getByRole("combobox")
      await user.click(combobox)
      
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })

    it("skips disabled options during interaction", async () => {
      const user = userEvent.setup()
      render(
        <ComboBox 
          options={testOptionsWithDisabled} 
          onValueChange={mockOnValueChange} 
        />
      )
      
      const combobox = screen.getByRole("combobox")
      await user.click(combobox)
      
      const disabledOption = screen.getByText("Option 2")
      await user.click(disabledOption)
      
      // Should not call onValueChange for disabled option
      expect(mockOnValueChange).not.toHaveBeenCalled()
    })
  })

  describe("Keyboard Navigation", () => {
    it("opens dropdown when Enter is pressed on combobox", async () => {
      const user = userEvent.setup()
      render(<ComboBox options={testOptions} />)
      
      const combobox = screen.getByRole("combobox")
      combobox.focus()
      
      await user.keyboard("{Enter}")
      
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument()
      })
    })

    it("opens dropdown when Space is pressed on combobox", async () => {
      const user = userEvent.setup()
      render(<ComboBox options={testOptions} />)
      
      const combobox = screen.getByRole("combobox")
      combobox.focus()
      
      await user.keyboard(" ")
      
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument()
      })
    })

    it("closes dropdown when Escape is pressed", async () => {
      const user = userEvent.setup()
      render(<ComboBox options={testOptions} />)
      
      const combobox = screen.getByRole("combobox")
      await user.click(combobox)
      
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument()
      })
      
      await user.keyboard("{Escape}")
      
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
      })
    })
  })

  describe("Size Variants", () => {
    it("applies small size variant", () => {
      render(<ComboBox options={testOptions} size="sm" />)
      const combobox = screen.getByRole("combobox")
      expect(combobox).toHaveClass("h-9")
    })

    it("applies default size variant", () => {
      render(<ComboBox options={testOptions} size="default" />)
      const combobox = screen.getByRole("combobox")
      expect(combobox).toHaveClass("h-10")
    })

    it("applies large size variant", () => {
      render(<ComboBox options={testOptions} size="lg" />)
      const combobox = screen.getByRole("combobox")
      expect(combobox).toHaveClass("h-11")
    })
  })

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      render(<ComboBox options={testOptions} label="Select framework" />)
      const combobox = screen.getByRole("combobox")
      
      expect(combobox).toHaveAttribute("aria-expanded", "false")
      expect(combobox).toHaveAttribute("aria-label", "Select framework")
    })

    it("updates aria-expanded when dropdown opens", async () => {
      const user = userEvent.setup()
      render(<ComboBox options={testOptions} />)
      
      const combobox = screen.getByRole("combobox")
      await user.click(combobox)
      
      await waitFor(() => {
        expect(combobox).toHaveAttribute("aria-expanded", "true")
      })
    })

    it("should not have any accessibility violations", async () => {
      const { container } = render(
        <ComboBox 
          options={testOptions} 
          placeholder="Select framework" 
          label="Framework selection"
        />
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it("should not have accessibility violations when dropdown is open", async () => {
      const user = userEvent.setup()
      const { container } = render(
        <ComboBox 
          options={testOptions} 
          placeholder="Select framework" 
          label="Framework selection"
        />
      )
      
      const combobox = screen.getByRole("combobox")
      await user.click(combobox)
      
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument()
      })
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe("Selection Indicators", () => {
    it("shows check mark for selected option", async () => {
      const user = userEvent.setup()
      render(<ComboBox options={testOptions} value="react" />)
      
      const combobox = screen.getByRole("combobox")
      await user.click(combobox)
      
      await waitFor(() => {
        const checkIcon = screen.getByRole("listbox").querySelector('svg')
        expect(checkIcon).toBeInTheDocument()
        expect(checkIcon).toHaveClass("opacity-100")
      })
    })

    it("hides check mark for unselected options", async () => {
      const user = userEvent.setup()
      render(<ComboBox options={testOptions} value="react" />)
      
      const combobox = screen.getByRole("combobox")
      await user.click(combobox)
      
      await waitFor(() => {
        const listbox = screen.getByRole("listbox")
        const checkIcons = listbox.querySelectorAll('svg')
        // Should have multiple check icons, but only one should be visible (opacity-100)
        const visibleChecks = Array.from(checkIcons).filter(icon => 
          icon.classList.contains("opacity-100")
        )
        expect(visibleChecks).toHaveLength(1)
      })
    })
  })
})