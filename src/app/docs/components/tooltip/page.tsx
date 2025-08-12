"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function TooltipDocumentation() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Tooltip</h1>
        <p className="text-lg text-muted-foreground">
          A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Default</h3>
            <ComponentDemo>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">Hover</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add to library</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </ComponentDemo>
            <CodeBlock code={`<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline">Hover</Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Add to library</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Icon</h3>
            <ComponentDemo>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add new item</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </ComponentDemo>
            <CodeBlock code={`<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline" size="icon">
        <Plus className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Add new item</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Side</h3>
            <ComponentDemo>
              <div className="flex gap-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">Top</Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Tooltip on top</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">Right</Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Tooltip on right</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">Bottom</Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Tooltip on bottom</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">Left</Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>Tooltip on left</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline">Top</Button>
    </TooltipTrigger>
    <TooltipContent side="top">
      <p>Tooltip on top</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline">Right</Button>
    </TooltipTrigger>
    <TooltipContent side="right">
      <p>Tooltip on right</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Delay</h3>
            <ComponentDemo>
              <TooltipProvider delayDuration={800}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">Slow tooltip</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This tooltip has a longer delay</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </ComponentDemo>
            <CodeBlock code={`<TooltipProvider delayDuration={800}>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline">Slow tooltip</Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>This tooltip has a longer delay</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage Guidelines</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-green-600">✅ Do</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use for providing additional context or information</li>
              <li>Keep tooltip content concise and helpful</li>
              <li>Use for icon buttons that need explanation</li>
              <li>Ensure tooltips don't cover important content</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-red-600">❌ Don't</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use for critical information (use visible text instead)</li>
              <li>Make tooltips too long or complex</li>
              <li>Use for mobile-only interfaces (no hover state)</li>
              <li>Include interactive elements in tooltips</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <PropsTable
          data={[
            {
              prop: "delayDuration",
              type: "number",
              default: "700",
              description: "The duration from when the mouse enters the trigger until the tooltip gets opened."
            },
            {
              prop: "skipDelayDuration",
              type: "number",
              default: "300",
              description: "How much time a user has to enter another trigger without incurring a delay again."
            },
            {
              prop: "side",
              type: "'top' | 'right' | 'bottom' | 'left'",
              default: "'top'",
              description: "The preferred side of the trigger to render against."
            },
            {
              prop: "align",
              type: "'start' | 'center' | 'end'",
              default: "'center'",
              description: "The preferred alignment against the trigger."
            },
            {
              prop: "sideOffset",
              type: "number",
              default: "4",
              description: "The distance in pixels from the trigger."
            }
          ]}
        />
      </section>
    </div>
  )
}
