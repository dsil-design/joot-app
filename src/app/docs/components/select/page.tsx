"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { 
  Apple, 
  Banana, 
  Cherry,
  Globe,
  Smartphone,
  Laptop,
  Tablet,
  Monitor
} from "lucide-react"

export default function SelectPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Select</h1>
        <p className="text-lg text-muted-foreground">
          Display a list of options for the user to pick from—triggered by a button.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Default</h3>
            <ComponentDemo>
              <Select>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a fruit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apple">Apple</SelectItem>
                  <SelectItem value="banana">Banana</SelectItem>
                  <SelectItem value="blueberry">Blueberry</SelectItem>
                  <SelectItem value="grapes">Grapes</SelectItem>
                  <SelectItem value="pineapple">Pineapple</SelectItem>
                </SelectContent>
              </Select>
            </ComponentDemo>
            <CodeBlock code={`<Select>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Select a fruit" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="apple">Apple</SelectItem>
    <SelectItem value="banana">Banana</SelectItem>
    <SelectItem value="blueberry">Blueberry</SelectItem>
    <SelectItem value="grapes">Grapes</SelectItem>
    <SelectItem value="pineapple">Pineapple</SelectItem>
  </SelectContent>
</Select>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Label</h3>
            <ComponentDemo>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="fruit-select">Favorite Fruit</Label>
                <Select>
                  <SelectTrigger id="fruit-select">
                    <SelectValue placeholder="Select a fruit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apple">Apple</SelectItem>
                    <SelectItem value="banana">Banana</SelectItem>
                    <SelectItem value="blueberry">Blueberry</SelectItem>
                    <SelectItem value="grapes">Grapes</SelectItem>
                    <SelectItem value="pineapple">Pineapple</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="grid w-full max-w-sm items-center gap-1.5">
  <Label htmlFor="fruit-select">Favorite Fruit</Label>
  <Select>
    <SelectTrigger id="fruit-select">
      <SelectValue placeholder="Select a fruit" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="apple">Apple</SelectItem>
      <SelectItem value="banana">Banana</SelectItem>
      <SelectItem value="blueberry">Blueberry</SelectItem>
      <SelectItem value="grapes">Grapes</SelectItem>
      <SelectItem value="pineapple">Pineapple</SelectItem>
    </SelectContent>
  </Select>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Icons</h3>
            <ComponentDemo>
              <Select>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a fruit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apple">
                    <div className="flex items-center gap-2">
                      <Apple className="h-4 w-4" />
                      Apple
                    </div>
                  </SelectItem>
                  <SelectItem value="banana">
                    <div className="flex items-center gap-2">
                      <Banana className="h-4 w-4" />
                      Banana
                    </div>
                  </SelectItem>
                  <SelectItem value="cherry">
                    <div className="flex items-center gap-2">
                      <Cherry className="h-4 w-4" />
                      Cherry
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </ComponentDemo>
            <CodeBlock code={`<Select>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Select a fruit" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="apple">
      <div className="flex items-center gap-2">
        <Apple className="h-4 w-4" />
        Apple
      </div>
    </SelectItem>
    <SelectItem value="banana">
      <div className="flex items-center gap-2">
        <Banana className="h-4 w-4" />
        Banana
      </div>
    </SelectItem>
    <SelectItem value="cherry">
      <div className="flex items-center gap-2">
        <Cherry className="h-4 w-4" />
        Cherry
      </div>
    </SelectItem>
  </SelectContent>
</Select>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Grouped Options</h3>
            <ComponentDemo>
              <Select>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a device" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Mobile</SelectLabel>
                    <SelectItem value="smartphone">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Smartphone
                      </div>
                    </SelectItem>
                    <SelectItem value="tablet">
                      <div className="flex items-center gap-2">
                        <Tablet className="h-4 w-4" />
                        Tablet
                      </div>
                    </SelectItem>
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Desktop</SelectLabel>
                    <SelectItem value="laptop">
                      <div className="flex items-center gap-2">
                        <Laptop className="h-4 w-4" />
                        Laptop
                      </div>
                    </SelectItem>
                    <SelectItem value="monitor">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        Desktop Monitor
                      </div>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </ComponentDemo>
            <CodeBlock code={`<Select>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Select a device" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Mobile</SelectLabel>
      <SelectItem value="smartphone">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          Smartphone
        </div>
      </SelectItem>
      <SelectItem value="tablet">
        <div className="flex items-center gap-2">
          <Tablet className="h-4 w-4" />
          Tablet
        </div>
      </SelectItem>
    </SelectGroup>
    <SelectSeparator />
    <SelectGroup>
      <SelectLabel>Desktop</SelectLabel>
      <SelectItem value="laptop">
        <div className="flex items-center gap-2">
          <Laptop className="h-4 w-4" />
          Laptop
        </div>
      </SelectItem>
      <SelectItem value="monitor">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          Desktop Monitor
        </div>
      </SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Disabled Options</h3>
            <ComponentDemo>
              <Select>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Available Option</SelectItem>
                  <SelectItem value="option2" disabled>
                    Disabled Option
                  </SelectItem>
                  <SelectItem value="option3">Another Available</SelectItem>
                  <SelectItem value="option4" disabled>
                    Also Disabled
                  </SelectItem>
                  <SelectItem value="option5">Last Available</SelectItem>
                </SelectContent>
              </Select>
            </ComponentDemo>
            <CodeBlock code={`<Select>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Available Option</SelectItem>
    <SelectItem value="option2" disabled>
      Disabled Option
    </SelectItem>
    <SelectItem value="option3">Another Available</SelectItem>
    <SelectItem value="option4" disabled>
      Also Disabled
    </SelectItem>
    <SelectItem value="option5">Last Available</SelectItem>
  </SelectContent>
</Select>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Disabled Select</h3>
            <ComponentDemo>
              <Select disabled>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                  <SelectItem value="option3">Option 3</SelectItem>
                </SelectContent>
              </Select>
            </ComponentDemo>
            <CodeBlock code={`<Select disabled>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Small Size</h3>
            <ComponentDemo>
              <Select>
                <SelectTrigger size="sm" className="w-[150px]">
                  <SelectValue placeholder="Small select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small1">Small Option 1</SelectItem>
                  <SelectItem value="small2">Small Option 2</SelectItem>
                  <SelectItem value="small3">Small Option 3</SelectItem>
                </SelectContent>
              </Select>
            </ComponentDemo>
            <CodeBlock code={`<Select>
  <SelectTrigger size="sm" className="w-[150px]">
    <SelectValue placeholder="Small select" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="small1">Small Option 1</SelectItem>
    <SelectItem value="small2">Small Option 2</SelectItem>
    <SelectItem value="small3">Small Option 3</SelectItem>
  </SelectContent>
</Select>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Form Integration</h3>
            <ComponentDemo>
              <div className="space-y-4 w-full max-w-sm">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select>
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          United States
                        </div>
                      </SelectItem>
                      <SelectItem value="uk">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          United Kingdom
                        </div>
                      </SelectItem>
                      <SelectItem value="ca">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Canada
                        </div>
                      </SelectItem>
                      <SelectItem value="au">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Australia
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select>
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>North America</SelectLabel>
                        <SelectItem value="est">Eastern Standard Time (EST)</SelectItem>
                        <SelectItem value="cst">Central Standard Time (CST)</SelectItem>
                        <SelectItem value="mst">Mountain Standard Time (MST)</SelectItem>
                        <SelectItem value="pst">Pacific Standard Time (PST)</SelectItem>
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel>Europe</SelectLabel>
                        <SelectItem value="gmt">Greenwich Mean Time (GMT)</SelectItem>
                        <SelectItem value="cet">Central European Time (CET)</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="country">Country</Label>
    <Select>
      <SelectTrigger id="country">
        <SelectValue placeholder="Select your country" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="us">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            United States
          </div>
        </SelectItem>
        <SelectItem value="uk">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            United Kingdom
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
  
  <div className="space-y-2">
    <Label htmlFor="timezone">Timezone</Label>
    <Select>
      <SelectTrigger id="timezone">
        <SelectValue placeholder="Select timezone" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>North America</SelectLabel>
          <SelectItem value="est">Eastern Standard Time (EST)</SelectItem>
          <SelectItem value="cst">Central Standard Time (CST)</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  </div>
</div>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add select"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function Example() {
  return (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
        <SelectItem value="option2">Option 2</SelectItem>
        <SelectItem value="option3">Option 3</SelectItem>
      </SelectContent>
    </Select>
  )
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Select</h3>
            <PropsTable
              data={[
                {
                  prop: "defaultValue",
                  type: "string",
                  description: "The default value of the select (uncontrolled).",
                },
                {
                  prop: "value",
                  type: "string",
                  description: "The controlled value of the select.",
                },
                {
                  prop: "onValueChange",
                  type: "(value: string) => void",
                  description: "Callback fired when the value changes.",
                },
                {
                  prop: "disabled",
                  type: "boolean",
                  default: "false",
                  description: "When true, prevents the user from interacting with the select.",
                },
                {
                  prop: "name",
                  type: "string",
                  description: "The name of the select (useful for forms).",
                },
                {
                  prop: "required",
                  type: "boolean",
                  default: "false",
                  description: "When true, indicates that the user must select a value.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">SelectTrigger</h3>
            <PropsTable
              data={[
                {
                  prop: "size",
                  type: "'sm' | 'default'",
                  default: "'default'",
                  description: "The size of the select trigger.",
                },
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the trigger.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The trigger content, typically SelectValue.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">SelectValue</h3>
            <PropsTable
              data={[
                {
                  prop: "placeholder",
                  type: "string",
                  description: "The placeholder text when no value is selected.",
                },
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the value display.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">SelectContent</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the content.",
                },
                {
                  prop: "position",
                  type: "'item-aligned' | 'popper'",
                  default: "'item-aligned'",
                  description: "The positioning strategy for the content.",
                },
                {
                  prop: "side",
                  type: "'top' | 'right' | 'bottom' | 'left'",
                  default: "'bottom'",
                  description: "The preferred side of the trigger to render against.",
                },
                {
                  prop: "sideOffset",
                  type: "number",
                  default: "4",
                  description: "The distance in pixels from the trigger.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">SelectItem</h3>
            <PropsTable
              data={[
                {
                  prop: "value",
                  type: "string",
                  description: "The value of the item (required).",
                },
                {
                  prop: "disabled",
                  type: "boolean",
                  default: "false",
                  description: "When true, prevents the user from selecting the item.",
                },
                {
                  prop: "textValue",
                  type: "string",
                  description: "Optional text used for typeahead purposes.",
                },
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the item.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The content of the item.",
                },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Design Guidelines</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-green-600">Do</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use clear, descriptive option labels</li>
              <li>Group related options with labels and separators</li>
              <li>Provide helpful placeholder text</li>
              <li>Keep option lists at a reasonable length</li>
              <li>Use icons to enhance option recognition</li>
              <li>Disable unavailable options rather than hiding them</li>
              <li>Consider the select's context and size appropriately</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-red-600">Don't</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use select for very long lists (consider search/filter)</li>
              <li>Mix different content types in the same select</li>
              <li>Use unclear or ambiguous option labels</li>
              <li>Forget to handle empty states</li>
              <li>Make triggers too narrow for the content</li>
              <li>Use select when radio buttons would be clearer</li>
              <li>Overuse grouping - keep it logical and simple</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            The Select component follows WAI-ARIA guidelines and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Full keyboard navigation support (Arrow keys, Enter, Escape, Tab)</li>
            <li>Screen reader announcements for value changes and options</li>
            <li>Proper ARIA roles and properties for accessibility</li>
            <li>Support for form validation and required fields</li>
            <li>Focus management and visual focus indicators</li>
            <li>Typeahead search functionality for quick navigation</li>
            <li>Proper labeling with associated labels</li>
            <li>High contrast focus and selection states</li>
          </ul>
        </div>
      </section>
    </div>
  )
}