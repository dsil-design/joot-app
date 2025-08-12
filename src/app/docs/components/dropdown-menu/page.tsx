"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChevronDown,
  Cloud,
  CreditCard,
  Github,
  Keyboard,
  LifeBuoy,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  PlusCircle,
  Settings,
  User,
  UserPlus,
  Users,
} from "lucide-react"
import { useState } from "react"

export default function DropdownMenuPage() {
  const [showStatusBar, setShowStatusBar] = useState(true)
  const [showActivityBar, setShowActivityBar] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [position, setPosition] = useState("bottom")

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Dropdown Menu</h1>
        <p className="text-lg text-muted-foreground">
          Display a menu to the user — such as a set of actions or functions — triggered by a button.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Basic Dropdown</h3>
            <ComponentDemo>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Open</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="h-4 w-4" />
                    Profile
                    <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CreditCard className="h-4 w-4" />
                    Billing
                    <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4" />
                    Settings
                    <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogOut className="h-4 w-4" />
                    Log out
                    <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ComponentDemo>
            <CodeBlock code={`<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Open</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="w-56">
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <User className="h-4 w-4" />
      Profile
      <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
    </DropdownMenuItem>
    <DropdownMenuItem>
      <CreditCard className="h-4 w-4" />
      Billing
      <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
    </DropdownMenuItem>
    <DropdownMenuItem>
      <Settings className="h-4 w-4" />
      Settings
      <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <LogOut className="h-4 w-4" />
      Log out
      <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Checkboxes</h3>
            <ComponentDemo>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    View
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={showStatusBar}
                    onCheckedChange={setShowStatusBar}
                  >
                    Status Bar
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={showActivityBar}
                    onCheckedChange={setShowActivityBar}
                    disabled
                  >
                    Activity Bar
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={showPanel}
                    onCheckedChange={setShowPanel}
                  >
                    Panel
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ComponentDemo>
            <CodeBlock code={`const [showStatusBar, setShowStatusBar] = useState(true)
const [showActivityBar, setShowActivityBar] = useState(false)
const [showPanel, setShowPanel] = useState(false)

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">
      View
      <ChevronDown className="h-4 w-4 ml-2" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="w-56">
    <DropdownMenuLabel>Appearance</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuCheckboxItem
      checked={showStatusBar}
      onCheckedChange={setShowStatusBar}
    >
      Status Bar
    </DropdownMenuCheckboxItem>
    <DropdownMenuCheckboxItem
      checked={showActivityBar}
      onCheckedChange={setShowActivityBar}
      disabled
    >
      Activity Bar
    </DropdownMenuCheckboxItem>
    <DropdownMenuCheckboxItem
      checked={showPanel}
      onCheckedChange={setShowPanel}
    >
      Panel
    </DropdownMenuCheckboxItem>
  </DropdownMenuContent>
</DropdownMenu>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Radio Group</h3>
            <ComponentDemo>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Panel Position</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Panel Position</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
                    <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="right">Right</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </ComponentDemo>
            <CodeBlock code={`const [position, setPosition] = useState("bottom")

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Panel Position</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="w-56">
    <DropdownMenuLabel>Panel Position</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
      <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="right">Right</DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  </DropdownMenuContent>
</DropdownMenu>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Submenus</h3>
            <ComponentDemo>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Menu</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <User className="h-4 w-4" />
                      Profile
                      <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <CreditCard className="h-4 w-4" />
                      Billing
                      <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4" />
                      Settings
                      <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Keyboard className="h-4 w-4" />
                      Keyboard shortcuts
                      <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <Users className="h-4 w-4" />
                      Team
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <UserPlus className="h-4 w-4" />
                        Invite users
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem>
                          <Mail className="h-4 w-4" />
                          Email
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <MessageSquare className="h-4 w-4" />
                          Message
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <PlusCircle className="h-4 w-4" />
                          More...
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem>
                      <Plus className="h-4 w-4" />
                      New Team
                      <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Github className="h-4 w-4" />
                    GitHub
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <LifeBuoy className="h-4 w-4" />
                    Support
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <Cloud className="h-4 w-4" />
                    API
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogOut className="h-4 w-4" />
                    Log out
                    <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ComponentDemo>
            <CodeBlock code={`<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="w-56">
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuGroup>
      <DropdownMenuItem>
        <User className="h-4 w-4" />
        Profile
        <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
      </DropdownMenuItem>
      {/* ... other items */}
    </DropdownMenuGroup>
    <DropdownMenuSeparator />
    <DropdownMenuGroup>
      <DropdownMenuItem>
        <Users className="h-4 w-4" />
        Team
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <UserPlus className="h-4 w-4" />
          Invite users
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem>
            <Mail className="h-4 w-4" />
            Email
          </DropdownMenuItem>
          <DropdownMenuItem>
            <MessageSquare className="h-4 w-4" />
            Message
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <PlusCircle className="h-4 w-4" />
            More...
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      {/* ... more items */}
    </DropdownMenuGroup>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <LogOut className="h-4 w-4" />
      Log out
      <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add dropdown-menu"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Example() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Open</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Billing</DropdownMenuItem>
        <DropdownMenuItem>Team</DropdownMenuItem>
        <DropdownMenuItem>Subscription</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">DropdownMenu</h3>
            <PropsTable
              data={[
                {
                  prop: "defaultOpen",
                  type: "boolean",
                  description: "The open state of the dropdown menu when it is initially rendered.",
                },
                {
                  prop: "open",
                  type: "boolean",
                  description: "The controlled open state of the dropdown menu.",
                },
                {
                  prop: "onOpenChange",
                  type: "(open: boolean) => void",
                  description: "Event handler called when the open state of the dropdown menu changes.",
                },
                {
                  prop: "modal",
                  type: "boolean",
                  default: "true",
                  description: "The modality of the dropdown menu.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">DropdownMenuTrigger</h3>
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
            <h3 className="text-lg font-medium mb-2">DropdownMenuContent</h3>
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
                  prop: "forceMount",
                  type: "boolean",
                  description: "Used to force mounting when more control is needed.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">DropdownMenuItem</h3>
            <PropsTable
              data={[
                {
                  prop: "inset",
                  type: "boolean",
                  default: "false",
                  description: "Whether the item should be inset from the left.",
                },
                {
                  prop: "variant",
                  type: "'default' | 'destructive'",
                  default: "'default'",
                  description: "The visual variant of the menu item.",
                },
                {
                  prop: "disabled",
                  type: "boolean",
                  default: "false",
                  description: "When true, prevents the user from interacting with the item.",
                },
                {
                  prop: "onSelect",
                  type: "(event: Event) => void",
                  description: "Event handler called when the user selects an item.",
                },
                {
                  prop: "textValue",
                  type: "string",
                  description: "Optional text used for typeahead purposes.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">DropdownMenuCheckboxItem</h3>
            <PropsTable
              data={[
                {
                  prop: "checked",
                  type: "boolean | 'indeterminate'",
                  description: "The controlled checked state of the item.",
                },
                {
                  prop: "onCheckedChange",
                  type: "(checked: boolean) => void",
                  description: "Event handler called when the checked state changes.",
                },
                {
                  prop: "disabled",
                  type: "boolean",
                  default: "false",
                  description: "When true, prevents the user from interacting with the item.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">DropdownMenuRadioItem</h3>
            <PropsTable
              data={[
                {
                  prop: "value",
                  type: "string",
                  description: "The unique value of the item.",
                },
                {
                  prop: "disabled",
                  type: "boolean",
                  default: "false",
                  description: "When true, prevents the user from interacting with the item.",
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
            The Dropdown Menu component follows WAI-ARIA menu pattern and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Full keyboard navigation with arrow keys, Home, End</li>
            <li>Type-ahead support for quick navigation</li>
            <li>Support for disabled items and separators</li>
            <li>Automatic focus management and restoration</li>
            <li>Screen reader announcements for all states</li>
            <li>Proper ARIA attributes and roles</li>
            <li>Dismissible with Escape key or outside interaction</li>
          </ul>
        </div>
      </section>
    </div>
  )
}