"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Calendar } from "@/components/ui/calendar"
import { useState } from "react"
import { DateRange } from "react-day-picker"

export default function CalendarDocumentation() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: undefined
  })

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Calendar</h1>
        <p className="text-lg text-muted-foreground">
          A date field component that allows users to enter and edit date.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Default</h3>
            <ComponentDemo>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
              />
            </ComponentDemo>
            <CodeBlock code={`<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
  className="rounded-md border"
/>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Date Range</h3>
            <ComponentDemo>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                className="rounded-md border"
              />
            </ComponentDemo>
            <CodeBlock code={`<Calendar
  mode="range"
  selected={dateRange}
  onSelect={setDateRange}
  numberOfMonths={2}
  className="rounded-md border"
/>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Disabled Dates</h3>
            <ComponentDemo>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                className="rounded-md border"
              />
            </ComponentDemo>
            <CodeBlock code={`<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
  disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
  className="rounded-md border"
/>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage Guidelines</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-green-600">✅ Do</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use for date selection in forms</li>
              <li>Provide clear visual feedback for selected dates</li>
              <li>Disable past dates when selecting future events</li>
              <li>Use range mode for date range selections</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-red-600">❌ Don't</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use for time selection (use time picker instead)</li>
              <li>Make the calendar too small to interact with</li>
              <li>Forget to handle edge cases like leap years</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <PropsTable
          data={[
            {
              prop: "mode",
              type: "'single' | 'multiple' | 'range'",
              default: "'single'",
              description: "The selection mode of the calendar."
            },
            {
              prop: "selected",
              type: "Date | Date[] | DateRange",
              default: "undefined",
              description: "The selected date(s)."
            },
            {
              prop: "onSelect",
              type: "function",
              default: "undefined",
              description: "Callback fired when the selection changes."
            },
            {
              prop: "disabled",
              type: "boolean | function | Date[]",
              default: "false",
              description: "Dates that should be disabled."
            },
            {
              prop: "numberOfMonths",
              type: "number",
              default: "1",
              description: "Number of months to display."
            }
          ]}
        />
      </section>
    </div>
  )
}
