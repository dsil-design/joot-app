"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Slider } from "@/components/ui/slider"
import { useState } from "react"

export default function SliderDocumentation() {
  const [value, setValue] = useState([50])
  const [rangeValue, setRangeValue] = useState([25, 75])

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Slider</h1>
        <p className="text-lg text-muted-foreground">
          An input where the user selects a value from within a given range.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Default</h3>
            <ComponentDemo>
              <div className="w-full max-w-sm space-y-2">
                <Slider
                  value={value}
                  onValueChange={setValue}
                  max={100}
                  step={1}
                />
                <div className="text-center text-sm text-muted-foreground">
                  Value: {value[0]}
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`const [value, setValue] = useState([50])

<Slider
  value={value}
  onValueChange={setValue}
  max={100}
  step={1}
/>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Range</h3>
            <ComponentDemo>
              <div className="w-full max-w-sm space-y-2">
                <Slider
                  value={rangeValue}
                  onValueChange={setRangeValue}
                  max={100}
                  step={1}
                />
                <div className="text-center text-sm text-muted-foreground">
                  Range: {rangeValue[0]} - {rangeValue[1]}
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`const [rangeValue, setRangeValue] = useState([25, 75])

<Slider
  value={rangeValue}
  onValueChange={setRangeValue}
  max={100}
  step={1}
/>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Steps</h3>
            <ComponentDemo>
              <div className="w-full max-w-sm space-y-2">
                <Slider
                  defaultValue={[50]}
                  max={100}
                  step={10}
                />
                <div className="text-center text-sm text-muted-foreground">
                  Step: 10
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<Slider
  defaultValue={[50]}
  max={100}
  step={10}
/>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Disabled</h3>
            <ComponentDemo>
              <div className="w-full max-w-sm">
                <Slider
                  defaultValue={[50]}
                  max={100}
                  step={1}
                  disabled
                />
              </div>
            </ComponentDemo>
            <CodeBlock code={`<Slider
  defaultValue={[50]}
  max={100}
  step={1}
  disabled
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
              <li>Use for selecting values within a continuous range</li>
              <li>Provide visual feedback showing the current value</li>
              <li>Use appropriate step sizes for the data type</li>
              <li>Consider range sliders for selecting min/max values</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-red-600">❌ Don't</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use for discrete choices (use radio buttons instead)</li>
              <li>Make the slider too small to interact with</li>
              <li>Use without showing the current value</li>
              <li>Use for binary on/off states (use a switch instead)</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <PropsTable
          data={[
            {
              prop: "value",
              type: "number[]",
              default: "undefined",
              description: "The controlled value of the slider."
            },
            {
              prop: "defaultValue",
              type: "number[]",
              default: "[0]",
              description: "The default value when initially rendered."
            },
            {
              prop: "onValueChange",
              type: "function",
              default: "undefined",
              description: "Event handler called when the value changes."
            },
            {
              prop: "min",
              type: "number",
              default: "0",
              description: "The minimum value of the slider."
            },
            {
              prop: "max",
              type: "number",
              default: "100",
              description: "The maximum value of the slider."
            },
            {
              prop: "step",
              type: "number",
              default: "1",
              description: "The step increment of the slider."
            },
            {
              prop: "disabled",
              type: "boolean",
              default: "false",
              description: "Whether the slider is disabled."
            }
          ]}
        />
      </section>
    </div>
  )
}
