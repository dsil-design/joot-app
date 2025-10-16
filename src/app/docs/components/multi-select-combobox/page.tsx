"use client"

import * as React from "react"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { MultiSelectComboBox, type MultiSelectOption } from "@/components/ui/multi-select-combobox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

const tagOptions: MultiSelectOption[] = [
  { value: "personal", label: "Personal", color: "#dbeafe" },
  { value: "business", label: "Business", color: "#dcfce7" },
  { value: "tax-deductible", label: "Tax Deductible", color: "#fef3c7" },
  { value: "recurring", label: "Recurring", color: "#ffe2e2" },
]

const categoryOptions: MultiSelectOption[] = [
  { value: "groceries", label: "Groceries" },
  { value: "transportation", label: "Transportation" },
  { value: "entertainment", label: "Entertainment" },
  { value: "utilities", label: "Utilities" },
  { value: "healthcare", label: "Healthcare" },
]

export default function MultiSelectComboBoxPage() {
  const [tags, setTags] = React.useState<string[]>(["personal"])
  const [categories, setCategories] = React.useState<string[]>([])
  const [userTags, setUserTags] = React.useState<MultiSelectOption[]>(tagOptions)

  const handleAddTag = async (newTag: string): Promise<string | null> => {
    // Simulate async tag creation
    await new Promise(resolve => setTimeout(resolve, 300))

    const newOption: MultiSelectOption = {
      value: newTag.toLowerCase().replace(/\s+/g, '-'),
      label: newTag,
      color: "#f4f4f5" // Default color
    }
    setUserTags(prev => [...prev, newOption])
    return newOption.value
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">MultiSelectComboBox</h1>
        <p className="text-lg text-muted-foreground">
          A searchable multi-select component with checkmarks, badge display, and optional add-new functionality.
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">Examples</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Basic Multi-Select</h3>
              <ComponentDemo description="A basic multi-select combobox with colored badges.">
                <div className="w-[400px] space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <MultiSelectComboBox
                    id="tags"
                    options={tagOptions}
                    values={tags}
                    onValuesChange={setTags}
                    placeholder="Select tags..."
                    searchPlaceholder="Search tags..."
                    label="Select tags"
                  />
                </div>
              </ComponentDemo>
              <CodeBlock code={`import { MultiSelectComboBox, type MultiSelectOption } from "@/components/ui/multi-select-combobox"

const tags: MultiSelectOption[] = [
  { value: "personal", label: "Personal", color: "#dbeafe" },
  { value: "business", label: "Business", color: "#dcfce7" },
  { value: "tax-deductible", label: "Tax Deductible", color: "#fef3c7" },
]

function Example() {
  const [selected, setSelected] = React.useState<string[]>(["personal"])

  return (
    <MultiSelectComboBox
      options={tags}
      values={selected}
      onValuesChange={setSelected}
      placeholder="Select tags..."
      searchPlaceholder="Search tags..."
    />
  )
}`} />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">With Add New Functionality</h3>
              <ComponentDemo description="Allows users to add new options that don't exist in the list.">
                <div className="w-[400px] space-y-2">
                  <Label htmlFor="user-tags">Transaction Tags</Label>
                  <MultiSelectComboBox
                    id="user-tags"
                    options={userTags}
                    values={tags}
                    onValuesChange={setTags}
                    onAddNew={handleAddTag}
                    allowAdd={true}
                    placeholder="Select or add tags..."
                    searchPlaceholder="Search tags..."
                    addNewLabel="Add tag"
                    label="Select or add transaction tags"
                  />
                </div>
              </ComponentDemo>
              <CodeBlock code={`import { MultiSelectComboBox, type MultiSelectOption } from "@/components/ui/multi-select-combobox"

function Example() {
  const [selected, setSelected] = React.useState<string[]>([])
  const [tags, setTags] = React.useState<MultiSelectOption[]>([...])

  const handleAddTag = async (newTag: string): Promise<string | null> => {
    // Your async logic to create tag in database
    const newOption = {
      value: newTag.toLowerCase().replace(/\\s+/g, '-'),
      label: newTag,
      color: "#dbeafe"
    }
    setTags(prev => [...prev, newOption])
    return newOption.value
  }

  return (
    <MultiSelectComboBox
      options={tags}
      values={selected}
      onValuesChange={setSelected}
      onAddNew={handleAddTag}
      allowAdd={true}
      placeholder="Select or add tags..."
      addNewLabel="Add tag"
    />
  )
}`} />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Select Only Mode</h3>
              <ComponentDemo description="Multi-select without the ability to add new options.">
                <div className="w-[400px] space-y-2">
                  <Label htmlFor="categories">Categories</Label>
                  <MultiSelectComboBox
                    id="categories"
                    options={categoryOptions}
                    values={categories}
                    onValuesChange={setCategories}
                    allowAdd={false}
                    placeholder="Select categories..."
                    searchPlaceholder="Search categories..."
                    label="Select categories"
                  />
                </div>
              </ComponentDemo>
              <CodeBlock code={`import { MultiSelectComboBox, type MultiSelectOption } from "@/components/ui/multi-select-combobox"

const categories: MultiSelectOption[] = [
  { value: "groceries", label: "Groceries" },
  { value: "transportation", label: "Transportation" },
  { value: "entertainment", label: "Entertainment" },
]

function Example() {
  const [selected, setSelected] = React.useState<string[]>([])

  return (
    <MultiSelectComboBox
      options={categories}
      values={selected}
      onValuesChange={setSelected}
      allowAdd={false}
      placeholder="Select categories..."
    />
  )
}`} />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Max Display Control</h3>
              <ComponentDemo description="Control how many badges to show before collapsing to '+N more'.">
                <div className="w-[400px] space-y-4">
                  <div className="space-y-2">
                    <Label>Max Display: 2</Label>
                    <MultiSelectComboBox
                      options={categoryOptions}
                      values={["groceries", "transportation", "entertainment"]}
                      onValuesChange={() => {}}
                      maxDisplay={2}
                      placeholder="Select categories..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Display: 3 (default)</Label>
                    <MultiSelectComboBox
                      options={categoryOptions}
                      values={["groceries", "transportation", "entertainment"]}
                      onValuesChange={() => {}}
                      maxDisplay={3}
                      placeholder="Select categories..."
                    />
                  </div>
                </div>
              </ComponentDemo>
              <CodeBlock code={`import { MultiSelectComboBox } from "@/components/ui/multi-select-combobox"

// Show max 2 badges before collapsing
<MultiSelectComboBox
  options={options}
  values={selected}
  maxDisplay={2}
/>

// Show max 5 badges before collapsing
<MultiSelectComboBox
  options={options}
  values={selected}
  maxDisplay={5}
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
                The MultiSelectComboBox component requires the following components to be installed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Required Components:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Button</li>
                  <li>Badge</li>
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
              <h3 className="text-xl font-semibold mb-3">MultiSelectComboBox</h3>
              <PropsTable
                data={[
                  {
                    prop: "options",
                    type: "MultiSelectOption[]",
                    description: "Array of options to display in the dropdown.",
                  },
                  {
                    prop: "values",
                    type: "string[]",
                    description: "Currently selected values.",
                  },
                  {
                    prop: "onValuesChange",
                    type: "(values: string[]) => void",
                    description: "Callback function called when selection changes.",
                  },
                  {
                    prop: "onAddNew",
                    type: "(inputValue: string) => Promise<string | null>",
                    description: "Async callback function for adding new options. Must return the new option's value.",
                  },
                  {
                    prop: "placeholder",
                    type: "string",
                    description: "Placeholder text when no options are selected.",
                    default: '"Select options..."',
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
                    prop: "maxDisplay",
                    type: "number",
                    description: "Maximum number of badges to display before showing '+N more'.",
                    default: "3",
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
              <h3 className="text-xl font-semibold mb-3">MultiSelectOption</h3>
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
                    prop: "color",
                    type: "string",
                    description: "Optional hex color for the badge background.",
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
                <CardTitle>Transaction Tags</CardTitle>
                <CardDescription>
                  Perfect for categorizing transactions with multiple custom tags.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  <li>• Enable <code>allowAdd={true}</code></li>
                  <li>• Provide colors for visual distinction</li>
                  <li>• Handle <code>onAddNew</code> with database integration</li>
                  <li>• Use descriptive <code>addNewLabel</code></li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Selection</CardTitle>
                <CardDescription>
                  For fixed multi-category selection without custom additions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  <li>• Keep <code>allowAdd={false}</code></li>
                  <li>• Use <code>disabled</code> prop for unavailable options</li>
                  <li>• Adjust <code>maxDisplay</code> based on typical usage</li>
                  <li>• Consider setting default values</li>
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
                <li>• Checkmarks indicate selected state to all users</li>
                <li>• Badge removal via X button - works regardless of popover state</li>
                <li>• Color contrast meets WCAG AA standards with dark text on light backgrounds</li>
                <li>• Support for custom aria-label via label prop</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
