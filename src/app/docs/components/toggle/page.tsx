"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Toggle } from "@/components/ui/toggle"
import { Bold, Italic, Underline } from "lucide-react"

export default function ToggleDocumentation() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Toggle</h1>
        <p className="text-lg text-muted-foreground">
          A two-state button that can be either on or off.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Default</h3>
            <ComponentDemo>
              <Toggle aria-label="Toggle italic">
                <Bold className="h-4 w-4" />
              </Toggle>
            </ComponentDemo>
            <CodeBlock code={`<Toggle aria-label="Toggle italic">
  <Bold className="h-4 w-4" />
</Toggle>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Outline</h3>
            <ComponentDemo>
              <Toggle variant="outline" aria-label="Toggle italic">
                <Italic className="h-4 w-4" />
              </Toggle>
            </ComponentDemo>
            <CodeBlock code={`<Toggle variant="outline" aria-label="Toggle italic">
  <Italic className="h-4 w-4" />
</Toggle>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Text</h3>
            <ComponentDemo>
              <Toggle aria-label="Toggle italic">
                <Italic className="mr-2 h-4 w-4" />
                Italic
              </Toggle>
            </ComponentDemo>
            <CodeBlock code={`<Toggle aria-label="Toggle italic">
  <Italic className="mr-2 h-4 w-4" />
  Italic
</Toggle>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Small</h3>
            <ComponentDemo>
              <Toggle size="sm" aria-label="Toggle italic">
                <Italic className="h-4 w-4" />
              </Toggle>
            </ComponentDemo>
            <CodeBlock code={`<Toggle size="sm" aria-label="Toggle italic">
  <Italic className="h-4 w-4" />
</Toggle>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Large</h3>
            <ComponentDemo>
              <Toggle size="lg" aria-label="Toggle italic">
                <Italic className="h-4 w-4" />
              </Toggle>
            </ComponentDemo>
            <CodeBlock code={`<Toggle size="lg" aria-label="Toggle italic">
  <Italic className="h-4 w-4" />
</Toggle>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Disabled</h3>
            <ComponentDemo>
              <Toggle aria-label="Toggle italic" disabled>
                <Italic className="h-4 w-4" />
              </Toggle>
            </ComponentDemo>
            <CodeBlock code={`<Toggle aria-label="Toggle italic" disabled>
  <Italic className="h-4 w-4" />
</Toggle>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Toolbar Example</h3>
            <ComponentDemo>
              <div className="flex items-center space-x-1">
                <Toggle aria-label="Toggle bold">
                  <Bold className="h-4 w-4" />
                </Toggle>
                <Toggle aria-label="Toggle italic">
                  <Italic className="h-4 w-4" />
                </Toggle>
                <Toggle aria-label="Toggle underline">
                  <Underline className="h-4 w-4" />
                </Toggle>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="flex items-center space-x-1">
  <Toggle aria-label="Toggle bold">
    <Bold className="h-4 w-4" />
  </Toggle>
  <Toggle aria-label="Toggle italic">
    <Italic className="h-4 w-4" />
  </Toggle>
  <Toggle aria-label="Toggle underline">
    <Underline className="h-4 w-4" />
  </Toggle>
</div>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage Guidelines</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-green-600">✅ Do</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use for binary on/off states</li>
              <li>Provide clear visual feedback for the active state</li>
              <li>Include appropriate ARIA labels</li>
              <li>Group related toggles together in toolbars</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-red-600">❌ Don't</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use for actions that navigate or submit forms</li>
              <li>Use when a switch component would be more appropriate</li>
              <li>Make the toggle too small to interact with</li>
              <li>Use without clear indication of what will be toggled</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <PropsTable
          data={[
            {
              prop: "pressed",
              type: "boolean",
              default: "false",
              description: "The controlled pressed state of the toggle."
            },
            {
              prop: "defaultPressed",
              type: "boolean",
              default: "false",
              description: "The default pressed state when initially rendered."
            },
            {
              prop: "onPressedChange",
              type: "function",
              default: "undefined",
              description: "Event handler called when the pressed state changes."
            },
            {
              prop: "disabled",
              type: "boolean",
              default: "false",
              description: "Whether the toggle is disabled."
            },
            {
              prop: "variant",
              type: "'default' | 'outline'",
              default: "'default'",
              description: "The variant of the toggle."
            },
            {
              prop: "size",
              type: "'default' | 'sm' | 'lg'",
              default: "'default'",
              description: "The size of the toggle."
            }
          ]}
        />
      </section>
    </div>
  )
}
