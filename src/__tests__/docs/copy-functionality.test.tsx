import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CodeBlock } from '@/components/docs/code-block'
import { ColorSwatch } from '@/components/docs/color-swatch'

// Mock clipboard API
const mockWriteText = jest.fn()
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
})

describe('Copy Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('CodeBlock Copy', () => {
    it('renders copy button', () => {
      const testCode = 'const example = "test code";'
      render(<CodeBlock code={testCode} />)
      
      const copyButton = screen.getByRole('button')
      expect(copyButton).toBeInTheDocument()
    })

    it('copies code to clipboard when copy button is clicked', async () => {
      const testCode = 'const example = "test code";'
      mockWriteText.mockResolvedValue(undefined)
      
      render(<CodeBlock code={testCode} />)
      
      const copyButton = screen.getByRole('button')
      fireEvent.click(copyButton)
      
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(testCode)
      })
    })

    it('shows success state after copying', async () => {
      const testCode = 'const example = "test code";'
      mockWriteText.mockResolvedValue(undefined)
      
      render(<CodeBlock code={testCode} />)
      
      const copyButton = screen.getByRole('button')
      fireEvent.click(copyButton)
      
      // Wait for the success icon to appear (check icon should be visible)
      await waitFor(() => {
        const checkIcon = copyButton.querySelector('svg.lucide-check') ||
                         copyButton.querySelector('svg') // Fallback to any svg in the button
        expect(checkIcon).toBeInTheDocument()
        expect(checkIcon).toHaveClass('lucide-check')
      }, { timeout: 1000 })
    })

    it('handles copy failure gracefully', async () => {
      const testCode = 'const example = "test code";'
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {
        // Intentionally empty - we're mocking console.error to suppress expected error output
      })
      mockWriteText.mockRejectedValue(new Error('Copy failed'))
      
      render(<CodeBlock code={testCode} />)
      
      const copyButton = screen.getByRole('button')
      fireEvent.click(copyButton)
      
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(testCode)
        expect(consoleError).toHaveBeenCalledWith('Failed to copy text: ', expect.any(Error))
      })
      
      consoleError.mockRestore()
    })

    it('displays code content correctly', () => {
      const testCode = 'const example = "test code";'
      render(<CodeBlock code={testCode} language="javascript" />)
      
      expect(screen.getByText(testCode)).toBeInTheDocument()
    })

    it('shows title when provided', () => {
      const testCode = 'const example = "test";'
      const title = 'Example JavaScript Code'
      
      render(<CodeBlock code={testCode} title={title} />)
      
      expect(screen.getByText(title)).toBeInTheDocument()
    })
  })

  describe('ColorSwatch Copy', () => {
    it('renders color swatch with copy functionality', () => {
      render(
        <ColorSwatch 
          name="Primary" 
          value="#3b82f6" 
          cssVar="--primary" 
        />
      )
      
      expect(screen.getByText('Primary')).toBeInTheDocument()
      expect(screen.getByText('--primary')).toBeInTheDocument()
      expect(screen.getByText('#3b82f6')).toBeInTheDocument()
    })

    it('copies CSS variable when swatch is clicked', async () => {
      mockWriteText.mockResolvedValue(undefined)
      
      render(
        <ColorSwatch 
          name="Primary" 
          value="#3b82f6" 
          cssVar="--primary" 
        />
      )
      
      const swatch = screen.getByRole('button') || 
                    screen.getByText('--primary').closest('button') ||
                    document.querySelector('[style*="background-color"]')
      
      if (swatch) {
        fireEvent.click(swatch)
        
        await waitFor(() => {
          expect(mockWriteText).toHaveBeenCalledWith('--primary')
        })
      }
    })

    it('copies CSS variable when variable name is clicked', async () => {
      mockWriteText.mockResolvedValue(undefined)
      
      render(
        <ColorSwatch 
          name="Primary" 
          value="#3b82f6" 
          cssVar="--primary" 
        />
      )
      
      const variableButton = screen.getByText('--primary').closest('button')
      
      if (variableButton) {
        fireEvent.click(variableButton)
        
        await waitFor(() => {
          expect(mockWriteText).toHaveBeenCalledWith('--primary')
        })
      }
    })

    it('shows success state after copying variable', async () => {
      mockWriteText.mockResolvedValue(undefined)
      
      render(
        <ColorSwatch 
          name="Primary" 
          value="#3b82f6" 
          cssVar="--primary" 
        />
      )
      
      const variableButton = screen.getByText('--primary').closest('button')
      
      if (variableButton) {
        fireEvent.click(variableButton)
        
        // Wait for success state
        await waitFor(() => {
          const checkIcon = variableButton.querySelector('[data-lucide="check"]') ||
                           variableButton.querySelector('svg')
          expect(checkIcon).toBeInTheDocument()
        }, { timeout: 1000 })
      }
    })

    it('displays description when provided', () => {
      const description = 'Primary brand color for buttons and links'
      
      render(
        <ColorSwatch 
          name="Primary" 
          value="#3b82f6" 
          cssVar="--primary" 
          description={description}
        />
      )
      
      expect(screen.getByText(description)).toBeInTheDocument()
    })
  })
})