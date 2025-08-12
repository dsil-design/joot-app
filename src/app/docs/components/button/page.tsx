import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Button } from "@/components/ui/button"
import { Download, Mail, Plus } from "lucide-react"

export default function ButtonPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Button</h1>
        <p className="text-lg text-muted-foreground">
          Display a button or a component that looks like a button.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Default</h3>
            <ComponentDemo>
              <Button>Button</Button>
            </ComponentDemo>
            <CodeBlock code={`<Button>Button</Button>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Variants</h3>
            <ComponentDemo>
              <div className="flex gap-4 flex-wrap">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<Button variant="default">Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
<Button variant="destructive">Destructive</Button>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Sizes</h3>
            <ComponentDemo>
              <div className="flex items-center gap-4">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">
  <Plus className="h-4 w-4" />
</Button>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Icons</h3>
            <ComponentDemo>
              <div className="flex gap-4 flex-wrap">
                <Button>
                  <Mail className="h-4 w-4" />
                  Login with Email
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<Button>
  <Mail className="h-4 w-4" />
  Login with Email
</Button>
<Button variant="outline">
  <Download className="h-4 w-4" />
  Download
</Button>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Disabled</h3>
            <ComponentDemo>
              <div className="flex gap-4">
                <Button disabled>Disabled</Button>
                <Button variant="outline" disabled>Disabled</Button>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<Button disabled>Disabled</Button>
<Button variant="outline" disabled>Disabled</Button>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add button"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import { Button } from "@/components/ui/button"

export function Example() {
  return <Button>Click me</Button>
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <PropsTable
          data={[
            {
              prop: "variant",
              type: "'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'",
              default: "'default'",
              description: "The visual style variant of the button.",
            },
            {
              prop: "size",
              type: "'default' | 'sm' | 'lg' | 'icon'",
              default: "'default'",
              description: "The size of the button.",
            },
            {
              prop: "asChild",
              type: "boolean",
              default: "false",
              description: "Change the default rendered element for the one passed as a child, merging their props and behavior.",
            },
            {
              prop: "disabled",
              type: "boolean",
              default: "false",
              description: "When true, prevents the user from interacting with the button.",
            },
            {
              prop: "className",
              type: "string",
              description: "Additional CSS class names to apply to the button.",
            },
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            The Button component follows WAI-ARIA button pattern and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Keyboard navigation support (Space and Enter keys)</li>
            <li>Focus management and visual focus indicators</li>
            <li>Screen reader announcements for disabled state</li>
            <li>Proper semantic button element or ARIA role</li>
          </ul>
        </div>
      </section>
    </div>
  )
}