import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  XCircle, 
  Terminal,
  Lightbulb,
  Shield,
  Zap
} from "lucide-react"

export default function AlertPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Alert</h1>
        <p className="text-lg text-muted-foreground">
          Display an alert message to communicate important information to users.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Default</h3>
            <ComponentDemo>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>
                  This is a basic alert with an icon, title, and description.
                </AlertDescription>
              </Alert>
            </ComponentDemo>
            <CodeBlock code={`<Alert>
  <Info className="h-4 w-4" />
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>
    This is a basic alert with an icon, title, and description.
  </AlertDescription>
</Alert>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Variants</h3>
            <ComponentDemo>
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>
                    Your changes have been saved successfully.
                  </AlertDescription>
                </Alert>
                
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    There was an error processing your request. Please try again.
                  </AlertDescription>
                </Alert>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<Alert>
  <CheckCircle2 className="h-4 w-4" />
  <AlertTitle>Success</AlertTitle>
  <AlertDescription>
    Your changes have been saved successfully.
  </AlertDescription>
</Alert>

<Alert variant="destructive">
  <XCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    There was an error processing your request. Please try again.
  </AlertDescription>
</Alert>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Without Title</h3>
            <ComponentDemo>
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    This alert only has a description without a title.
                  </AlertDescription>
                </Alert>
                
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your session has expired. Please log in again to continue.
                  </AlertDescription>
                </Alert>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<Alert>
  <Info className="h-4 w-4" />
  <AlertDescription>
    This alert only has a description without a title.
  </AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertDescription>
    Your session has expired. Please log in again to continue.
  </AlertDescription>
</Alert>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Without Icon</h3>
            <ComponentDemo>
              <div className="space-y-4">
                <Alert>
                  <AlertTitle>System Update</AlertTitle>
                  <AlertDescription>
                    The system will be temporarily unavailable for maintenance on Sunday at 2 AM EST.
                  </AlertDescription>
                </Alert>
                
                <Alert variant="destructive">
                  <AlertDescription>
                    Failed to load user preferences. Using default settings.
                  </AlertDescription>
                </Alert>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<Alert>
  <AlertTitle>System Update</AlertTitle>
  <AlertDescription>
    The system will be temporarily unavailable for maintenance on Sunday at 2 AM EST.
  </AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertDescription>
    Failed to load user preferences. Using default settings.
  </AlertDescription>
</Alert>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Different Use Cases</h3>
            <ComponentDemo>
              <div className="space-y-4">
                <Alert>
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Command Executed</AlertTitle>
                  <AlertDescription>
                    <code className="bg-muted px-1 py-0.5 rounded text-sm">
                      npm install @shadcn/ui
                    </code>{" "}
                    completed successfully.
                  </AlertDescription>
                </Alert>

                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertTitle>Pro Tip</AlertTitle>
                  <AlertDescription>
                    You can use keyboard shortcuts to navigate faster. Press <kbd className="bg-muted px-2 py-1 rounded text-xs">Ctrl+K</kbd> to open the command palette.
                  </AlertDescription>
                </Alert>

                <Alert variant="destructive">
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Security Alert</AlertTitle>
                  <AlertDescription>
                    Multiple failed login attempts detected. Your account has been temporarily locked for security reasons.
                  </AlertDescription>
                </Alert>

                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertTitle>Feature Update</AlertTitle>
                  <AlertDescription>
                    New dashboard analytics are now available! Check out the improved charts and metrics in your dashboard.
                  </AlertDescription>
                </Alert>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<Alert>
  <Terminal className="h-4 w-4" />
  <AlertTitle>Command Executed</AlertTitle>
  <AlertDescription>
    <code>npm install @shadcn/ui</code> completed successfully.
  </AlertDescription>
</Alert>

<Alert>
  <Lightbulb className="h-4 w-4" />
  <AlertTitle>Pro Tip</AlertTitle>
  <AlertDescription>
    You can use keyboard shortcuts to navigate faster. 
    Press <kbd>Ctrl+K</kbd> to open the command palette.
  </AlertDescription>
</Alert>

<Alert variant="destructive">
  <Shield className="h-4 w-4" />
  <AlertTitle>Security Alert</AlertTitle>
  <AlertDescription>
    Multiple failed login attempts detected. Your account has been 
    temporarily locked for security reasons.
  </AlertDescription>
</Alert>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Complex Content</h3>
            <ComponentDemo>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>System Maintenance</AlertTitle>
                <AlertDescription>
                  <div className="space-y-2">
                    <p>
                      We'll be performing scheduled maintenance on our servers. During this time, you may experience:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Temporary service interruptions</li>
                      <li>Slower response times</li>
                      <li>Limited access to some features</li>
                    </ul>
                    <p className="text-sm">
                      <strong>Expected duration:</strong> 2 hours (2:00 AM - 4:00 AM EST)
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            </ComponentDemo>
            <CodeBlock code={`<Alert>
  <Info className="h-4 w-4" />
  <AlertTitle>System Maintenance</AlertTitle>
  <AlertDescription>
    <div className="space-y-2">
      <p>
        We'll be performing scheduled maintenance on our servers. 
        During this time, you may experience:
      </p>
      <ul className="list-disc list-inside space-y-1 ml-4">
        <li>Temporary service interruptions</li>
        <li>Slower response times</li>
        <li>Limited access to some features</li>
      </ul>
      <p className="text-sm">
        <strong>Expected duration:</strong> 2 hours (2:00 AM - 4:00 AM EST)
      </p>
    </div>
  </AlertDescription>
</Alert>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add alert"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function Example() {
  return (
    <Alert>
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components to your app using the cli.
      </AlertDescription>
    </Alert>
  )
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Alert</h3>
            <PropsTable
              data={[
                {
                  prop: "variant",
                  type: "'default' | 'destructive'",
                  default: "'default'",
                  description: "The visual style variant of the alert.",
                },
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the alert container.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The content of the alert, typically icon, AlertTitle, and AlertDescription.",
                },
                {
                  prop: "role",
                  type: "string",
                  default: "'alert'",
                  description: "The ARIA role for the alert. Automatically set to 'alert'.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">AlertTitle</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the alert title.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The title content of the alert.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">AlertDescription</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the alert description.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The description content of the alert.",
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
            The Alert component follows WAI-ARIA guidelines and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Automatic ARIA role="alert" for screen reader announcements</li>
            <li>Proper semantic structure with clear hierarchy</li>
            <li>High contrast colors for better visibility</li>
            <li>Support for screen readers to announce alert content</li>
            <li>Keyboard accessible when containing interactive elements</li>
            <li>Color is not the only means of conveying information (icons are included)</li>
            <li>Sufficient color contrast ratios for text readability</li>
          </ul>
        </div>
      </section>
    </div>
  )
}