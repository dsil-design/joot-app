"use client"

import * as React from "react"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { ComboBox, type ComboBoxOption } from "@/components/ui/combobox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

const frameworkOptions: ComboBoxOption[] = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue.js" },
  { value: "angular", label: "Angular" },
  { value: "svelte", label: "Svelte" },
  { value: "solid", label: "Solid.js" },
]

const vendorOptions: ComboBoxOption[] = [
  { value: "7-eleven", label: "7-Eleven" },
  { value: "grab", label: "Grab" },
  { value: "apple", label: "Apple" },
  { value: "netflix", label: "Netflix" },
  { value: "shell", label: "Shell" },
]

const paymentOptions: ComboBoxOption[] = [
  { value: "cash", label: "Cash" },
  { value: "credit-card", label: "Credit Card" },
  { value: "checking-account", label: "Checking Account" },
  { value: "paypal", label: "PayPal", disabled: true },
]

export default function ComboBoxPage() {
  const [framework, setFramework] = React.useState<string>("")
  const [vendor, setVendor] = React.useState<string>("")
  const [payment, setPayment] = React.useState<string>("cash")
  const [userVendors, setUserVendors] = React.useState<ComboBoxOption[]>(vendorOptions)

  const handleAddVendor = (newVendor: string) => {
    const newOption: ComboBoxOption = {
      value: newVendor.toLowerCase().replace(/\s+/g, '-'),
      label: newVendor
    }
    setUserVendors(prev => [...prev, newOption])
    setVendor(newOption.value)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ComboBox</h1>
        <p className="text-lg text-muted-foreground">
          A searchable select component with optional add-new functionality. Perfect for user selections with dynamic options.
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">Examples</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Basic ComboBox</h3>
              <ComponentDemo description="A basic combobox with searchable options.">
                <div className="w-[280px] space-y-2">
                  <Label htmlFor="framework">Framework</Label>
                  <ComboBox
                    id="framework"
                    options={frameworkOptions}
                    value={framework}
                    onValueChange={setFramework}
                    placeholder="Select framework..."
                    searchPlaceholder="Search frameworks..."
                    label="Select a framework"
                  />
                </div>
              </ComponentDemo>
              <CodeBlock code={`import { ComboBox, type ComboBoxOption } from "@/components/ui/combobox"

const frameworks: ComboBoxOption[] = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue.js" },
  { value: "angular", label: "Angular" },
  { value: "svelte", label: "Svelte" },
]

function Example() {
  const [framework, setFramework] = React.useState<string>("")

  return (
    <ComboBox
      options={frameworks}
      value={framework}
      onValueChange={setFramework}
      placeholder="Select framework..."
      searchPlaceholder="Search frameworks..."
    />
  )
}`} />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">With Add New Functionality</h3>
              <ComponentDemo description="Allows users to add new options that don't exist in the list.">
                <div className="w-[280px] space-y-2">
                  <Label htmlFor="vendor">Vendor</Label>
                  <ComboBox
                    id="vendor"
                    options={userVendors}
                    value={vendor}
                    onValueChange={setVendor}
                    onAddNew={handleAddVendor}
                    allowAdd={true}
                    placeholder="Select vendor..."
                    searchPlaceholder="Search vendors..."
                    addNewLabel="Add vendor"
                    label="Select or add a vendor"
                  />
                </div>
              </ComponentDemo>
              <CodeBlock code={`import { ComboBox, type ComboBoxOption } from "@/components/ui/combobox"

function Example() {
  const [vendor, setVendor] = React.useState<string>("")
  const [vendors, setVendors] = React.useState<ComboBoxOption[]>([
    { value: "7-eleven", label: "7-Eleven" },
    { value: "grab", label: "Grab" },
  ])

  const handleAddVendor = (newVendor: string) => {
    const newOption = {
      value: newVendor.toLowerCase().replace(/\\s+/g, '-'),
      label: newVendor
    }
    setVendors(prev => [...prev, newOption])
    setVendor(newOption.value)
  }

  return (
    <ComboBox
      options={vendors}
      value={vendor}
      onValueChange={setVendor}
      onAddNew={handleAddVendor}
      allowAdd={true}
      placeholder="Select vendor..."
      addNewLabel="Add vendor"
    />
  )
}`} />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Select Only Mode</h3>
              <ComponentDemo description="Read-only selection without the ability to add new options.">
                <div className="w-[280px] space-y-2">
                  <Label htmlFor="payment">Payment Method</Label>
                  <ComboBox
                    id="payment"
                    options={paymentOptions}
                    value={payment}
                    onValueChange={setPayment}
                    allowAdd={false}
                    placeholder="Select payment method..."
                    searchPlaceholder="Search payment methods..."
                    label="Select a payment method"
                  />
                </div>
              </ComponentDemo>
              <CodeBlock code={`import { ComboBox, type ComboBoxOption } from "@/components/ui/combobox"

const paymentMethods: ComboBoxOption[] = [
  { value: "cash", label: "Cash" },
  { value: "credit-card", label: "Credit Card" },
  { value: "checking-account", label: "Checking Account" },
  { value: "paypal", label: "PayPal", disabled: true },
]

function Example() {
  const [payment, setPayment] = React.useState<string>("cash")

  return (
    <ComboBox
      options={paymentMethods}
      value={payment}
      onValueChange={setPayment}
      allowAdd={false}
      placeholder="Select payment method..."
    />
  )
}`} />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Sizes and Variants</h3>
              <ComponentDemo description="ComboBox supports different sizes and maintains consistent styling.">
                <div className="space-y-4">
                  <div className="w-[280px] space-y-2">
                    <Label>Small</Label>
                    <ComboBox
                      options={frameworkOptions}
                      value={framework}
                      onValueChange={setFramework}
                      placeholder="Select framework..."
                      size="sm"
                    />
                  </div>
                  <div className="w-[280px] space-y-2">
                    <Label>Default</Label>
                    <ComboBox
                      options={frameworkOptions}
                      value={framework}
                      onValueChange={setFramework}
                      placeholder="Select framework..."
                      size="default"
                    />
                  </div>
                  <div className="w-[280px] space-y-2">
                    <Label>Large</Label>
                    <ComboBox
                      options={frameworkOptions}
                      value={framework}
                      onValueChange={setFramework}
                      placeholder="Select framework..."
                      size="lg"
                    />
                  </div>
                </div>
              </ComponentDemo>
              <CodeBlock code={`import { ComboBox } from "@/components/ui/combobox"

// Small size
<ComboBox size="sm" options={options} />

// Default size
<ComboBox size="default" options={options} />

// Large size  
<ComboBox size="lg" options={options} />`} />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Disabled State</h3>
              <ComponentDemo description="ComboBox can be disabled to prevent interaction.">
                <div className="w-[280px] space-y-2">
                  <Label htmlFor="disabled-combo">Framework (Disabled)</Label>
                  <ComboBox
                    id="disabled-combo"
                    options={frameworkOptions}
                    value="react"
                    onValueChange={() => {}}
                    placeholder="Select framework..."
                    disabled={true}
                    label="Disabled combobox"
                  />
                </div>
              </ComponentDemo>
              <CodeBlock code={`import { ComboBox } from "@/components/ui/combobox"

<ComboBox
  options={options}
  value="react"
  disabled={true}
  placeholder="Select framework..."
/>`} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">Installation</h2>
          
          <Card>
            <CardHeader>
              <CardTitle>Dependencies</CardTitle>
              <CardDescription>
                The ComboBox component requires the following components to be installed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Required Components:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Button</li>
                  <li>Command</li>
                  <li>Popover</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Required Icons:</h4>
                <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                  <code>npm install lucide-react</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">API Reference</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">ComboBox</h3>
              <PropsTable
                data={[
                  {
                    prop: "options",
                    type: "ComboBoxOption[]",
                    description: "Array of options to display in the dropdown.",
                  },
                  {
                    prop: "value",
                    type: "string",
                    description: "Currently selected value.",
                  },
                  {
                    prop: "onValueChange",
                    type: "(value: string) => void",
                    description: "Callback function called when selection changes.",
                  },
                  {
                    prop: "onAddNew",
                    type: "(inputValue: string) => void",
                    description: "Callback function for adding new options (only when allowAdd is true).",
                  },
                  {
                    prop: "placeholder",
                    type: "string",
                    description: "Placeholder text when no option is selected.",
                    default: '"Select option..."',
                  },
                  {
                    prop: "searchPlaceholder",
                    type: "string",
                    description: "Placeholder text for the search input.",
                    default: '"Search..."',
                  },
                  {
                    prop: "emptyMessage",
                    type: "string",
                    description: "Message displayed when no options match the search.",
                    default: '"No options found."',
                  },
                  {
                    prop: "allowAdd",
                    type: "boolean",
                    description: "Whether to allow adding new options via search.",
                    default: "false",
                  },
                  {
                    prop: "addNewLabel",
                    type: "string",
                    description: "Label prefix for add new option.",
                    default: '"Add new"',
                  },
                  {
                    prop: "disabled",
                    type: "boolean",
                    description: "Whether the combobox is disabled.",
                    default: "false",
                  },
                  {
                    prop: "label",
                    type: "string",
                    description: "Accessible label for the combobox.",
                  },
                  {
                    prop: "variant",
                    type: '"default" | "outline"',
                    description: "Visual variant of the combobox.",
                    default: '"default"',
                  },
                  {
                    prop: "size",
                    type: '"default" | "sm" | "lg"',
                    description: "Size variant of the combobox.",
                    default: '"default"',
                  },
                  {
                    prop: "className",
                    type: "string",
                    description: "Additional CSS classes to apply.",
                  },
                ]}
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">ComboBoxOption</h3>
              <PropsTable
                data={[
                  {
                    prop: "value",
                    type: "string",
                    description: "Unique identifier for the option.",
                  },
                  {
                    prop: "label",
                    type: "string",
                    description: "Display text for the option.",
                  },
                  {
                    prop: "disabled",
                    type: "boolean",
                    description: "Whether the option is disabled.",
                    default: "false",
                  },
                ]}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">Usage Patterns</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Vendor Selection</CardTitle>
                <CardDescription>
                  Perfect for transaction forms where users can select existing vendors or add new ones.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  <li>• Enable <code>allowAdd={true}</code></li>
                  <li>• Handle <code>onAddNew</code> to update your data</li>
                  <li>• Use descriptive <code>addNewLabel</code></li>
                  <li>• Provide relevant search placeholder</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>
                  For fixed lists where users can only select from predefined options.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  <li>• Keep <code>allowAdd={false}</code></li>
                  <li>• Use <code>disabled</code> prop for unavailable options</li>
                  <li>• Provide clear option labels</li>
                  <li>• Consider setting a default value</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">Accessibility</h2>
          
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-2 text-sm">
                <li>• Fully keyboard navigable with arrow keys, Enter, and Escape</li>
                <li>• Proper ARIA attributes including role="combobox" and aria-expanded</li>
                <li>• Screen reader friendly with descriptive labels</li>
                <li>• Focus management when opening/closing the dropdown</li>
                <li>• Search functionality accessible via keyboard</li>
                <li>• Disabled states properly communicated to assistive technologies</li>
                <li>• Support for custom aria-label via label prop</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}