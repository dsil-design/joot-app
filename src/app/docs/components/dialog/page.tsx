"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { Settings, Trash2, AlertTriangle } from "lucide-react"

export default function DialogPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Dialog</h1>
        <p className="text-lg text-muted-foreground">
          A window overlaid on either the primary window or another dialog window, rendering the content underneath inert.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Basic Dialog</h3>
            <ComponentDemo>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dialog Title</DialogTitle>
                    <DialogDescription>
                      This is a basic dialog example. You can put any content here.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="text-sm text-muted-foreground">
                      This is the main content area of the dialog.
                    </p>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button>Save changes</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </ComponentDemo>
            <CodeBlock code={`<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        This is a basic dialog example. You can put any content here.
      </DialogDescription>
    </DialogHeader>
    <div className="py-4">
      <p className="text-sm text-muted-foreground">
        This is the main content area of the dialog.
      </p>
    </div>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button>Save changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Form Dialog</h3>
            <ComponentDemo>
              <FormDialogExample />
            </ComponentDemo>
            <CodeBlock code={`function FormDialogExample() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert('Form submitted: ' + JSON.stringify(formData, null, 2))
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Edit Profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Confirmation Dialog</h3>
            <ComponentDemo>
              <ConfirmationDialogExample />
            </ComponentDemo>
            <CodeBlock code={`function ConfirmationDialogExample() {
  const [open, setOpen] = useState(false)

  const handleDelete = () => {
    alert('Item deleted!')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="h-4 w-4" />
          Delete Item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Confirm Deletion
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this item? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Custom Sized Dialog</h3>
            <ComponentDemo>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Small Dialog</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Small Dialog</DialogTitle>
                      <DialogDescription>
                        This is a smaller dialog window.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-sm">Compact content goes here.</p>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Large Dialog</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Large Dialog</DialogTitle>
                      <DialogDescription>
                        This is a larger dialog window with more space.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-sm">
                        This dialog has more space for content. You can put larger forms,
                        tables, or other complex content here.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </ComponentDemo>
            <CodeBlock code={`// Small Dialog
<DialogContent className="sm:max-w-sm">
  {/* content */}
</DialogContent>

// Large Dialog  
<DialogContent className="sm:max-w-4xl">
  {/* content */}
</DialogContent>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Non-closable Dialog</h3>
            <ComponentDemo>
              <NonClosableDialogExample />
            </ComponentDemo>
            <CodeBlock code={`function NonClosableDialogExample() {
  const [open, setOpen] = useState(false)
  const [processing, setProcessing] = useState(false)

  const handleProcess = async () => {
    setProcessing(true)
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 3000))
    setProcessing(false)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={processing ? undefined : setOpen}>
      <DialogTrigger asChild>
        <Button>Start Process</Button>
      </DialogTrigger>
      <DialogContent 
        showCloseButton={!processing}
        onPointerDownOutside={processing ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={processing ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <DialogTitle>Processing</DialogTitle>
          <DialogDescription>
            {processing 
              ? "Please wait while we process your request..." 
              : "Ready to start processing?"
            }
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {processing && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm">Processing...</span>
            </div>
          )}
        </div>
        <DialogFooter>
          {!processing && (
            <>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleProcess}>Start</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Settings Dialog</h3>
            <ComponentDemo>
              <SettingsDialogExample />
            </ComponentDemo>
            <CodeBlock code={`function SettingsDialogExample() {
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    language: 'en'
  })

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your application settings and preferences.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <select 
              id="language"
              value={settings.language}
              onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
              className="w-full p-2 border rounded"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications">Enable notifications</Label>
            <input
              type="checkbox"
              id="notifications"
              checked={settings.notifications}
              onChange={(e) => setSettings(prev => ({ ...prev, notifications: e.target.checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="darkMode">Dark mode</Label>
            <input
              type="checkbox"
              id="darkMode"
              checked={settings.darkMode}
              onChange={(e) => setSettings(prev => ({ ...prev, darkMode: e.target.checked }))}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Save Settings</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add dialog"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function Example() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Edit Profile</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" defaultValue="Pedro Duarte" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              Username
            </Label>
            <Input id="username" defaultValue="@peduarte" className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Dialog</h3>
            <PropsTable
              data={[
                {
                  prop: "open",
                  type: "boolean",
                  description: "The controlled open state of the dialog.",
                },
                {
                  prop: "defaultOpen",
                  type: "boolean",
                  default: "false",
                  description: "The open state of the dialog when it is initially rendered.",
                },
                {
                  prop: "onOpenChange",
                  type: "(open: boolean) => void",
                  description: "Event handler called when the open state changes.",
                },
                {
                  prop: "modal",
                  type: "boolean",
                  default: "true",
                  description: "Whether the dialog should be modal.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">DialogContent</h3>
            <PropsTable
              data={[
                {
                  prop: "showCloseButton",
                  type: "boolean",
                  default: "true",
                  description: "Whether to show the close button in the top-right corner.",
                },
                {
                  prop: "onPointerDownOutside",
                  type: "(event: PointerDownOutsideEvent) => void",
                  description: "Event handler called when a pointer event occurs outside the dialog.",
                },
                {
                  prop: "onEscapeKeyDown",
                  type: "(event: KeyboardEvent) => void",
                  description: "Event handler called when the escape key is down.",
                },
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the dialog content.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">DialogTrigger</h3>
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
            The Dialog component follows WAI-ARIA dialog pattern and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Focus management with focus trap when open</li>
            <li>Keyboard navigation support (Escape key to close)</li>
            <li>Screen reader announcements for dialog state</li>
            <li>Proper ARIA labeling with DialogTitle and DialogDescription</li>
            <li>Background interaction prevention when modal</li>
            <li>Automatic focus return to trigger element when closed</li>
            <li>Support for controlled and uncontrolled usage</li>
          </ul>
        </div>
      </section>
    </div>
  )
}

function FormDialogExample() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert('Form submitted: ' + JSON.stringify(formData, null, 2))
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Edit Profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmationDialogExample() {
  const [open, setOpen] = useState(false)

  const handleDelete = () => {
    alert('Item deleted!')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="h-4 w-4" />
          Delete Item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Confirm Deletion
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this item? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NonClosableDialogExample() {
  const [open, setOpen] = useState(false)
  const [processing, setProcessing] = useState(false)

  const handleProcess = async () => {
    setProcessing(true)
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 3000))
    setProcessing(false)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={processing ? undefined : setOpen}>
      <DialogTrigger asChild>
        <Button>Start Process</Button>
      </DialogTrigger>
      <DialogContent 
        showCloseButton={!processing}
        onPointerDownOutside={processing ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={processing ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <DialogTitle>Processing</DialogTitle>
          <DialogDescription>
            {processing 
              ? "Please wait while we process your request..." 
              : "Ready to start processing?"
            }
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {processing && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm">Processing...</span>
            </div>
          )}
        </div>
        <DialogFooter>
          {!processing && (
            <>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleProcess}>Start</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SettingsDialogExample() {
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    language: 'en'
  })

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your application settings and preferences.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <select 
              id="language"
              value={settings.language}
              onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
              className="w-full p-2 border rounded"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications">Enable notifications</Label>
            <input
              type="checkbox"
              id="notifications"
              checked={settings.notifications}
              onChange={(e) => setSettings(prev => ({ ...prev, notifications: e.target.checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="darkMode">Dark mode</Label>
            <input
              type="checkbox"
              id="darkMode"
              checked={settings.darkMode}
              onChange={(e) => setSettings(prev => ({ ...prev, darkMode: e.target.checked }))}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Save Settings</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}