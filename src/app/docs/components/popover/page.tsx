"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarIcon, User } from "lucide-react"
import { useState } from "react"
import { format } from "date-fns"

export default function PopoverPage() {
  const [date, setDate] = useState<Date>()
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Popover</h1>
        <p className="text-lg text-muted-foreground">
          Display rich content in a portal, triggered by a button.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Basic Popover</h3>
            <ComponentDemo>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">Open popover</Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Dimensions</h4>
                      <p className="text-sm text-muted-foreground">
                        Set the dimensions for the layer.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="width">Width</Label>
                        <Input
                          id="width"
                          defaultValue="100%"
                          className="col-span-2 h-8"
                        />
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="maxWidth">Max. width</Label>
                        <Input
                          id="maxWidth"
                          defaultValue="300px"
                          className="col-span-2 h-8"
                        />
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="height">Height</Label>
                        <Input
                          id="height"
                          defaultValue="25px"
                          className="col-span-2 h-8"
                        />
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="maxHeight">Max. height</Label>
                        <Input
                          id="maxHeight"
                          defaultValue="none"
                          className="col-span-2 h-8"
                        />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </ComponentDemo>
            <CodeBlock code={`<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">Open popover</Button>
  </PopoverTrigger>
  <PopoverContent className="w-80">
    <div className="grid gap-4">
      <div className="space-y-2">
        <h4 className="font-medium leading-none">Dimensions</h4>
        <p className="text-sm text-muted-foreground">
          Set the dimensions for the layer.
        </p>
      </div>
      <div className="grid gap-2">
        <div className="grid grid-cols-3 items-center gap-4">
          <Label htmlFor="width">Width</Label>
          <Input
            id="width"
            defaultValue="100%"
            className="col-span-2 h-8"
          />
        </div>
        <div className="grid grid-cols-3 items-center gap-4">
          <Label htmlFor="maxWidth">Max. width</Label>
          <Input
            id="maxWidth"
            defaultValue="300px"
            className="col-span-2 h-8"
          />
        </div>
        <div className="grid grid-cols-3 items-center gap-4">
          <Label htmlFor="height">Height</Label>
          <Input
            id="height"
            defaultValue="25px"
            className="col-span-2 h-8"
          />
        </div>
        <div className="grid grid-cols-3 items-center gap-4">
          <Label htmlFor="maxHeight">Max. height</Label>
          <Input
            id="maxHeight"
            defaultValue="none"
            className="col-span-2 h-8"
          />
        </div>
      </div>
    </div>
  </PopoverContent>
</Popover>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Date Picker</h3>
            <ComponentDemo>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[280px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </ComponentDemo>
            <CodeBlock code={`import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { useState } from "react"

const [date, setDate] = useState<Date>()

<Popover>
  <PopoverTrigger asChild>
    <Button
      variant="outline"
      className="w-[280px] justify-start text-left font-normal"
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {date ? format(date, "PPP") : <span>Pick a date</span>}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0">
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      initialFocus
    />
  </PopoverContent>
</Popover>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Form Popover</h3>
            <ComponentDemo>
              <Popover>
                <PopoverTrigger asChild>
                  <Button>
                    <User className="mr-2 h-4 w-4" />
                    Update profile
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Profile</h4>
                      <p className="text-sm text-muted-foreground">
                        Update your profile information.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          defaultValue="Pedro Duarte"
                          className="col-span-2 h-8"
                        />
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          defaultValue="@peduarte"
                          className="col-span-2 h-8"
                        />
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          defaultValue="pedro@example.com"
                          className="col-span-2 h-8"
                        />
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          placeholder="Tell us about yourself"
                          className="col-span-2"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                      <Button size="sm">Save changes</Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </ComponentDemo>
            <CodeBlock code={`<Popover>
  <PopoverTrigger asChild>
    <Button>
      <User className="mr-2 h-4 w-4" />
      Update profile
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-80">
    <div className="grid gap-4">
      <div className="space-y-2">
        <h4 className="font-medium leading-none">Profile</h4>
        <p className="text-sm text-muted-foreground">
          Update your profile information.
        </p>
      </div>
      <div className="grid gap-2">
        <div className="grid grid-cols-3 items-center gap-4">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            defaultValue="Pedro Duarte"
            className="col-span-2 h-8"
          />
        </div>
        <div className="grid grid-cols-3 items-center gap-4">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            defaultValue="@peduarte"
            className="col-span-2 h-8"
          />
        </div>
        <div className="grid grid-cols-3 items-center gap-4">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            defaultValue="pedro@example.com"
            className="col-span-2 h-8"
          />
        </div>
        <div className="grid grid-cols-3 items-center gap-4">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            placeholder="Tell us about yourself"
            className="col-span-2"
          />
        </div>
      </div>
      <div className="flex justify-end space-x-2 pt-2">
        <Button size="sm">Save changes</Button>
      </div>
    </div>
  </PopoverContent>
</Popover>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Different Positions</h3>
            <ComponentDemo>
              <div className="flex flex-wrap gap-8 justify-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">Top</Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" className="w-60">
                    <div className="space-y-2">
                      <h4 className="font-medium">Top Position</h4>
                      <p className="text-sm text-muted-foreground">
                        This popover appears above the trigger.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">Right</Button>
                  </PopoverTrigger>
                  <PopoverContent side="right" className="w-60">
                    <div className="space-y-2">
                      <h4 className="font-medium">Right Position</h4>
                      <p className="text-sm text-muted-foreground">
                        This popover appears to the right of the trigger.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">Bottom</Button>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" className="w-60">
                    <div className="space-y-2">
                      <h4 className="font-medium">Bottom Position</h4>
                      <p className="text-sm text-muted-foreground">
                        This popover appears below the trigger (default).
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">Left</Button>
                  </PopoverTrigger>
                  <PopoverContent side="left" className="w-60">
                    <div className="space-y-2">
                      <h4 className="font-medium">Left Position</h4>
                      <p className="text-sm text-muted-foreground">
                        This popover appears to the left of the trigger.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="flex flex-wrap gap-8 justify-center">
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline">Top</Button>
    </PopoverTrigger>
    <PopoverContent side="top" className="w-60">
      <div className="space-y-2">
        <h4 className="font-medium">Top Position</h4>
        <p className="text-sm text-muted-foreground">
          This popover appears above the trigger.
        </p>
      </div>
    </PopoverContent>
  </Popover>

  {/* Similarly for other positions: "right", "bottom", "left" */}
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Controlled Popover</h3>
            <ComponentDemo>
              <div className="flex items-center space-x-2">
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      {open ? "Close" : "Open"} popover
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">Controlled</h4>
                        <p className="text-sm text-muted-foreground">
                          This popover's open state is controlled by React state.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="option">Choose an option</Label>
                        <Select>
                          <SelectTrigger id="option">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="option1">Option 1</SelectItem>
                            <SelectItem value="option2">Option 2</SelectItem>
                            <SelectItem value="option3">Option 3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOpen(false)}
                        >
                          Close
                        </Button>
                        <Button size="sm" onClick={() => setOpen(false)}>
                          Apply
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <span className="text-sm text-muted-foreground">
                  Open state: {open ? "true" : "false"}
                </span>
              </div>
            </ComponentDemo>
            <CodeBlock code={`const [open, setOpen] = useState(false)

<div className="flex items-center space-x-2">
  <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button variant="outline">
        {open ? "Close" : "Open"} popover
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-80">
      <div className="grid gap-4">
        <div className="space-y-2">
          <h4 className="font-medium leading-none">Controlled</h4>
          <p className="text-sm text-muted-foreground">
            This popover's open state is controlled by React state.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="option">Choose an option</Label>
          <Select>
            <SelectTrigger id="option">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
              <SelectItem value="option3">Option 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>
            Apply
          </Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
  <span className="text-sm text-muted-foreground">
    Open state: {open ? "true" : "false"}
  </span>
</div>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add popover"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function Example() {
  return (
    <Popover>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverContent>Place content for the popover here.</PopoverContent>
    </Popover>
  )
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Popover</h3>
            <PropsTable
              data={[
                {
                  prop: "defaultOpen",
                  type: "boolean",
                  description: "The open state of the popover when it is initially rendered.",
                },
                {
                  prop: "open",
                  type: "boolean",
                  description: "The controlled open state of the popover.",
                },
                {
                  prop: "onOpenChange",
                  type: "(open: boolean) => void",
                  description: "Event handler called when the open state of the popover changes.",
                },
                {
                  prop: "modal",
                  type: "boolean",
                  default: "false",
                  description: "The modality of the popover. When set to true, interaction with outside elements will be disabled.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">PopoverTrigger</h3>
            <PropsTable
              data={[
                {
                  prop: "asChild",
                  type: "boolean",
                  default: "false",
                  description: "Change the default rendered element for the one passed as a child.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">PopoverContent</h3>
            <PropsTable
              data={[
                {
                  prop: "align",
                  type: "'start' | 'center' | 'end'",
                  default: "'center'",
                  description: "The preferred alignment against the trigger.",
                },
                {
                  prop: "alignOffset",
                  type: "number",
                  default: "0",
                  description: "An offset in pixels from the 'start' or 'end' alignment options.",
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
                  default: "0",
                  description: "The distance in pixels from the trigger.",
                },
                {
                  prop: "avoidCollisions",
                  type: "boolean",
                  default: "true",
                  description: "When true, overrides the side and align preferences to prevent collisions with viewport edges.",
                },
                {
                  prop: "collisionBoundary",
                  type: "Element | null | Array<Element | null>",
                  default: "[]",
                  description: "The element used as the collision boundary.",
                },
                {
                  prop: "collisionPadding",
                  type: "number | Partial<Record<Side, number>>",
                  default: "0",
                  description: "The distance in pixels from the boundary edges where collision detection should occur.",
                },
                {
                  prop: "sticky",
                  type: "'partial' | 'always'",
                  default: "'partial'",
                  description: "The sticky behavior on the align axis.",
                },
                {
                  prop: "hideWhenDetached",
                  type: "boolean",
                  default: "false",
                  description: "Whether to hide the content when the trigger becomes fully occluded.",
                },
                {
                  prop: "forceMount",
                  type: "boolean",
                  description: "Used to force mounting when more control is needed.",
                },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            The Popover component follows WAI-ARIA popover pattern and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Automatic focus management and restoration</li>
            <li>Screen reader announcements with proper ARIA attributes</li>
            <li>Keyboard navigation support (Escape to close, Tab to cycle through focusable elements)</li>
            <li>Dismissible on outside click or Escape key</li>
            <li>Support for modal and non-modal behavior</li>
            <li>Collision detection to stay within viewport</li>
            <li>Proper heading hierarchy support</li>
          </ul>
        </div>
      </section>
    </div>
  )
}