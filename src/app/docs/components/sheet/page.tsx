import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Settings, 
  Menu, 
  User, 
  Bell, 
  Moon, 
  Sun, 
  HelpCircle,
  LogOut
} from "lucide-react"

export default function SheetPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Sheet</h1>
        <p className="text-lg text-muted-foreground">
          Extend the Dialog component to display content that complements the main content of the screen.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Basic Sheet</h3>
            <ComponentDemo>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">Open Sheet</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Edit profile</SheetTitle>
                    <SheetDescription>
                      Make changes to your profile here. Click save when you're done.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input id="name" value="Pedro Duarte" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="username" className="text-right">
                        Username
                      </Label>
                      <Input id="username" value="@peduarte" className="col-span-3" />
                    </div>
                  </div>
                  <SheetFooter>
                    <SheetClose asChild>
                      <Button type="submit">Save changes</Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </ComponentDemo>
            <CodeBlock code={`<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">Open Sheet</Button>
  </SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Edit profile</SheetTitle>
      <SheetDescription>
        Make changes to your profile here. Click save when you're done.
      </SheetDescription>
    </SheetHeader>
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right">
          Name
        </Label>
        <Input id="name" value="Pedro Duarte" className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="username" className="text-right">
          Username
        </Label>
        <Input id="username" value="@peduarte" className="col-span-3" />
      </div>
    </div>
    <SheetFooter>
      <SheetClose asChild>
        <Button type="submit">Save changes</Button>
      </SheetClose>
    </SheetFooter>
  </SheetContent>
</Sheet>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Different Sides</h3>
            <ComponentDemo>
              <div className="grid grid-cols-2 gap-4">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline">Left</Button>
                  </SheetTrigger>
                  <SheetContent side="left">
                    <SheetHeader>
                      <SheetTitle>Left Sheet</SheetTitle>
                      <SheetDescription>
                        This sheet opens from the left side.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="py-4">
                      <p className="text-sm text-muted-foreground">
                        Content goes here...
                      </p>
                    </div>
                  </SheetContent>
                </Sheet>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline">Right</Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <SheetHeader>
                      <SheetTitle>Right Sheet</SheetTitle>
                      <SheetDescription>
                        This sheet opens from the right side (default).
                      </SheetDescription>
                    </SheetHeader>
                    <div className="py-4">
                      <p className="text-sm text-muted-foreground">
                        Content goes here...
                      </p>
                    </div>
                  </SheetContent>
                </Sheet>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline">Top</Button>
                  </SheetTrigger>
                  <SheetContent side="top">
                    <SheetHeader>
                      <SheetTitle>Top Sheet</SheetTitle>
                      <SheetDescription>
                        This sheet opens from the top.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="py-4">
                      <p className="text-sm text-muted-foreground">
                        Content goes here...
                      </p>
                    </div>
                  </SheetContent>
                </Sheet>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline">Bottom</Button>
                  </SheetTrigger>
                  <SheetContent side="bottom">
                    <SheetHeader>
                      <SheetTitle>Bottom Sheet</SheetTitle>
                      <SheetDescription>
                        This sheet opens from the bottom.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="py-4">
                      <p className="text-sm text-muted-foreground">
                        Content goes here...
                      </p>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="grid grid-cols-2 gap-4">
  {/* Left Side */}
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="outline">Left</Button>
    </SheetTrigger>
    <SheetContent side="left">
      <SheetHeader>
        <SheetTitle>Left Sheet</SheetTitle>
        <SheetDescription>
          This sheet opens from the left side.
        </SheetDescription>
      </SheetHeader>
      <div className="py-4">
        <p className="text-sm text-muted-foreground">
          Content goes here...
        </p>
      </div>
    </SheetContent>
  </Sheet>

  {/* Other sides: "right", "top", "bottom" */}
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Navigation Sheet</h3>
            <ComponentDemo>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle>Navigation</SheetTitle>
                    <SheetDescription>
                      Navigate to different sections of the application.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-4">
                    <nav className="flex flex-col space-y-1">
                      <a href="#" className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-accent">
                        <User className="h-4 w-4" />
                        <span>Profile</span>
                      </a>
                      <a href="#" className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-accent">
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </a>
                      <a href="#" className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-accent">
                        <Bell className="h-4 w-4" />
                        <span>Notifications</span>
                        <Badge className="ml-auto">3</Badge>
                      </a>
                      <Separator className="my-2" />
                      <a href="#" className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-accent">
                        <HelpCircle className="h-4 w-4" />
                        <span>Help & Support</span>
                      </a>
                      <a href="#" className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-accent text-destructive">
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </a>
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </ComponentDemo>
            <CodeBlock code={`<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline" size="icon">
      <Menu className="h-4 w-4" />
    </Button>
  </SheetTrigger>
  <SheetContent side="left" className="w-[300px] sm:w-[400px]">
    <SheetHeader>
      <SheetTitle>Navigation</SheetTitle>
      <SheetDescription>
        Navigate to different sections of the application.
      </SheetDescription>
    </SheetHeader>
    <div className="py-4">
      <nav className="flex flex-col space-y-1">
        <a href="#" className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-accent">
          <User className="h-4 w-4" />
          <span>Profile</span>
        </a>
        <a href="#" className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-accent">
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </a>
        <a href="#" className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-accent">
          <Bell className="h-4 w-4" />
          <span>Notifications</span>
          <Badge className="ml-auto">3</Badge>
        </a>
        <Separator className="my-2" />
        <a href="#" className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-accent">
          <HelpCircle className="h-4 w-4" />
          <span>Help & Support</span>
        </a>
        <a href="#" className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-accent text-destructive">
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </a>
      </nav>
    </div>
  </SheetContent>
</Sheet>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Settings Sheet</h3>
            <ComponentDemo>
              <Sheet>
                <SheetTrigger asChild>
                  <Button>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px]">
                  <SheetHeader>
                    <SheetTitle>Settings</SheetTitle>
                    <SheetDescription>
                      Manage your account settings and set e-mail preferences.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-medium">Profile</Label>
                        <div className="grid gap-3 pt-2">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="display-name" className="text-right">
                              Display name
                            </Label>
                            <Input
                              id="display-name"
                              defaultValue="Pedro Duarte"
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">
                              Email
                            </Label>
                            <Input
                              id="email"
                              defaultValue="pedro@duarte.dev"
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="bio" className="text-right">
                              Bio
                            </Label>
                            <Textarea
                              id="bio"
                              placeholder="Tell us a little bit about yourself"
                              className="col-span-3 resize-none"
                            />
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-base font-medium">Preferences</Label>
                        <div className="grid gap-3 pt-2">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="theme" className="text-right">
                              Theme
                            </Label>
                            <Select>
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select a theme" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="light">
                                  <div className="flex items-center">
                                    <Sun className="mr-2 h-4 w-4" />
                                    Light
                                  </div>
                                </SelectItem>
                                <SelectItem value="dark">
                                  <div className="flex items-center">
                                    <Moon className="mr-2 h-4 w-4" />
                                    Dark
                                  </div>
                                </SelectItem>
                                <SelectItem value="system">
                                  <div className="flex items-center">
                                    <Settings className="mr-2 h-4 w-4" />
                                    System
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="language" className="text-right">
                              Language
                            </Label>
                            <Select>
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select a language" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="es">Spanish</SelectItem>
                                <SelectItem value="fr">French</SelectItem>
                                <SelectItem value="de">German</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <SheetFooter>
                    <SheetClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button type="submit">Save changes</Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </ComponentDemo>
            <CodeBlock code={`<Sheet>
  <SheetTrigger asChild>
    <Button>
      <Settings className="mr-2 h-4 w-4" />
      Settings
    </Button>
  </SheetTrigger>
  <SheetContent className="w-[400px] sm:w-[540px]">
    <SheetHeader>
      <SheetTitle>Settings</SheetTitle>
      <SheetDescription>
        Manage your account settings and set e-mail preferences.
      </SheetDescription>
    </SheetHeader>
    <div className="grid gap-4 py-4">
      <div className="space-y-4">
        <div>
          <Label className="text-base font-medium">Profile</Label>
          <div className="grid gap-3 pt-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="display-name" className="text-right">
                Display name
              </Label>
              <Input
                id="display-name"
                defaultValue="Pedro Duarte"
                className="col-span-3"
              />
            </div>
            {/* More profile fields... */}
          </div>
        </div>
        <Separator />
        <div>
          <Label className="text-base font-medium">Preferences</Label>
          <div className="grid gap-3 pt-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="theme" className="text-right">
                Theme
              </Label>
              <Select>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* More preference fields... */}
          </div>
        </div>
      </div>
    </div>
    <SheetFooter>
      <SheetClose asChild>
        <Button variant="outline">Cancel</Button>
      </SheetClose>
      <SheetClose asChild>
        <Button type="submit">Save changes</Button>
      </SheetClose>
    </SheetFooter>
  </SheetContent>
</Sheet>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Contact Form Sheet</h3>
            <ComponentDemo>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">Contact Us</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Contact Us</SheetTitle>
                    <SheetDescription>
                      Send us a message and we'll get back to you as soon as possible.
                    </SheetDescription>
                  </SheetHeader>
                  <form className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="contact-name">Name</Label>
                      <Input id="contact-name" placeholder="Your name" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="contact-email">Email</Label>
                      <Input id="contact-email" type="email" placeholder="Your email" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="contact-subject">Subject</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Inquiry</SelectItem>
                          <SelectItem value="support">Technical Support</SelectItem>
                          <SelectItem value="billing">Billing Question</SelectItem>
                          <SelectItem value="feature">Feature Request</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="contact-message">Message</Label>
                      <Textarea
                        id="contact-message"
                        placeholder="Your message..."
                        className="min-h-[100px] resize-none"
                      />
                    </div>
                  </form>
                  <SheetFooter>
                    <SheetClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </SheetClose>
                    <Button type="submit">Send Message</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </ComponentDemo>
            <CodeBlock code={`<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">Contact Us</Button>
  </SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Contact Us</SheetTitle>
      <SheetDescription>
        Send us a message and we'll get back to you as soon as possible.
      </SheetDescription>
    </SheetHeader>
    <form className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="contact-name">Name</Label>
        <Input id="contact-name" placeholder="Your name" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contact-email">Email</Label>
        <Input id="contact-email" type="email" placeholder="Your email" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contact-subject">Subject</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select a subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General Inquiry</SelectItem>
            <SelectItem value="support">Technical Support</SelectItem>
            <SelectItem value="billing">Billing Question</SelectItem>
            <SelectItem value="feature">Feature Request</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          placeholder="Your message..."
          className="min-h-[100px] resize-none"
        />
      </div>
    </form>
    <SheetFooter>
      <SheetClose asChild>
        <Button variant="outline">Cancel</Button>
      </SheetClose>
      <Button type="submit">Send Message</Button>
    </SheetFooter>
  </SheetContent>
</Sheet>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add sheet"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function Example() {
  return (
    <Sheet>
      <SheetTrigger>Open</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Are you absolutely sure?</SheetTitle>
          <SheetDescription>
            This action cannot be undone. This will permanently delete your account
            and remove your data from our servers.
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  )
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Sheet</h3>
            <PropsTable
              data={[
                {
                  prop: "defaultOpen",
                  type: "boolean",
                  description: "The open state of the sheet when it is initially rendered.",
                },
                {
                  prop: "open",
                  type: "boolean",
                  description: "The controlled open state of the sheet.",
                },
                {
                  prop: "onOpenChange",
                  type: "(open: boolean) => void",
                  description: "Event handler called when the open state of the sheet changes.",
                },
                {
                  prop: "modal",
                  type: "boolean",
                  default: "true",
                  description: "The modality of the sheet. When set to true, interaction with outside elements will be disabled and only sheet content will be visible to screen readers.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">SheetTrigger</h3>
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
            <h3 className="text-lg font-medium mb-2">SheetContent</h3>
            <PropsTable
              data={[
                {
                  prop: "side",
                  type: "'top' | 'right' | 'bottom' | 'left'",
                  default: "'right'",
                  description: "The side of the screen where the sheet will appear.",
                },
                {
                  prop: "onEscapeKeyDown",
                  type: "(event: KeyboardEvent) => void",
                  description: "Event handler called when the escape key is down.",
                },
                {
                  prop: "onPointerDownOutside",
                  type: "(event: PointerDownOutsideEvent) => void",
                  description: "Event handler called when a pointer event happens outside the component.",
                },
                {
                  prop: "onInteractOutside",
                  type: "(event: Event) => void",
                  description: "Event handler called when an interaction happens outside the component.",
                },
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the sheet content.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">SheetClose</h3>
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
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            The Sheet component follows WAI-ARIA dialog pattern and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Focus management and trapping within the sheet when modal</li>
            <li>Keyboard navigation support (Escape to close, Tab to cycle through focusable elements)</li>
            <li>Screen reader announcements with aria-describedby</li>
            <li>Proper heading hierarchy with SheetTitle</li>
            <li>Background overlay with appropriate opacity</li>
            <li>Automatic close button with accessible label</li>
            <li>Dismissible on outside interaction (customizable)</li>
          </ul>
        </div>
      </section>
    </div>
  )
}