"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { AlertCircle, Asterisk } from "lucide-react"

export default function LabelPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Label</h1>
        <p className="text-lg text-muted-foreground">
          Renders an accessible label associated with controls.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Basic Label</h3>
            <ComponentDemo>
              <div className="space-y-2">
                <Label htmlFor="basic">Basic Label</Label>
                <Input id="basic" placeholder="Enter text here..." />
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="space-y-2">
  <Label htmlFor="basic">Basic Label</Label>
  <Input id="basic" placeholder="Enter text here..." />
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Checkbox</h3>
            <ComponentDemo>
              <div className="flex items-center space-x-2">
                <Checkbox id="terms" />
                <Label htmlFor="terms">I agree to the terms and conditions</Label>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">I agree to the terms and conditions</Label>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Required Indicator</h3>
            <ComponentDemo>
              <RequiredLabelExample />
            </ComponentDemo>
            <CodeBlock code={`function RequiredLabelExample() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="required" className="flex items-center gap-1">
          Email Address
          <Asterisk className="h-3 w-3 text-destructive" />
        </Label>
        <Input id="required" type="email" placeholder="Enter your email" required />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="required2">
          Full Name <span className="text-destructive">*</span>
        </Label>
        <Input id="required2" placeholder="Enter your full name" required />
      </div>
    </div>
  )
}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Description</h3>
            <ComponentDemo>
              <div className="space-y-2">
                <Label htmlFor="description">Username</Label>
                <Input id="description" placeholder="Choose a username" />
                <p className="text-sm text-muted-foreground">
                  This will be your public display name. It can be your real name or a pseudonym.
                </p>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="space-y-2">
  <Label htmlFor="description">Username</Label>
  <Input id="description" placeholder="Choose a username" />
  <p className="text-sm text-muted-foreground">
    This will be your public display name. It can be your real name or a pseudonym.
  </p>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Error State</h3>
            <ComponentDemo>
              <ErrorLabelExample />
            </ComponentDemo>
            <CodeBlock code={`function ErrorLabelExample() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const validateEmail = (value: string) => {
    if (!value) {
      setError('Email is required')
    } else if (!/\S+@\S+\.\S+/.test(value)) {
      setError('Please enter a valid email address')
    } else {
      setError('')
    }
  }

  return (
    <div className="space-y-2">
      <Label 
        htmlFor="email" 
        className={error ? 'text-destructive' : ''}
      >
        Email Address
        <span className="text-destructive">*</span>
      </Label>
      <Input
        id="email"
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          validateEmail(e.target.value)
        }}
        className={error ? 'border-destructive focus:border-destructive' : ''}
        placeholder="Enter your email"
        aria-invalid={!!error}
        aria-describedby={error ? 'email-error' : undefined}
      />
      {error && (
        <p id="email-error" className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  )
}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Disabled State</h3>
            <ComponentDemo>
              <div className="space-y-4">
                <div className="space-y-2 group" data-disabled="true">
                  <Label htmlFor="disabled">Disabled Field</Label>
                  <Input id="disabled" disabled placeholder="This field is disabled" />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox id="disabled-checkbox" disabled />
                  <Label htmlFor="disabled-checkbox">Disabled checkbox option</Label>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="space-y-2 group" data-disabled="true">
  <Label htmlFor="disabled">Disabled Field</Label>
  <Input id="disabled" disabled placeholder="This field is disabled" />
</div>

