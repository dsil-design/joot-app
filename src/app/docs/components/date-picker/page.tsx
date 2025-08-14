"use client"

import * as React from "react"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { DatePicker, DateInput } from "@/components/ui/date-picker"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DatePickerPage() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>()
  const [selectedDate2, setSelectedDate2] = React.useState<Date | undefined>(new Date("2024-03-13"))
  const [inputDate, setInputDate] = React.useState<Date | undefined>()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DatePicker</h1>
        <p className="text-lg text-muted-foreground">
          A date picker with input field and calendar popover. Users can type dates directly or use the calendar interface.
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">Examples</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Default</h3>
              <ComponentDemo description="A date picker with input field and calendar icon. Type directly or click the calendar icon.">
                <div className="w-[280px]">
                  <DatePicker
                    date={selectedDate}
                    onDateChange={setSelectedDate}
                    placeholder="Pick a date"
                  />
                </div>
              </ComponentDemo>
              <CodeBlock code={`import { DatePicker } from "@/components/ui/date-picker"

function Example() {
  const [date, setDate] = React.useState<Date>()

  return (
    <DatePicker
      date={date}
      onDateChange={setDate}
      placeholder="Pick a date"
    />
  )
}`} />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">With Label and Default Value</h3>
              <ComponentDemo description="A date picker with a label and pre-selected date.">
                <div className="w-[280px]">
                  <DatePicker
                    date={selectedDate2}
                    onDateChange={setSelectedDate2}
                    placeholder="Select subscription date"
                    label="Subscription Date"
                  />
                </div>
              </ComponentDemo>
              <CodeBlock code={`import { DatePicker } from "@/components/ui/date-picker"

function Example() {
  const [date, setDate] = React.useState<Date>(new Date("2024-03-13"))

  return (
    <DatePicker
      date={date}
      onDateChange={setDate}
      placeholder="Select subscription date"
      label="Subscription Date"
    />
  )
}`} />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Keyboard Navigation</h3>
              <ComponentDemo description="Press Arrow Down to open calendar, Escape to close, or type dates in various formats.">
                <div className="w-[280px]">
                  <DatePicker
                    date={inputDate}
                    onDateChange={setInputDate}
                    placeholder="Try typing '3/13/2024' or 'March 13, 2024'"
                  />
                </div>
              </ComponentDemo>
              <CodeBlock code={`import { DatePicker } from "@/components/ui/date-picker"

function Example() {
  const [date, setDate] = React.useState<Date>()

  return (
    <DatePicker
      date={date}
      onDateChange={setDate}
      placeholder="Try typing a date..."
    />
  )
}

// Supports multiple formats:
// - "March 13, 2024" 
// - "Mar 13, 2024"
// - "3/13/2024"
// - "2024-03-13"
// - And more...`} />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Date Input (Legacy)</h3>
              <ComponentDemo description="A simple date input field without popover (legacy component for backward compatibility).">
                <div className="w-[280px]">
                  <DateInput
                    date={inputDate}
                    onDateChange={setInputDate}
                    placeholder="March 13, 2024"
                  />
                </div>
              </ComponentDemo>
              <CodeBlock code={`import { DateInput } from "@/components/ui/date-picker"

function Example() {
  const [date, setDate] = React.useState<Date>()

  return (
    <DateInput
      date={date}
      onDateChange={setDate}
      placeholder="March 13, 2024"
    />
  )
}`} />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Disabled State</h3>
              <ComponentDemo description="Date pickers can be disabled to prevent interaction.">
                <div className="w-[280px] space-y-4">
                  <DatePicker
                    date={new Date("2024-03-13")}
                    disabled
                    placeholder="Pick a date"
                  />
                  <DateInput
                    date={new Date("2024-03-13")}
                    disabled
                    placeholder="March 13, 2024"
                  />
                </div>
              </ComponentDemo>
              <CodeBlock code={`import { DatePicker, DateInput } from "@/components/ui/date-picker"

function Example() {
  return (
    <div className="space-y-4">
      <DatePicker
        date={new Date("2024-03-13")}
        disabled
        placeholder="Pick a date"
      />
      <DateInput
        date={new Date("2024-03-13")}
        disabled
        placeholder="March 13, 2024"
      />
    </div>
  )
}`} />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Custom Format</h3>
              <ComponentDemo description="Customize the date format display.">
                <div className="w-[280px]">
                  <DatePicker
                    date={selectedDate2}
                    onDateChange={setSelectedDate2}
                    formatStr="yyyy-MM-dd"
                    placeholder="Select date"
                  />
                </div>
              </ComponentDemo>
              <CodeBlock code={`import { DatePicker } from "@/components/ui/date-picker"

function Example() {
  const [date, setDate] = React.useState<Date>(new Date("2024-03-13"))

  return (
    <DatePicker
      date={date}
      onDateChange={setDate}
      formatStr="yyyy-MM-dd"
      placeholder="Select date"
    />
  )
}`} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">Usage</h2>
          
          <Card>
            <CardHeader>
              <CardTitle>Installation</CardTitle>
              <CardDescription>
                Copy and paste the following code into your project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                <code>{`npm install date-fns`}</code>
              </pre>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">API Reference</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">DatePicker</h3>
              <PropsTable
                data={[
                  {
                    prop: "date",
                    type: "Date | undefined",
                    description: "The selected date value.",
                  },
                  {
                    prop: "onDateChange",
                    type: "(date: Date | undefined) => void",
                    description: "Callback function called when the date changes.",
                  },
                  {
                    prop: "placeholder",
                    type: "string",
                    description: "Placeholder text when no date is selected.",
                    default: '"Pick a date"',
                  },
                  {
                    prop: "disabled",
                    type: "boolean",
                    description: "Whether the date picker is disabled.",
                    default: "false",
                  },
                  {
                    prop: "formatStr",
                    type: "string",
                    description: "Date format string using date-fns format.",
                    default: '"MMMM d, yyyy"',
                  },
                  {
                    prop: "size",
                    type: '"default" | "sm" | "lg"',
                    description: "Size variant of the date picker.",
                    default: '"default"',
                  },
                  {
                    prop: "className",
                    type: "string",
                    description: "Additional CSS classes to apply.",
                  },
                  {
                    prop: "label",
                    type: "string",
                    description: "Accessible label for the date input field.",
                  },
                ]}
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">DateInput</h3>
              <PropsTable
                data={[
                  {
                    prop: "date",
                    type: "Date | undefined",
                    description: "The selected date value.",
                  },
                  {
                    prop: "onDateChange",
                    type: "(date: Date | undefined) => void",
                    description: "Callback function called when the date changes.",
                  },
                  {
                    prop: "placeholder",
                    type: "string",
                    description: "Placeholder text for the input.",
                    default: '"March 13, 2024"',
                  },
                  {
                    prop: "formatStr",
                    type: "string",
                    description: "Date format string using date-fns format.",
                    default: '"MMMM d, yyyy"',
                  },
                  {
                    prop: "disabled",
                    type: "boolean",
                    description: "Whether the input is disabled.",
                    default: "false",
                  },
                  {
                    prop: "className",
                    type: "string",
                    description: "Additional CSS classes to apply.",
                  },
                ]}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">Accessibility</h2>
          
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-2 text-sm">
                <li>• Uses proper ARIA labels and roles for screen readers</li>
                <li>• Keyboard navigation: Arrow Down to open calendar, Escape to close</li>
                <li>• Focus management when opening/closing the calendar popover</li>
                <li>• Direct text input with intelligent date parsing in multiple formats</li>
                <li>• Calendar icon click and keyboard triggers both open the popover</li>
                <li>• Disabled state properly communicated to assistive technologies</li>
                <li>• Input automatically reformats to consistent format on blur</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}