"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export default function CheckboxPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Checkbox</h1>
        <p className="text-lg text-muted-foreground">
          A control that allows the user to toggle between checked and not checked.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Default</h3>
            <ComponentDemo>
              <Checkbox id="terms" />
            </ComponentDemo>
            <CodeBlock code={`<Checkbox id="terms" />`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Label</h3>
            <ComponentDemo>
              <div className="flex items-center space-x-2">
                <Checkbox id="terms2" />
                <Label htmlFor="terms2">Accept terms and conditions</Label>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="flex items-center space-x-2">
  <Checkbox id="terms2" />
  <Label htmlFor="terms2">Accept terms and conditions</Label>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Disabled</h3>
            <ComponentDemo>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="disabled1" disabled />
                  <Label htmlFor="disabled1">Disabled unchecked</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="disabled2" disabled checked />
                  <Label htmlFor="disabled2">Disabled checked</Label>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="flex items-center space-x-2">
  <Checkbox id="disabled1" disabled />
  <Label htmlFor="disabled1">Disabled unchecked</Label>
</div>
<div className="flex items-center space-x-2">
  <Checkbox id="disabled2" disabled checked />
  <Label htmlFor="disabled2">Disabled checked</Label>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Description</h3>
            <ComponentDemo>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="marketing" />
                  <Label htmlFor="marketing">Marketing emails</Label>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  Receive emails about new products, features, and more.
                </p>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="space-y-2">
  <div className="flex items-center space-x-2">
    <Checkbox id="marketing" />
    <Label htmlFor="marketing">Marketing emails</Label>
  </div>
  <p className="text-sm text-muted-foreground ml-6">
    Receive emails about new products, features, and more.
  </p>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Checkbox Group</h3>
            <ComponentDemo>
              <CheckboxGroupExample />
            </ComponentDemo>
            <CodeBlock code={`function CheckboxGroupExample() {
  const [checkedItems, setCheckedItems] = useState<string[]>([])

  const toggleItem = (item: string) => {
    setCheckedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    )
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium">Select your interests:</h4>
      <div className="space-y-2">
        {['Technology', 'Design', 'Business', 'Science'].map((item) => (
          <div key={item} className="flex items-center space-x-2">
            <Checkbox 
              id={item}
              checked={checkedItems.includes(item)}
              onCheckedChange={() => toggleItem(item)}
            />
            <Label htmlFor={item}>{item}</Label>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Selected: {checkedItems.join(', ') || 'None'}
      </p>
    </div>
  )
}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Indeterminate State</h3>
            <ComponentDemo>
              <IndeterminateExample />
            </ComponentDemo>
            <CodeBlock code={`function IndeterminateExample() {
  const [items, setItems] = useState([
    { id: '1', label: 'Item 1', checked: false },
    { id: '2', label: 'Item 2', checked: true },
    { id: '3', label: 'Item 3', checked: false },
  ])

  const checkedCount = items.filter(item => item.checked).length
  const isIndeterminate = checkedCount > 0 && checkedCount < items.length
  const isAllChecked = checkedCount === items.length

  const toggleAll = () => {
    const newChecked = !isAllChecked
    setItems(prev => prev.map(item => ({ ...item, checked: newChecked })))
  }

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox 
          checked={isAllChecked ? true : isIndeterminate ? 'indeterminate' : false}
          onCheckedChange={toggleAll}
        />
        <Label className="font-medium">Select all items</Label>
      </div>
      <div className="ml-6 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center space-x-2">
            <Checkbox 
              checked={item.checked}
              onCheckedChange={() => toggleItem(item.id)}
            />
            <Label>{item.label}</Label>
          </div>
        ))}
      </div>
    </div>
  )
}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">In Form</h3>
            <ComponentDemo>
              <FormExample />
            </ComponentDemo>
            <CodeBlock code={`function FormExample() {
  const [formData, setFormData] = useState({
    newsletter: false,
    terms: false,
    marketing: false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert('Form submitted: ' + JSON.stringify(formData, null, 2))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="newsletter"
            checked={formData.newsletter}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, newsletter: !!checked }))
            }
          />
          <Label htmlFor="newsletter">Subscribe to newsletter</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="marketing"
            checked={formData.marketing}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, marketing: !!checked }))
            }
          />
          <Label htmlFor="marketing">Receive marketing emails</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="terms"
            checked={formData.terms}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, terms: !!checked }))
            }
            required
          />
          <Label htmlFor="terms">
            I agree to the terms and conditions *
          </Label>
        </div>
      </div>
      
      <Button type="submit" disabled={!formData.terms}>
        Submit
      </Button>
    </form>
  )
}`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add checkbox"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import { Checkbox } from "@/components/ui/checkbox"

export function Example() {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <label htmlFor="terms">Accept terms and conditions</label>
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
              prop: "checked",
              type: "boolean | 'indeterminate'",
              default: "false",
              description: "The controlled checked state of the checkbox.",
            },
            {
              prop: "defaultChecked",
              type: "boolean",
              default: "false",
              description: "The checked state of the checkbox when it is initially rendered.",
            },
            {
              prop: "onCheckedChange",
              type: "(checked: boolean | 'indeterminate') => void",
              description: "Event handler called when the checked state changes.",
            },
            {
              prop: "disabled",
              type: "boolean",
              default: "false",
              description: "When true, prevents the user from interacting with the checkbox.",
            },
            {
              prop: "required",
              type: "boolean",
              default: "false",
              description: "When true, indicates that the user must check the checkbox before submitting the form.",
            },
            {
              prop: "name",
              type: "string",
              description: "The name of the checkbox when submitted in a form.",
            },
            {
              prop: "value",
              type: "string",
              default: "'on'",
              description: "The value given as data when submitted with a name.",
            },
            {
              prop: "className",
              type: "string",
              description: "Additional CSS class names to apply to the checkbox.",
            },
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            The Checkbox component follows WAI-ARIA checkbox pattern and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Keyboard navigation support (Space key to toggle)</li>
            <li>Focus management and visual focus indicators</li>
            <li>Screen reader announcements for checked/unchecked states</li>
            <li>Support for indeterminate state announcements</li>
            <li>Proper labeling with associated label elements</li>
            <li>Form integration with validation states</li>
          </ul>
        </div>
      </section>
    </div>
  )
}

