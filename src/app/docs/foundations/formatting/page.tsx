import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { formatCurrency } from "@/lib/utils"

const currencyExamples = [
  { currency: 'USD', amounts: [1000, 15000, 1000000], symbol: '$', name: 'US Dollar' },
  { currency: 'THB', amounts: [1000, 35000, 1000000], symbol: '฿', name: 'Thai Baht' },
  { currency: 'EUR', amounts: [1000, 12000, 1000000], symbol: '€', name: 'Euro' },
  { currency: 'GBP', amounts: [1000, 8000, 1000000], symbol: '£', name: 'British Pound' },
  { currency: 'JPY', amounts: [150000, 1800000, 150000000], symbol: '¥', name: 'Japanese Yen' },
]

const formatOptions = [
  { 
    name: 'Standard', 
    options: {}, 
    description: 'Default formatting with 2 decimal places and commas'
  },
  { 
    name: 'No Decimals', 
    options: { minimumFractionDigits: 0, maximumFractionDigits: 0 }, 
    description: 'Integer display for whole amounts'
  },
  { 
    name: 'High Precision', 
    options: { maximumFractionDigits: 4 }, 
    description: 'Up to 4 decimal places for precise calculations'
  },
  { 
    name: 'No Grouping', 
    options: { useGrouping: false }, 
    description: 'Disable thousands separators'
  },
]

