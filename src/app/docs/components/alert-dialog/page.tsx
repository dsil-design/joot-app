"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { 
  Trash2, 
  AlertTriangle, 
  LogOut, 
  UserX, 
  Download,
  RefreshCw,
  Shield,
  Clock
} from "lucide-react"

export default function AlertDialogPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Alert Dialog</h1>
        <p className="text-lg text-muted-foreground">
          A modal dialog that interrupts the user with important content and expects a response.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Basic Alert Dialog</h3>
            <ComponentDemo>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button>Show Alert</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account
                      and remove your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </ComponentDemo>
            <CodeBlock code={`<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button>Show Alert</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete your account
        and remove your data from our servers.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Continue</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Delete Confirmation</h3>
            <ComponentDemo>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Item
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 text-red-600 rounded-lg dark:bg-red-900 dark:text-red-300">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <AlertDialogTitle>Delete Item</AlertDialogTitle>
                      </div>
                    </div>
                    <AlertDialogDescription>
                      Are you sure you want to delete this item? This action cannot be undone and will permanently remove the item from your account.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </ComponentDemo>
            <CodeBlock code={`<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">
      <Trash2 className="h-4 w-4 mr-2" />
      Delete Item
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-100 text-red-600 rounded-lg">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <AlertDialogTitle>Delete Item</AlertDialogTitle>
        </div>
      </div>
      <AlertDialogDescription>
        Are you sure you want to delete this item? This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction variant="destructive">
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Logout Confirmation</h3>
            <ComponentDemo>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900 dark:text-blue-300">
                        <LogOut className="h-5 w-5" />
                      </div>
                      <div>
                        <AlertDialogTitle>Sign Out</AlertDialogTitle>
                      </div>
                    </div>
                    <AlertDialogDescription>
                      Are you sure you want to sign out? You'll need to sign in again to access your account.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Stay Signed In</AlertDialogCancel>
                    <AlertDialogAction>Sign Out</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </ComponentDemo>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">System Action Confirmation</h3>
            <ComponentDemo>
              <div className="flex gap-3">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset System
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg dark:bg-yellow-900 dark:text-yellow-300">
                          <RefreshCw className="h-5 w-5" />
                        </div>
                        <div>
                          <AlertDialogTitle>Reset System</AlertDialogTitle>
                        </div>
                      </div>
                      <AlertDialogDescription className="space-y-2">
                        <p>This will reset all system settings to their default values.</p>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          <li>All customizations will be lost</li>
                          <li>User preferences will be reset</li>
                          <li>Cache will be cleared</li>
                        </ul>
                        <p>Are you sure you want to continue?</p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction variant="destructive">
                        Reset System
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      <UserX className="h-4 w-4 mr-2" />
                      Remove User
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 text-red-600 rounded-lg dark:bg-red-900 dark:text-red-300">
                          <UserX className="h-5 w-5" />
                        </div>
                        <div>
                          <AlertDialogTitle>Remove User Access</AlertDialogTitle>
                        </div>
                      </div>
                      <AlertDialogDescription>
                        This will immediately revoke this user's access to the system. They will be logged out and won't be able to sign in again until re-invited.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction variant="destructive">
                        Remove Access
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </ComponentDemo>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Download Confirmation</h3>
            <ComponentDemo>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Download Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 text-green-600 rounded-lg dark:bg-green-900 dark:text-green-300">
                        <Download className="h-5 w-5" />
                      </div>
                      <div>
                        <AlertDialogTitle>Download Your Data</AlertDialogTitle>
                      </div>
                    </div>
                    <AlertDialogDescription className="space-y-2">
                      <p>You're about to download all your account data.</p>
                      <div className="bg-muted p-3 rounded-lg text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">What to expect:</span>
                        </div>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• File size: ~25 MB</li>
                          <li>• Format: ZIP archive</li>
                          <li>• Processing time: 2-3 minutes</li>
                        </ul>
                      </div>
                      <p>The download will start immediately after confirmation.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction>
                      Start Download
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </ComponentDemo>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Security Warning</h3>
            <ComponentDemo>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <Shield className="h-4 w-4 mr-2" />
                    Change Security Settings
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 text-orange-600 rounded-lg dark:bg-orange-900 dark:text-orange-300">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <AlertDialogTitle>Security Settings Change</AlertDialogTitle>
                      </div>
                    </div>
                    <AlertDialogDescription className="space-y-3">
                      <p>You're about to modify critical security settings.</p>
                      <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg dark:bg-orange-900/20 dark:border-orange-800">
                        <div className="text-sm space-y-2">
                          <p className="font-medium text-orange-800 dark:text-orange-200">⚠️ Important:</p>
                          <ul className="space-y-1 text-orange-700 dark:text-orange-300">
                            <li>• This may affect all connected devices</li>
                            <li>• You may need to re-authenticate</li>
                            <li>• Active sessions will be terminated</li>
                          </ul>
                        </div>
                      </div>
                      <p>Do you want to proceed with these changes?</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction>
                      Proceed with Changes
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </ComponentDemo>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add alert-dialog"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function Example() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button>Show Alert</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">AlertDialog</h3>
            <PropsTable
              data={[
                {
                  prop: "defaultOpen",
                  type: "boolean",
                  description: "The open state of the dialog when it is first rendered.",
                },
                {
                  prop: "open",
                  type: "boolean",
                  description: "The controlled open state of the dialog.",
                },
                {
                  prop: "onOpenChange",
                  type: "(open: boolean) => void",
                  description: "Event handler called when the open state changes.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">AlertDialogTrigger</h3>
            <PropsTable
              data={[
                {
                  prop: "asChild",
                  type: "boolean",
                  default: "false",
                  description: "Change the default rendered element for the one passed as a child.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The element that triggers the alert dialog.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">AlertDialogContent</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the content.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The content of the alert dialog.",
                },
                {
                  prop: "onEscapeKeyDown",
                  type: "(event: KeyboardEvent) => void",
                  description: "Event handler called when the escape key is pressed.",
                },
                {
                  prop: "onPointerDownOutside",
                  type: "(event: PointerDownOutsideEvent) => void",
                  description: "Event handler called when a pointer event occurs outside the bounds.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">AlertDialogTitle</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the title.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The title content of the alert dialog.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">AlertDialogDescription</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the description.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The description content of the alert dialog.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">AlertDialogAction</h3>
            <PropsTable
              data={[
                {
                  prop: "variant",
                  type: "ButtonVariant",
                  default: "'default'",
                  description: "The visual style variant of the action button.",
                },
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the action button.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The content of the action button.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">AlertDialogCancel</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the cancel button.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The content of the cancel button.",
                },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Design Guidelines</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-green-600">Do</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use for critical actions that need confirmation</li>
              <li>Keep titles clear and action-focused</li>
              <li>Provide sufficient context in the description</li>
              <li>Use appropriate button variants (destructive for dangerous actions)</li>
              <li>Include icons to reinforce the message type</li>
              <li>Make the primary action clear and unambiguous</li>
              <li>Test with keyboard navigation and screen readers</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-red-600">Don't</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use for non-critical information or confirmations</li>
              <li>Make titles too long or unclear</li>
              <li>Use for every action - reserve for important ones</li>
              <li>Hide important details in small text</li>
              <li>Use confusing or similar button labels</li>
              <li>Allow the dialog to be dismissed accidentally</li>
              <li>Chain multiple alert dialogs together</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            The Alert Dialog component follows WAI-ARIA guidelines and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Proper ARIA attributes and roles for alert dialogs</li>
            <li>Focus trapping within the dialog when open</li>
            <li>Keyboard navigation support (Tab, Shift+Tab, Escape)</li>
            <li>Screen reader announcements for dialog state changes</li>
            <li>Focus restoration to the trigger element when closed</li>
            <li>Semantic HTML structure with proper headings</li>
            <li>High contrast support for all interactive elements</li>
            <li>Respects user's motion preferences for animations</li>
          </ul>
        </div>
      </section>
    </div>
  )
}