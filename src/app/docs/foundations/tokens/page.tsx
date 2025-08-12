"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { Copy, Check } from "lucide-react"
import { useState } from "react"

const semanticTokens = [
  {
    category: "Background",
    description: "Surface colors for different elements",
    tokens: [
      { name: "--background", description: "Primary background color for the application", lightValue: "white", darkValue: "zinc-950" },
      { name: "--card", description: "Background color for card components", lightValue: "white", darkValue: "zinc-900" },
      { name: "--popover", description: "Background color for popover components", lightValue: "white", darkValue: "zinc-900" },
      { name: "--muted", description: "Subtle background color for less prominent elements", lightValue: "zinc-100", darkValue: "zinc-800" },
      { name: "--accent", description: "Background color for accent elements", lightValue: "zinc-100", darkValue: "zinc-800" },
    ]
  },
  {
    category: "Text",
    description: "Text colors for different content types",
    tokens: [
      { name: "--foreground", description: "Primary text color", lightValue: "zinc-950", darkValue: "zinc-50" },
      { name: "--card-foreground", description: "Text color on card backgrounds", lightValue: "zinc-950", darkValue: "zinc-50" },
      { name: "--popover-foreground", description: "Text color on popover backgrounds", lightValue: "zinc-950", darkValue: "zinc-50" },
      { name: "--muted-foreground", description: "Secondary text color for less prominent content", lightValue: "zinc-500", darkValue: "zinc-400" },
      { name: "--accent-foreground", description: "Text color on accent backgrounds", lightValue: "zinc-900", darkValue: "zinc-50" },
    ]
  },
  {
    category: "Interactive",
    description: "Colors for interactive elements and states",
    tokens: [
      { name: "--primary", description: "Primary action color", lightValue: "blue-600", darkValue: "blue-600" },
      { name: "--primary-foreground", description: "Text color on primary backgrounds", lightValue: "white", darkValue: "zinc-900" },
      { name: "--secondary", description: "Secondary action color", lightValue: "zinc-100", darkValue: "zinc-800" },
      { name: "--secondary-foreground", description: "Text color on secondary backgrounds", lightValue: "zinc-900", darkValue: "zinc-50" },
      { name: "--destructive", description: "Destructive action color", lightValue: "red-600", darkValue: "red-700" },
      { name: "--destructive-foreground", description: "Text color on destructive backgrounds", lightValue: "white", darkValue: "zinc-50" },
    ]
  },
  {
    category: "Borders & Inputs",
    description: "Colors for borders, dividers, and form elements",
    tokens: [
      { name: "--border", description: "Default border color", lightValue: "zinc-200", darkValue: "zinc-800" },
      { name: "--input", description: "Input border color", lightValue: "zinc-200", darkValue: "zinc-800" },
      { name: "--ring", description: "Focus ring color", lightValue: "blue-600", darkValue: "blue-400" },
    ]
  },
  {
    category: "Sidebar",
    description: "Colors specific to sidebar navigation",
    tokens: [
      { name: "--sidebar-background", description: "Sidebar background color", lightValue: "zinc-50", darkValue: "zinc-900" },
      { name: "--sidebar-foreground", description: "Sidebar text color", lightValue: "zinc-700", darkValue: "zinc-50" },
      { name: "--sidebar-primary", description: "Sidebar primary element color", lightValue: "zinc-900", darkValue: "blue-600" },
      { name: "--sidebar-primary-foreground", description: "Text on sidebar primary elements", lightValue: "zinc-50", darkValue: "zinc-50" },
      { name: "--sidebar-accent", description: "Sidebar accent color", lightValue: "zinc-100", darkValue: "zinc-800" },
      { name: "--sidebar-accent-foreground", description: "Text on sidebar accent elements", lightValue: "zinc-900", darkValue: "zinc-50" },
      { name: "--sidebar-border", description: "Sidebar border color", lightValue: "zinc-200", darkValue: "zinc-800" },
      { name: "--sidebar-ring", description: "Sidebar focus ring color", lightValue: "blue-600", darkValue: "blue-400" },
    ]
  }
]

