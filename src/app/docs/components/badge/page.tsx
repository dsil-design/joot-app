import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Badge } from "@/components/ui/badge"
import { 
  Star, 
  Crown, 
  Zap, 
  Shield, 
  Check, 
  X, 
  AlertTriangle,
  Clock,
  Dot
} from "lucide-react"

export default function BadgePage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Badge</h1>
        <p className="text-lg text-muted-foreground">
          Display a badge to highlight information, indicate status, or show counts.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Default</h3>
            <ComponentDemo>
              <Badge>Badge</Badge>
            </ComponentDemo>
            <CodeBlock code={`<Badge>Badge</Badge>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Variants</h3>
            <ComponentDemo>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Icons</h3>
            <ComponentDemo>
              <div className="flex gap-2 flex-wrap">
                <Badge>
                  <Star className="h-3 w-3" />
                  Featured
                </Badge>
                <Badge variant="secondary">
                  <Crown className="h-3 w-3" />
                  Premium
                </Badge>
                <Badge variant="destructive">
                  <X className="h-3 w-3" />
                  Error
                </Badge>
                <Badge variant="outline">
                  <Check className="h-3 w-3" />
                  Verified
                </Badge>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<Badge>
  <Star className="h-3 w-3" />
  Featured
</Badge>

<Badge variant="secondary">
  <Crown className="h-3 w-3" />
  Premium
</Badge>

<Badge variant="destructive">
  <X className="h-3 w-3" />
  Error
</Badge>

<Badge variant="outline">
  <Check className="h-3 w-3" />
  Verified
</Badge>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Status Indicators</h3>
            <ComponentDemo>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">
                  <Dot className="h-3 w-3 text-green-500" />
                  Active
                </Badge>
                <Badge variant="outline">
                  <Dot className="h-3 w-3 text-yellow-500" />
                  Pending
                </Badge>
                <Badge variant="outline">
                  <Dot className="h-3 w-3 text-red-500" />
                  Inactive
                </Badge>
                <Badge variant="outline">
                  <Dot className="h-3 w-3 text-blue-500" />
                  Processing
                </Badge>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<Badge variant="outline">
  <Dot className="h-3 w-3 text-green-500" />
  Active
</Badge>

<Badge variant="outline">
  <Dot className="h-3 w-3 text-yellow-500" />
  Pending
</Badge>

<Badge variant="outline">
  <Dot className="h-3 w-3 text-red-500" />
  Inactive
</Badge>

<Badge variant="outline">
  <Dot className="h-3 w-3 text-blue-500" />
  Processing
</Badge>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Notification Badges</h3>
            <ComponentDemo>
              <div className="flex gap-4 flex-wrap items-center">
                <div className="relative">
                  <button className="p-2 bg-background border rounded-md">
                    <span className="text-sm">Messages</span>
                  </button>
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">3</Badge>
                </div>
                
                <div className="relative">
                  <button className="p-2 bg-background border rounded-md">
                    <span className="text-sm">Notifications</span>
                  </button>
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">12</Badge>
                </div>

                <div className="relative">
                  <button className="p-2 bg-background border rounded-md">
                    <span className="text-sm">Updates</span>
                  </button>
                  <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">99+</Badge>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="relative">
  <button className="p-2 bg-background border rounded-md">
    Messages
  </button>
  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">
    3
  </Badge>
</div>

<div className="relative">
  <button className="p-2 bg-background border rounded-md">
    Notifications
  </button>
  <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">
    12
  </Badge>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Content Categories</h3>
            <ComponentDemo>
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">Technology</Badge>
                  <Badge variant="secondary">Design</Badge>
                  <Badge variant="secondary">Development</Badge>
                  <Badge variant="secondary">Marketing</Badge>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">React</Badge>
                  <Badge variant="outline">TypeScript</Badge>
                  <Badge variant="outline">Next.js</Badge>
                  <Badge variant="outline">Tailwind</Badge>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`{/* Category tags */}
<Badge variant="secondary">Technology</Badge>
<Badge variant="secondary">Design</Badge>
<Badge variant="secondary">Development</Badge>

{/* Tech stack tags */}
<Badge variant="outline">React</Badge>
<Badge variant="outline">TypeScript</Badge>
<Badge variant="outline">Next.js</Badge>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Interactive Badges</h3>
            <ComponentDemo>
              <div className="flex gap-2 flex-wrap">
                <Badge asChild>
                  <a href="#" className="cursor-pointer">
                    <Zap className="h-3 w-3" />
                    Trending
                  </a>
                </Badge>
                
                <Badge variant="secondary" asChild>
                  <button className="cursor-pointer">
                    <Shield className="h-3 w-3" />
                    Security
                  </button>
                </Badge>
                
                <Badge variant="outline" asChild>
                  <a href="#" className="cursor-pointer">
                    View Details
                  </a>
                </Badge>
              </div>
            </ComponentDemo>
            <CodeBlock code={`{/* As link */}
<Badge asChild>
  <a href="#" className="cursor-pointer">
    <Zap className="h-3 w-3" />
    Trending
  </a>
</Badge>

{/* As button */}
<Badge variant="secondary" asChild>
  <button className="cursor-pointer">
    <Shield className="h-3 w-3" />
    Security
  </button>
</Badge>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Complex Usage</h3>
            <ComponentDemo>
              <div className="space-y-4 w-full max-w-md">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Premium Account</h4>
                    <p className="text-sm text-muted-foreground">Full access to all features</p>
                  </div>
                  <Badge>
                    <Crown className="h-3 w-3" />
                    Active
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Security Alert</h4>
                    <p className="text-sm text-muted-foreground">Action required</p>
                  </div>
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3" />
                    Urgent
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">System Update</h4>
                    <p className="text-sm text-muted-foreground">Scheduled maintenance</p>
                  </div>
                  <Badge variant="outline">
                    <Clock className="h-3 w-3" />
                    Pending
                  </Badge>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="flex items-center justify-between p-4 border rounded-lg">
  <div>
    <h4 className="font-medium">Premium Account</h4>
    <p className="text-sm text-muted-foreground">Full access to all features</p>
  </div>
  <Badge>
    <Crown className="h-3 w-3" />
    Active
  </Badge>
</div>

<div className="flex items-center justify-between p-4 border rounded-lg">
  <div>
    <h4 className="font-medium">Security Alert</h4>
    <p className="text-sm text-muted-foreground">Action required</p>
  </div>
  <Badge variant="destructive">
    <AlertTriangle className="h-3 w-3" />
    Urgent
  </Badge>
</div>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add badge"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import { Badge } from "@/components/ui/badge"

export function Example() {
  return <Badge>Badge</Badge>
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <PropsTable
          data={[
            {
              prop: "variant",
              type: "'default' | 'secondary' | 'destructive' | 'outline'",
              default: "'default'",
              description: "The visual style variant of the badge.",
            },
            {
              prop: "asChild",
              type: "boolean",
              default: "false",
              description: "Change the default rendered element for the one passed as a child, merging their props and behavior.",
            },
            {
              prop: "className",
              type: "string",
              description: "Additional CSS class names to apply to the badge.",
            },
            {
              prop: "children",
              type: "React.ReactNode",
              description: "The content of the badge.",
            },
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Design Guidelines</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-green-600">Do</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use badges to highlight important information</li>
              <li>Keep badge text short and scannable</li>
              <li>Use appropriate variants for different contexts</li>
              <li>Position notification badges consistently</li>
              <li>Use icons that enhance understanding</li>
              <li>Group related badges together</li>
              <li>Make interactive badges clearly clickable</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-red-600">Don't</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Overuse badges - they lose impact</li>
              <li>Use long text in badges</li>
              <li>Mix too many badge variants in one area</li>
              <li>Use badges for primary actions</li>
              <li>Make badges too small to read comfortably</li>
              <li>Use unclear or decorative icons</li>
              <li>Use badges as the only way to convey critical information</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            The Badge component follows accessibility best practices:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Uses semantic HTML with appropriate ARIA attributes when interactive</li>
            <li>Maintains sufficient color contrast ratios</li>
            <li>Supports keyboard navigation when used as interactive elements</li>
            <li>Screen reader accessible text content</li>
            <li>Focus indicators for interactive badges</li>
            <li>Color is not the only means of conveying information (text/icons included)</li>
            <li>Proper semantics when used as links or buttons via asChild prop</li>
          </ul>
        </div>
      </section>
    </div>
  )
}