export default function FormattingPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Currency Formatting</h1>
        <p className="text-lg text-muted-foreground">
          Global currency formatting utilities for consistent monetary value display across the application.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Overview</h2>
        <p className="text-muted-foreground">
          The <code className="bg-muted px-2 py-1 rounded text-sm">formatCurrency()</code> function provides 
          consistent formatting for all monetary values, including automatic comma separators for thousands 
          and proper currency symbols.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Basic Usage</h2>
        <p className="text-muted-foreground">
          Import and use the formatCurrency utility from the global utils module.
        </p>
        
        <ComponentDemo>
          <div className="grid grid-cols-2 gap-6 w-full">
            <div className="space-y-3">
              <h3 className="font-medium">Small Amounts</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">USD:</span>
                  <span className="font-mono">{formatCurrency(1000, 'USD' as any)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">THB:</span>
                  <span className="font-mono">{formatCurrency(1000, 'THB' as any)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">EUR:</span>
                  <span className="font-mono">{formatCurrency(1000, 'EUR' as any)}</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-medium">Large Amounts</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">USD:</span>
                  <span className="font-mono">{formatCurrency(1500000, 'USD' as any)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">THB:</span>
                  <span className="font-mono">{formatCurrency(1500000, 'THB' as any)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">EUR:</span>
                  <span className="font-mono">{formatCurrency(1500000, 'EUR' as any)}</span>
                </div>
              </div>
            </div>
          </div>
        </ComponentDemo>

        <CodeBlock
          code={`import { formatCurrency } from '@/lib/utils'

// Basic usage with automatic comma separators
formatCurrency(1000, 'USD')      // → "$1,000.00"
formatCurrency(1500000, 'THB')   // → "฿1,500,000.00"
formatCurrency(50000, 'EUR')     // → "€50,000.00"`}
          language="typescript"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Supported Currencies</h2>
        <p className="text-muted-foreground">
          The utility supports all 34+ currencies defined in the database schema with proper symbols.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {currencyExamples.map((currency) => (
            <div key={currency.currency} className="space-y-3">
              <h3 className="font-medium">
                {currency.symbol} {currency.name} ({currency.currency})
              </h3>
              <ComponentDemo>
                <div className="space-y-2">
                  {currency.amounts.map((amount, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{amount.toLocaleString()}:</span>
                      <span className="font-mono">{formatCurrency(amount, currency.currency as any)}</span>
                    </div>
                  ))}
                </div>
              </ComponentDemo>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Advanced Options</h2>
        <p className="text-muted-foreground">
          Customize formatting behavior with optional parameters for precision and grouping.
        </p>

        <div className="space-y-6">
          {formatOptions.map((option) => (
            <div key={option.name} className="space-y-3">
              <div>
                <h3 className="font-medium">{option.name}</h3>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
              
              <ComponentDemo>
                <div className="grid grid-cols-3 gap-4 w-full text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">$1,234.56:</span>
                    <span className="font-mono">{formatCurrency(1234.56, 'USD' as any, option.options)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">฿50,000:</span>
                    <span className="font-mono">{formatCurrency(50000, 'THB' as any, option.options)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">€1,000,000:</span>
                    <span className="font-mono">{formatCurrency(1000000, 'EUR' as any, option.options)}</span>
                  </div>
                </div>
              </ComponentDemo>
            </div>
          ))}
        </div>

        <CodeBlock
          code={`// Custom decimal places
formatCurrency(1234.567, 'USD', { 
  maximumFractionDigits: 3 
})  // → "$1,234.567"

// No grouping separators
formatCurrency(1000000, 'THB', { 
  useGrouping: false 
})  // → "฿1000000.00"

// Integer display (useful for JPY, KRW)
formatCurrency(1500, 'JPY', { 
  minimumFractionDigits: 0,
  maximumFractionDigits: 0 
})  // → "¥1,500"`}
          language="typescript"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Component Integration</h2>
        <p className="text-muted-foreground">
          The utility is automatically integrated into key components and can be used in custom implementations.
        </p>

        <div className="space-y-4">
          <h3 className="font-medium">Transaction Card</h3>
          <ComponentDemo>
            <div className="w-full max-w-md mx-auto">
              <div className="bg-card border rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-medium">Coffee Shop Payment</p>
                    <p className="text-sm text-muted-foreground">Local Cafe</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-medium text-xl">{formatCurrency(1250, 'THB' as any)}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(35.71, 'USD' as any)}</p>
                  </div>
                </div>
              </div>
            </div>
          </ComponentDemo>

          <CodeBlock
            code={`// In TransactionCard component (automatic)
<TransactionCard transaction={transaction} viewMode="recorded" />

// Manual usage in custom components
<div className="text-xl font-medium">
  {formatCurrency(transaction.amount, transaction.currency)}
</div>

// With optional conversion display
<div className="space-y-1">
  <p className="font-medium text-xl">
    {formatCurrency(primaryAmount, primaryCurrency)}
  </p>
  {secondaryAmount && (
    <p className="text-sm text-muted-foreground">
      {formatCurrency(secondaryAmount, secondaryCurrency)}
    </p>
  )}
</div>`}
            language="tsx"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <div className="space-y-4">
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-mono text-lg">formatCurrency(amount, currency, options?)</h3>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-3 gap-4">
                <strong>Parameter</strong>
                <strong>Type</strong>
                <strong>Description</strong>
                
                <code>amount</code>
                <code>number</code>
                <span>The numeric amount to format</span>
                
                <code>currency</code>
                <code>CurrencyType</code>
                <span>Currency code from database schema</span>
                
                <code>options</code>
                <code>object?</code>
                <span>Optional formatting configuration</span>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-mono">Options Interface</h3>
            <CodeBlock
              code={`interface FormatOptions {
  minimumFractionDigits?: number  // Default: 2
  maximumFractionDigits?: number  // Default: 2
  useGrouping?: boolean          // Default: true
}`}
              language="typescript"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage Guidelines</h2>
        <div className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-green-600">Do</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Use formatCurrency() for all user-facing monetary values</li>
                <li>Choose appropriate decimal places for each currency type</li>
                <li>Test formatting with various amount sizes</li>
                <li>Use consistent formatting within the same UI context</li>
                <li>Consider accessibility with proper contrast and sizing</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-red-600">Don't</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Use formatCurrency() for calculations or API data</li>
                <li>Hardcode currency symbols or decimal places</li>
                <li>Mix formatted and unformatted values in the same view</li>
                <li>Forget to handle edge cases (zero, negative values)</li>
                <li>Use different formatting for the same currency type</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Performance</h2>
        <p className="text-muted-foreground">
          The utility uses native <code className="bg-muted px-2 py-1 rounded text-sm">Intl.NumberFormat</code> for 
          optimal performance and maintains currency symbol mappings for efficient lookups.
        </p>
        
        <div className="bg-muted/50 border-l-4 border-blue-500 p-4">
          <p className="text-sm">
            <strong>Performance Tip:</strong> The formatter creates new Intl.NumberFormat instances per call, 
            which is efficient for most use cases. For high-frequency formatting operations, consider 
            caching formatters at the component level.
          </p>
        </div>
      </section>
    </div>
  )
}