const primitiveTokens = [
  {
    category: "Base Colors",
    tokens: [
      { name: "--black", value: "#000000" },
      { name: "--white", value: "#ffffff" },
      { name: "--transparent", value: "#ffffff00" },
    ]
  },
  {
    category: "Zinc Scale",
    description: "Primary neutral color palette",
    tokens: [
      { name: "--zinc-50", value: "#fafafa" },
      { name: "--zinc-100", value: "#f4f4f5" },
      { name: "--zinc-200", value: "#e4e4e7" },
      { name: "--zinc-300", value: "#d4d4d8" },
      { name: "--zinc-400", value: "#9f9fa9" },
      { name: "--zinc-500", value: "#71717b" },
      { name: "--zinc-600", value: "#52525c" },
      { name: "--zinc-700", value: "#3f3f46" },
      { name: "--zinc-800", value: "#27272a" },
      { name: "--zinc-900", value: "#18181b" },
      { name: "--zinc-950", value: "#09090b" },
    ]
  },
  {
    category: "Blue Scale", 
    description: "Primary brand color palette",
    tokens: [
      { name: "--blue-50", value: "#eff6ff" },
      { name: "--blue-100", value: "#dbeafe" },
      { name: "--blue-200", value: "#bedbff" },
      { name: "--blue-300", value: "#8ec5ff" },
      { name: "--blue-400", value: "#51a2ff" },
      { name: "--blue-500", value: "#2b7fff" },
      { name: "--blue-600", value: "#155dfc" },
      { name: "--blue-700", value: "#1447e6" },
      { name: "--blue-800", value: "#193cb8" },
      { name: "--blue-900", value: "#1c398e" },
      { name: "--blue-950", value: "#162456" },
    ]
  },
  {
    category: "Red Scale",
    description: "Error and destructive action colors",
    tokens: [
      { name: "--red-50", value: "#fef2f2" },
      { name: "--red-100", value: "#ffe2e2" },
      { name: "--red-200", value: "#ffc9c9" },
      { name: "--red-300", value: "#ffa2a2" },
      { name: "--red-400", value: "#ff6467" },
      { name: "--red-500", value: "#fb2c36" },
      { name: "--red-600", value: "#e7000b" },
      { name: "--red-700", value: "#c10007" },
      { name: "--red-800", value: "#9f0712" },
      { name: "--red-900", value: "#82181a" },
      { name: "--red-950", value: "#460809" },
    ]
  }
]

const otherTokens = [
  {
    category: "Radius",
    description: "Border radius values for consistent rounded corners",
    tokens: [
      { name: "--radius", value: "8", description: "Base border radius value in pixels" },
      { name: "--radius-sm", value: "calc(var(--radius) * 1px - 4px)", description: "Small radius (4px)" },
      { name: "--radius-md", value: "calc(var(--radius) * 1px - 2px)", description: "Medium radius (6px)" },
      { name: "--radius-lg", value: "calc(var(--radius) * 1px)", description: "Large radius (8px)" },
      { name: "--radius-xl", value: "calc(var(--radius) * 1px + 4px)", description: "Extra large radius (12px)" },
    ]
  },
  {
    category: "Typography",
    description: "Font family tokens",
    tokens: [
      { 
        name: "--font-geist-sans", 
        value: "'Geist Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
        description: "Primary sans-serif font family"
      },
      { 
        name: "--font-geist-mono", 
        value: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        description: "Monospace font family for code"
      },
    ]
  }
]

interface Token {
  name: string
  description?: string
  value?: string
  lightValue?: string
  darkValue?: string
}

