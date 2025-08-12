"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Search, Eye, EyeOff, Mail } from "lucide-react"
import { useState } from "react"

export default function InputPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [searchValue, setSearchValue] = useState("")

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Input</h1>
        <p className="text-lg text-muted-foreground">
          Display a form input field with various types and states.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Default</h3>
            <ComponentDemo>
              <div className="w-80">
                <Input placeholder="Enter your email" />
              </div>
            </ComponentDemo>
            <CodeBlock code={`<Input placeholder="Enter your email" />`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Label</h3>
            <ComponentDemo>
              <div className="w-80 space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Enter your email" />
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="Enter your email" />
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Input Types</h3>
            <ComponentDemo>
              <div className="w-80 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="text">Text</Label>
                  <Input id="text" type="text" placeholder="Text input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-type">Email</Label>
                  <Input id="email-type" type="email" placeholder="email@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-type">Password</Label>
                  <Input id="password-type" type="password" placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">Number</Label>
                  <Input id="number" type="number" placeholder="123" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <Input id="search" type="search" placeholder="Search..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">URL</Label>
                  <Input id="url" type="url" placeholder="https://example.com" />
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<Input type="text" placeholder="Text input" />
<Input type="email" placeholder="email@example.com" />
<Input type="password" placeholder="••••••••" />
<Input type="number" placeholder="123" />
<Input type="search" placeholder="Search..." />
<Input type="url" placeholder="https://example.com" />`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Icons</h3>
            <ComponentDemo>
              <div className="w-80 space-y-4">
                <div className="space-y-2">
                  <Label>Search with Icon</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      className="pl-10" 
                      placeholder="Search..." 
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email with Icon</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-10" type="email" placeholder="Enter your email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Password with Toggle</Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Enter your password" 
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`// Search with Icon
<div className="relative">
  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  <Input className="pl-10" placeholder="Search..." />
</div>

// Email with Icon
<div className="relative">
  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  <Input className="pl-10" type="email" placeholder="Enter your email" />
</div>

// Password with Toggle
<div className="relative">
  <Input 
    type={showPassword ? "text" : "password"} 
    placeholder="Enter your password" 
    className="pr-10"
  />
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
    onClick={() => setShowPassword(!showPassword)}
  >
    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </Button>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">States</h3>
            <ComponentDemo>
              <div className="w-80 space-y-4">
                <div className="space-y-2">
                  <Label>Default</Label>
                  <Input placeholder="Default input" />
                </div>
                <div className="space-y-2">
                  <Label>Focused</Label>
                  <Input placeholder="This input is focused" autoFocus />
                </div>
                <div className="space-y-2">
                  <Label>Disabled</Label>
                  <Input placeholder="Disabled input" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Read Only</Label>
                  <Input value="Read only value" readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Invalid</Label>
                  <Input placeholder="Invalid input" aria-invalid="true" />
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<Input placeholder="Default input" />
<Input placeholder="This input is focused" autoFocus />
<Input placeholder="Disabled input" disabled />
<Input value="Read only value" readOnly />
<Input placeholder="Invalid input" aria-invalid="true" />`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">File Input</h3>
            <ComponentDemo>
              <div className="w-80 space-y-2">
                <Label htmlFor="file">Upload File</Label>
                <Input id="file" type="file" />
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="space-y-2">
  <Label htmlFor="file">Upload File</Label>
  <Input id="file" type="file" />
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Form Example</h3>
            <ComponentDemo>
              <div className="w-80 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="formEmail">Email</Label>
                  <Input id="formEmail" type="email" placeholder="john.doe@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" />
                </div>
                <Button className="w-full">Submit</Button>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<form className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="firstName">First Name</Label>
    <Input id="firstName" placeholder="John" />
  </div>
  <div className="space-y-2">
    <Label htmlFor="lastName">Last Name</Label>
    <Input id="lastName" placeholder="Doe" />
  </div>
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" placeholder="john.doe@example.com" />
  </div>
  <div className="space-y-2">
    <Label htmlFor="phone">Phone Number</Label>
    <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" />
  </div>
  <Button className="w-full">Submit</Button>
</form>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add input"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import { Input } from "@/components/ui/input"

export function Example() {
  return <Input placeholder="Enter text..." />
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <PropsTable
          data={[
            {
              prop: "type",
              type: "'text' | 'email' | 'password' | 'number' | 'search' | 'url' | 'tel' | 'file' | ...",
              default: "'text'",
              description: "The input type. Supports all HTML input types.",
            },
            {
              prop: "placeholder",
              type: "string",
              description: "Placeholder text to show when the input is empty.",
            },
            {
              prop: "value",
              type: "string",
              description: "The controlled value of the input.",
            },
            {
              prop: "defaultValue",
              type: "string",
              description: "The default value for uncontrolled inputs.",
            },
            {
              prop: "disabled",
              type: "boolean",
              default: "false",
              description: "When true, prevents the user from interacting with the input.",
            },
            {
              prop: "readOnly",
              type: "boolean",
              default: "false",
              description: "When true, the input cannot be edited but can be selected and copied.",
            },
            {
              prop: "required",
              type: "boolean",
              default: "false",
              description: "When true, the input is required for form submission.",
            },
            {
              prop: "autoFocus",
              type: "boolean",
              default: "false",
              description: "When true, the input will be focused when the component mounts.",
            },
            {
              prop: "autoComplete",
              type: "string",
              description: "Hint for form autofill feature.",
            },
            {
              prop: "className",
              type: "string",
              description: "Additional CSS class names to apply to the input.",
            },
            {
              prop: "onChange",
              type: "(event: React.ChangeEvent<HTMLInputElement>) => void",
              description: "Callback fired when the input value changes.",
            },
            {
              prop: "onFocus",
              type: "(event: React.FocusEvent<HTMLInputElement>) => void",
              description: "Callback fired when the input receives focus.",
            },
            {
              prop: "onBlur",
              type: "(event: React.FocusEvent<HTMLInputElement>) => void",
              description: "Callback fired when the input loses focus.",
            },
            {
              prop: "aria-invalid",
              type: "boolean | 'true' | 'false'",
              description: "Indicates whether the input value is invalid.",
            },
            {
              prop: "aria-describedby",
              type: "string",
              description: "Identifies elements that describe the input.",
            },
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            The Input component follows WAI-ARIA guidelines and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Keyboard navigation support (Tab, Shift+Tab, Arrow keys for text selection)</li>
            <li>Screen reader announcements for labels and descriptions</li>
            <li>Focus management and visual focus indicators</li>
            <li>Support for aria-invalid to indicate validation errors</li>
            <li>Support for aria-describedby to associate error messages</li>
            <li>Proper labeling with htmlFor attributes</li>
            <li>High contrast focus rings for better visibility</li>
          </ul>
        </div>
      </section>
    </div>
  )
}