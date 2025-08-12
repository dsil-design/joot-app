"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Minus, Plus, Settings } from "lucide-react"
import { useState } from "react"

export default function DrawerPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Drawer</h1>
        <p className="text-lg text-muted-foreground">
          A drawer component for navigation, overlays, and modal content that slides in from the edge of the screen.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Basic Drawer</h3>
            <ComponentDemo>
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="outline">Open Drawer</Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Basic Drawer</DrawerTitle>
                    <DrawerDescription>
                      This is a basic drawer example with simple content.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground">
                      This is the drawer content. You can put any components here.
                    </p>
                  </div>
                  <DrawerFooter>
                    <DrawerClose asChild>
                      <Button variant="outline">Close</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </ComponentDemo>
            <CodeBlock code={`<Drawer>
  <DrawerTrigger asChild>
    <Button variant="outline">Open Drawer</Button>
  </DrawerTrigger>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Basic Drawer</DrawerTitle>
      <DrawerDescription>
        This is a basic drawer example with simple content.
      </DrawerDescription>
    </DrawerHeader>
    <div className="p-4">
      <p className="text-sm text-muted-foreground">
        This is the drawer content. You can put any components here.
      </p>
    </div>
    <DrawerFooter>
      <DrawerClose asChild>
        <Button variant="outline">Close</Button>
      </DrawerClose>
    </DrawerFooter>
  </DrawerContent>
</Drawer>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Drawer with Form</h3>
            <ComponentDemo>
              <Drawer>
                <DrawerTrigger asChild>
                  <Button>Create Account</Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Create Account</DrawerTitle>
                    <DrawerDescription>
                      Fill out the form below to create your account.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" placeholder="Enter your name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="Enter your email" />
                    </div>
                  </div>
                  <DrawerFooter>
                    <Button>Create Account</Button>
                    <DrawerClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </ComponentDemo>
            <CodeBlock code={`<Drawer>
  <DrawerTrigger asChild>
    <Button>Create Account</Button>
  </DrawerTrigger>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Create Account</DrawerTitle>
      <DrawerDescription>
        Fill out the form below to create your account.
      </DrawerDescription>
    </DrawerHeader>
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Enter your name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="Enter your email" />
      </div>
    </div>
    <DrawerFooter>
      <Button>Create Account</Button>
      <DrawerClose asChild>
        <Button variant="outline">Cancel</Button>
      </DrawerClose>
    </DrawerFooter>
  </DrawerContent>
</Drawer>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Different Directions</h3>
            <ComponentDemo>
              <div className="flex gap-4 flex-wrap">
                <Drawer direction="bottom">
                  <DrawerTrigger asChild>
                    <Button variant="outline">Bottom</Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Bottom Drawer</DrawerTitle>
                      <DrawerDescription>Slides up from the bottom</DrawerDescription>
                    </DrawerHeader>
                    <DrawerFooter>
                      <DrawerClose asChild>
                        <Button variant="outline">Close</Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>

                <Drawer direction="top">
                  <DrawerTrigger asChild>
                    <Button variant="outline">Top</Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Top Drawer</DrawerTitle>
                      <DrawerDescription>Slides down from the top</DrawerDescription>
                    </DrawerHeader>
                    <DrawerFooter>
                      <DrawerClose asChild>
                        <Button variant="outline">Close</Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>

                <Drawer direction="left">
                  <DrawerTrigger asChild>
                    <Button variant="outline">Left</Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Left Drawer</DrawerTitle>
                      <DrawerDescription>Slides in from the left</DrawerDescription>
                    </DrawerHeader>
                    <DrawerFooter>
                      <DrawerClose asChild>
                        <Button variant="outline">Close</Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>

                <Drawer direction="right">
                  <DrawerTrigger asChild>
                    <Button variant="outline">Right</Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Right Drawer</DrawerTitle>
                      <DrawerDescription>Slides in from the right</DrawerDescription>
                    </DrawerHeader>
                    <DrawerFooter>
                      <DrawerClose asChild>
                        <Button variant="outline">Close</Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              </div>
            </ComponentDemo>
            <CodeBlock code={`// Bottom Drawer (default)
<Drawer direction="bottom">
  <DrawerTrigger asChild>
    <Button variant="outline">Bottom</Button>
  </DrawerTrigger>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Bottom Drawer</DrawerTitle>
      <DrawerDescription>Slides up from the bottom</DrawerDescription>
    </DrawerHeader>
    <DrawerFooter>
      <DrawerClose asChild>
        <Button variant="outline">Close</Button>
      </DrawerClose>
    </DrawerFooter>
  </DrawerContent>
</Drawer>

// Other directions: "top", "left", "right"
<Drawer direction="right">
  {/* ... */}
</Drawer>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Responsive Drawer</h3>
            <ComponentDemo>
              <Drawer>
                <DrawerTrigger asChild>
                  <Button>
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="h-[80vh]">
                  <DrawerHeader>
                    <DrawerTitle>Settings</DrawerTitle>
                    <DrawerDescription>
                      Manage your application settings and preferences.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="p-4 flex-1 overflow-auto">
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-medium mb-2">General</h4>
                        <div className="space-y-2">
                          <Label htmlFor="theme">Theme</Label>
                          <Input id="theme" value="Dark" readOnly />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Notifications</h4>
                        <div className="space-y-2">
                          <Label htmlFor="notifications">Email notifications</Label>
                          <Input id="notifications" value="Enabled" readOnly />
                        </div>
                      </div>
                    </div>
                  </div>
                  <DrawerFooter>
                    <Button>Save Changes</Button>
                    <DrawerClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </ComponentDemo>
            <CodeBlock code={`<Drawer>
  <DrawerTrigger asChild>
    <Button>
      <Settings className="h-4 w-4" />
      Settings
    </Button>
  </DrawerTrigger>
  <DrawerContent className="h-[80vh]">
    <DrawerHeader>
      <DrawerTitle>Settings</DrawerTitle>
      <DrawerDescription>
        Manage your application settings and preferences.
      </DrawerDescription>
    </DrawerHeader>
    <div className="p-4 flex-1 overflow-auto">
      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-2">General</h4>
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Input id="theme" value="Dark" readOnly />
          </div>
        </div>
        <div>
          <h4 className="font-medium mb-2">Notifications</h4>
          <div className="space-y-2">
            <Label htmlFor="notifications">Email notifications</Label>
            <Input id="notifications" value="Enabled" readOnly />
          </div>
        </div>
      </div>
    </div>
    <DrawerFooter>
      <Button>Save Changes</Button>
      <DrawerClose asChild>
        <Button variant="outline">Cancel</Button>
      </DrawerClose>
    </DrawerFooter>
  </DrawerContent>
</Drawer>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add drawer"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

export function Example() {
  return (
    <Drawer>
      <DrawerTrigger>Open</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Are you absolutely sure?</DrawerTitle>
          <DrawerDescription>This action cannot be undone.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button>Submit</Button>
          <DrawerClose>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Drawer</h3>
            <PropsTable
              data={[
                {
                  prop: "direction",
                  type: "'top' | 'right' | 'bottom' | 'left'",
                  default: "'bottom'",
                  description: "Direction from which the drawer slides in.",
                },
                {
                  prop: "shouldScaleBackground",
                  type: "boolean",
                  default: "true",
                  description: "Whether the background should scale when drawer is open.",
                },
                {
                  prop: "snapPoints",
                  type: "(string | number)[]",
                  description: "Array of snap points that the drawer will snap to while dragging or after an open/close animation.",
                },
                {
                  prop: "fadeFromIndex",
                  type: "number",
                  description: "Index of a snap point from which the overlay fade should be applied.",
                },
                {
                  prop: "modal",
                  type: "boolean",
                  default: "true",
                  description: "When true, only the drawer content can be interacted with.",
                },
                {
                  prop: "dismissible",
                  type: "boolean",
                  default: "true",
                  description: "When true, the drawer can be dismissed by clicking the overlay or pressing Escape.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">DrawerTrigger</h3>
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
            <h3 className="text-lg font-medium mb-2">DrawerContent</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the content.",
                },
                {
                  prop: "onEscapeKeyDown",
                  type: "(event: KeyboardEvent) => void",
                  description: "Event handler called when the escape key is down.",
                },
                {
                  prop: "onPointerDownOutside",
                  type: "(event: PointerDownOutsideEvent) => void",
                  description: "Event handler called when pointer is pressed down outside the component.",
                },
                {
                  prop: "onInteractOutside",
                  type: "(event: Event) => void",
                  description: "Event handler called when an interaction happens outside the component.",
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
            The Drawer component follows WAI-ARIA dialog pattern and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Focus management and trapping within the drawer</li>
            <li>Keyboard navigation support (Escape to close)</li>
            <li>Screen reader announcements with aria-describedby</li>
            <li>Proper heading hierarchy with DrawerTitle</li>
            <li>Background overlay with appropriate opacity</li>
            <li>Dismissible on outside interaction (customizable)</li>
          </ul>
        </div>
      </section>
    </div>
  )
}