function TokenDisplay({ token, showValue = false }: { token: Token, showValue?: boolean }) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to copy text: ", err)
    }
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <code className="text-sm font-mono">{token.name}</code>
          <button
            onClick={() => copyToClipboard(`var(${token.name})`)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
        {token.description && (
          <p className="text-xs text-muted-foreground">{token.description}</p>
        )}
        {showValue && token.value && (
          <code className="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">{token.value}</code>
        )}
        {token.lightValue && token.darkValue && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Light: {token.lightValue}</span>
            <span>Dark: {token.darkValue}</span>
          </div>
        )}
      </div>
      {token.name.startsWith('--') && !token.name.includes('font') && (
        <div 
          className="w-8 h-8 rounded border"
          style={{ backgroundColor: `var(${token.name})` }}
        />
      )}
    </div>
  )
}

export default function TokensPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Design Tokens</h1>
        <p className="text-lg text-muted-foreground">
          Design tokens are the visual design atoms of the design system. They store visual design attributes like colors, typography, and spacing.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Overview</h2>
        <p className="text-muted-foreground">
          Our design token system is built using CSS custom properties, enabling consistent theming, 
          easy maintenance, and automatic dark mode support. Tokens are organized into semantic and 
          primitive categories for maximum flexibility and maintainability.
        </p>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-green-600">Benefits</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Consistent visual language across all components</li>
              <li>Easy theme customization and dark mode support</li>
              <li>Centralized design decision management</li>
              <li>Automatic updates across the entire application</li>
              <li>Better designer-developer communication</li>
              <li>Scalable design system architecture</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Token Types</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><strong>Semantic Tokens:</strong> Purpose-driven (--primary, --background)</li>
              <li><strong>Primitive Tokens:</strong> Raw values (--blue-600, --zinc-100)</li>
              <li><strong>Component Tokens:</strong> Component-specific (--button-height)</li>
              <li><strong>System Tokens:</strong> Layout and spacing (--radius, --font-size)</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Semantic Tokens</h2>
          <p className="text-muted-foreground">
            Semantic tokens represent the intended use of a color rather than its specific value. 
            They automatically adapt between light and dark themes.
          </p>
        </div>

        {semanticTokens.map((category) => (
          <div key={category.category} className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold">{category.category}</h3>
              {category.description && (
                <p className="text-sm text-muted-foreground">{category.description}</p>
              )}
            </div>
            
            <div className="space-y-2 group">
              {category.tokens.map((token) => (
                <TokenDisplay key={token.name} token={token} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Primitive Tokens</h2>
          <p className="text-muted-foreground">
            Primitive tokens are the raw color values that semantic tokens reference. 
            They remain consistent across themes.
          </p>
        </div>

        {primitiveTokens.map((category) => (
          <div key={category.category} className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold">{category.category}</h3>
              {category.description && (
                <p className="text-sm text-muted-foreground">{category.description}</p>
              )}
            </div>
            
            <div className="grid gap-2 md:grid-cols-2 group">
              {category.tokens.map((token) => (
                <TokenDisplay key={token.name} token={token} showValue />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">System Tokens</h2>
          <p className="text-muted-foreground">
            System tokens define non-color design properties like border radius and typography.
          </p>
        </div>

        {otherTokens.map((category) => (
          <div key={category.category} className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold">{category.category}</h3>
              {category.description && (
                <p className="text-sm text-muted-foreground">{category.description}</p>
              )}
            </div>
            
            <div className="space-y-2 group">
              {category.tokens.map((token) => (
                <TokenDisplay key={token.name} token={token} showValue />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <p className="text-muted-foreground">
          How to use design tokens in your CSS and components.
        </p>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">CSS Custom Properties</h3>
            <CodeBlock
              language="css"
              code={`/* Using semantic tokens - recommended */
.my-component {
  background-color: var(--background);
  color: var(--foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

/* Using primitive tokens */
.custom-element {
  background-color: var(--blue-600);
  color: var(--white);
}`}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Tailwind CSS Classes</h3>
            <CodeBlock
              language="tsx"
              code={`// Tailwind automatically maps to our tokens
<div className="bg-background text-foreground border border-border rounded-lg">
  Content using semantic tokens
</div>

// Using primitive colors
<div className="bg-blue-600 text-white">
  Using primitive blue token
</div>`}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">React Components</h3>
            <CodeBlock
              language="tsx"
              code={`import { cn } from "@/lib/utils"

interface CardProps {
  className?: string
  children: React.ReactNode
}

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn(
      // Using semantic tokens via Tailwind classes
      "bg-card text-card-foreground border border-border rounded-lg p-6",
      className
    )}>
      {children}
    </div>
  )
}`}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Theme Customization</h3>
            <CodeBlock
              language="css"
              code={`/* Customizing the theme */
:root {
  --primary: var(--green-600); /* Change primary color to green */
  --radius: 12; /* Increase border radius globally */
}

/* Dark theme overrides */
.dark {
  --primary: var(--green-400); /* Lighter green for dark mode */
}`}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Token Architecture</h2>
        <p className="text-muted-foreground">
          Understanding the hierarchy and relationship between different token types.
        </p>
        
        <ComponentDemo>
          <div className="w-full max-w-2xl space-y-4">
            <div className="text-center space-y-2">
              <div className="bg-blue-100 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-semibold">Semantic Tokens</h4>
                <p className="text-sm text-muted-foreground">--primary, --background, --foreground</p>
                <p className="text-xs text-muted-foreground">Purpose-driven, theme-aware</p>
              </div>
              <div className="text-2xl">↓</div>
              <div className="bg-green-100 dark:bg-green-900/20 rounded-lg p-4">
                <h4 className="font-semibold">Primitive Tokens</h4>
                <p className="text-sm text-muted-foreground">--blue-600, --zinc-100, --red-500</p>
                <p className="text-xs text-muted-foreground">Raw values, theme-independent</p>
              </div>
              <div className="text-2xl">↓</div>
              <div className="bg-purple-100 dark:bg-purple-900/20 rounded-lg p-4">
                <h4 className="font-semibold">CSS Values</h4>
                <p className="text-sm text-muted-foreground">#155dfc, #f4f4f5, #e7000b</p>
                <p className="text-xs text-muted-foreground">Actual color values</p>
              </div>
            </div>
          </div>
        </ComponentDemo>

        <CodeBlock
          language="css"
          code={`/* Token hierarchy in action */

/* 1. CSS Values (lowest level) */
:root {
  --blue-600: #155dfc;
  --white: #ffffff;
}

/* 2. Primitive tokens reference CSS values */
:root {
  --primary-raw: var(--blue-600);
}

/* 3. Semantic tokens reference primitives */
:root {
  --primary: var(--primary-raw);
  --primary-foreground: var(--white);
}

.dark {
  --primary: var(--blue-400); /* Different value in dark mode */
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Best Practices</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-green-600">Do</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use semantic tokens for component styling when possible</li>
              <li>Follow the token naming conventions</li>
              <li>Test token changes in both light and dark modes</li>
              <li>Document custom tokens and their intended use</li>
              <li>Use primitive tokens for one-off customizations</li>
              <li>Keep token values consistent with the design system</li>
              <li>Update tokens centrally rather than overriding in components</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-red-600">Don't</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Hardcode color values instead of using tokens</li>
              <li>Create too many semantic tokens without clear purpose</li>
              <li>Mix token systems or use inconsistent naming</li>
              <li>Override semantic tokens in components</li>
              <li>Use primitive tokens for semantic purposes</li>
              <li>Change token values without considering global impact</li>
              <li>Create tokens that don't work across themes</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            Design tokens should support accessibility requirements:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Ensure sufficient color contrast ratios (4.5:1 for normal text, 3:1 for large text)</li>
            <li>Test token combinations in both light and dark modes</li>
            <li>Avoid using color alone to convey information</li>
            <li>Provide high contrast mode alternatives when needed</li>
            <li>Test with screen readers and assistive technologies</li>
            <li>Consider users with color vision deficiencies</li>
          </ul>
        </div>
      </section>
    </div>
  )
}