<div className="flex items-center space-x-2">
  <Checkbox id="disabled-checkbox" disabled />
  <Label htmlFor="disabled-checkbox">Disabled checkbox option</Label>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Form Layout</h3>
            <ComponentDemo>
              <FormLayoutExample />
            </ComponentDemo>
            <CodeBlock code={`function FormLayoutExample() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })

  return (
    <form className="space-y-4 max-w-md">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input 
            id="firstName" 
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            required 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input 
            id="lastName" 
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            required 
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">
          Email Address <span className="text-destructive">*</span>
        </Label>
        <Input 
          id="email" 
          type="email" 
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required 
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input 
          id="phone" 
          type="tel" 
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          placeholder="Optional" 
        />
      </div>
      
      <Button type="submit" className="w-full">
        Submit Form
      </Button>
    </form>
  )
}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Label Sizes</h3>
            <ComponentDemo>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="small" className="text-xs">
                    Small Label (text-xs)
                  </Label>
                  <Input id="small" placeholder="Small label input" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="default">
                    Default Label (text-sm)
                  </Label>
                  <Input id="default" placeholder="Default label input" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="large" className="text-base">
                    Large Label (text-base)
                  </Label>
                  <Input id="large" placeholder="Large label input" />
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<!-- Small -->
<Label htmlFor="small" className="text-xs">
  Small Label (text-xs)
</Label>

<!-- Default -->
<Label htmlFor="default">
  Default Label (text-sm)
</Label>

<!-- Large -->
<Label htmlFor="large" className="text-base">
  Large Label (text-base)
</Label>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Custom Styling</h3>
            <ComponentDemo>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bold" className="font-bold">
                    Bold Label
                  </Label>
                  <Input id="bold" placeholder="Input with bold label" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="colored" className="text-blue-600 dark:text-blue-400">
                    Colored Label
                  </Label>
                  <Input id="colored" placeholder="Input with colored label" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="uppercase" className="uppercase tracking-wide">
                    Uppercase Label
                  </Label>
                  <Input id="uppercase" placeholder="Input with uppercase label" />
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<!-- Bold -->
<Label htmlFor="bold" className="font-bold">
  Bold Label
</Label>

<!-- Colored -->
<Label htmlFor="colored" className="text-blue-600 dark:text-blue-400">
  Colored Label
</Label>

<!-- Uppercase -->
<Label htmlFor="uppercase" className="uppercase tracking-wide">
  Uppercase Label
</Label>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add label"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import { Label } from "@/components/ui/label"

export function Example() {
  return (
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="Email" />
    </div>
  )
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <PropsTable
          data={[
            {
              prop: "htmlFor",
              type: "string",
              description: "The id of the form control this label is associated with.",
            },
            {
              prop: "asChild",
              type: "boolean",
              default: "false",
              description: "Change the default rendered element for the one passed as a child, merging their props and behavior.",
            },
            {
              prop: "className",
              type: "string",
              description: "Additional CSS class names to apply to the label.",
            },
            {
              prop: "children",
              type: "React.ReactNode",
              description: "The content of the label.",
            },
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Design Guidelines</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2 text-green-600">Do</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Always associate labels with form controls using htmlFor</li>
              <li>Use clear, concise label text that describes the input</li>
              <li>Place required indicators consistently (asterisk or text)</li>
              <li>Keep labels short and scannable</li>
              <li>Use sentence case for labels</li>
              <li>Group related labels and inputs logically</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2 text-red-600">Don't</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use labels without associating them to controls</li>
              <li>Make labels too long or verbose</li>
              <li>Use all caps for labels (affects readability)</li>
              <li>Rely only on placeholder text instead of labels</li>
              <li>Use different styles for required indicators</li>
              <li>Hide labels from screen readers</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            The Label component follows WAI-ARIA labeling practices and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Proper association with form controls via htmlFor attribute</li>
            <li>Screen reader support for label announcements</li>
            <li>Click-to-focus behavior for associated inputs</li>
            <li>Disabled state handling that prevents interaction</li>
            <li>Support for complex label content including icons</li>
            <li>Integration with form validation states</li>
          </ul>
        </div>
      </section>
    </div>
  )
}

function RequiredLabelExample() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="required" className="flex items-center gap-1">
          Email Address
          <Asterisk className="h-3 w-3 text-destructive" />
        </Label>
        <Input id="required" type="email" placeholder="Enter your email" required />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="required2">
          Full Name <span className="text-destructive">*</span>
        </Label>
        <Input id="required2" placeholder="Enter your full name" required />
      </div>
    </div>
  )
}

function ErrorLabelExample() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const validateEmail = (value: string) => {
    if (!value) {
      setError('Email is required')
    } else if (!/\S+@\S+\.\S+/.test(value)) {
      setError('Please enter a valid email address')
    } else {
      setError('')
    }
  }

  return (
    <div className="space-y-2">
      <Label 
        htmlFor="email" 
        className={error ? 'text-destructive' : ''}
      >
        Email Address
        <span className="text-destructive">*</span>
      </Label>
      <Input
        id="email"
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          validateEmail(e.target.value)
        }}
        className={error ? 'border-destructive focus:border-destructive' : ''}
        placeholder="Enter your email"
        aria-invalid={!!error}
        aria-describedby={error ? 'email-error' : undefined}
      />
      {error && (
        <p id="email-error" className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  )
}

function FormLayoutExample() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })

  return (
    <form className="space-y-4 max-w-md">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input 
            id="firstName" 
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            required 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input 
            id="lastName" 
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            required 
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">
          Email Address <span className="text-destructive">*</span>
        </Label>
        <Input 
          id="email" 
          type="email" 
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required 
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input 
          id="phone" 
          type="tel" 
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          placeholder="Optional" 
        />
      </div>
      
      <Button type="submit" className="w-full">
        Submit Form
      </Button>
    </form>
  )
}