function CheckboxGroupExample() {
  const [checkedItems, setCheckedItems] = useState<string[]>([])

  const toggleItem = (item: string) => {
    setCheckedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    )
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium">Select your interests:</h4>
      <div className="space-y-2">
        {['Technology', 'Design', 'Business', 'Science'].map((item) => (
          <div key={item} className="flex items-center space-x-2">
            <Checkbox 
              id={item}
              checked={checkedItems.includes(item)}
              onCheckedChange={() => toggleItem(item)}
            />
            <Label htmlFor={item}>{item}</Label>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Selected: {checkedItems.join(', ') || 'None'}
      </p>
    </div>
  )
}

function IndeterminateExample() {
  const [items, setItems] = useState([
    { id: '1', label: 'Item 1', checked: false },
    { id: '2', label: 'Item 2', checked: true },
    { id: '3', label: 'Item 3', checked: false },
  ])

  const checkedCount = items.filter(item => item.checked).length
  const isIndeterminate = checkedCount > 0 && checkedCount < items.length
  const isAllChecked = checkedCount === items.length

  const toggleAll = () => {
    const newChecked = !isAllChecked
    setItems(prev => prev.map(item => ({ ...item, checked: newChecked })))
  }

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox 
          checked={isAllChecked ? true : isIndeterminate ? 'indeterminate' : false}
          onCheckedChange={toggleAll}
        />
        <Label className="font-medium">Select all items</Label>
      </div>
      <div className="ml-6 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center space-x-2">
            <Checkbox 
              checked={item.checked}
              onCheckedChange={() => toggleItem(item.id)}
            />
            <Label>{item.label}</Label>
          </div>
        ))}
      </div>
    </div>
  )
}

function FormExample() {
  const [formData, setFormData] = useState({
    newsletter: false,
    terms: false,
    marketing: false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert('Form submitted: ' + JSON.stringify(formData, null, 2))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="newsletter"
            checked={formData.newsletter}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, newsletter: !!checked }))
            }
          />
          <Label htmlFor="newsletter">Subscribe to newsletter</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="marketing"
            checked={formData.marketing}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, marketing: !!checked }))
            }
          />
          <Label htmlFor="marketing">Receive marketing emails</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="terms"
            checked={formData.terms}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, terms: !!checked }))
            }
            required
          />
          <Label htmlFor="terms">
            I agree to the terms and conditions *
          </Label>
        </div>
      </div>
      
      <Button type="submit" disabled={!formData.terms}>
        Submit
      </Button>
    </form>
  )
}