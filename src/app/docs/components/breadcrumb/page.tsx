import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Home, 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronDown
} from "lucide-react"

export default function BreadcrumbDocumentation() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Breadcrumb</h1>
        <p className="text-lg text-muted-foreground">
          Displays the path to the current resource using a hierarchy of links.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Basic Breadcrumb</h3>
            <ComponentDemo>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/docs">Documentation</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </ComponentDemo>
            <CodeBlock code={`<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/docs">Documentation</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Icons</h3>
            <ComponentDemo>
              <div className="space-y-4">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/" className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Home
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/projects" className="flex items-center gap-2">
                        <Folder className="h-4 w-4" />
                        Projects
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/projects/website" className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        Website
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        index.html
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>

                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/">
                        <Home className="h-4 w-4" />
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/dashboard/analytics">Analytics</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Reports</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/" className="flex items-center gap-2">
        <Home className="h-4 w-4" />
        Home
      </BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/projects" className="flex items-center gap-2">
        <Folder className="h-4 w-4" />
        Projects
      </BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        index.html
      </BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>

{/* Icon-only home link */}
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">
        <Home className="h-4 w-4" />
      </BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Ellipsis (Collapsed)</h3>
            <ComponentDemo>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">
                      <Home className="h-4 w-4" />
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbEllipsis />
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/projects/website/src">src</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/projects/website/src/components">components</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>button.tsx</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </ComponentDemo>
            <CodeBlock code={`<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">
        <Home className="h-4 w-4" />
      </BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbEllipsis />
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/projects/website/src">src</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/projects/website/src/components">components</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>button.tsx</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Dropdown Menu</h3>
            <ComponentDemo>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">
                      <Home className="h-4 w-4" />
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center gap-1 hover:text-foreground">
                        <BreadcrumbEllipsis className="h-4 w-4" />
                        <ChevronDown className="h-3 w-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem>
                          <a href="/docs" className="flex items-center gap-2">
                            <Folder className="h-4 w-4" />
                            Documentation
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <a href="/projects" className="flex items-center gap-2">
                            <Folder className="h-4 w-4" />
                            Projects
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <a href="/components" className="flex items-center gap-2">
                            <Folder className="h-4 w-4" />
                            Components
                          </a>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/components/ui">UI</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </ComponentDemo>
            <CodeBlock code={`<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">
        <Home className="h-4 w-4" />
      </BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1">
          <BreadcrumbEllipsis className="h-4 w-4" />
          <ChevronDown className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem>
            <a href="/docs">Documentation</a>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <a href="/projects">Projects</a>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <a href="/components">Components</a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/components/ui">UI</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Different Use Cases</h3>
            <ComponentDemo>
              <div className="space-y-6">
                {/* E-commerce */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">E-commerce Product Path</p>
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/shop">Shop</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/shop/electronics">Electronics</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/shop/electronics/laptops">Laptops</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/shop/electronics/laptops/gaming">Gaming</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>MacBook Pro 16"</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>

                {/* File System */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">File System Navigation</p>
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/files" className="flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          Files
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/files/documents">Documents</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/files/documents/projects">Projects</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/files/documents/projects/2024">2024</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          annual-report.pdf
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>

                {/* Blog/Content */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Blog Article Path</p>
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/blog">Blog</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/blog/2024">2024</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/blog/2024/technology">Technology</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>Getting Started with React 19</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>

                {/* Admin Panel */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Admin Panel Navigation</p>
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/admin/users">Users</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/admin/users/manage">Manage</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/admin/users/manage/permissions">Permissions</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>Role Settings</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </div>
            </ComponentDemo>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add breadcrumb"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export function Example() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/components">Components</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Breadcrumb</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the breadcrumb container.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The breadcrumb content, typically BreadcrumbList.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">BreadcrumbList</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the breadcrumb list.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The breadcrumb items and separators.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">BreadcrumbItem</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the breadcrumb item.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The breadcrumb item content, typically BreadcrumbLink or BreadcrumbPage.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">BreadcrumbLink</h3>
            <PropsTable
              data={[
                {
                  prop: "href",
                  type: "string",
                  description: "The URL that the breadcrumb link points to.",
                },
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the breadcrumb link.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The content of the breadcrumb link.",
                },
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
            <h3 className="text-lg font-medium mb-3">BreadcrumbPage</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the current page indicator.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The content representing the current page.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">BreadcrumbSeparator</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the separator.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "Custom separator content. Defaults to chevron right icon.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">BreadcrumbEllipsis</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the ellipsis.",
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
              <li>Use breadcrumbs for hierarchical navigation</li>
              <li>Keep breadcrumb labels concise and clear</li>
              <li>Show the user's current location accurately</li>
              <li>Use ellipsis to collapse long paths on mobile</li>
              <li>Make all parent items clickable links</li>
              <li>Consider using icons for common sections</li>
              <li>Test breadcrumbs on different screen sizes</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-red-600">Don't</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use breadcrumbs for flat site structures</li>
              <li>Make breadcrumbs the only navigation method</li>
              <li>Use overly long or technical labels</li>
              <li>Include the current page as a clickable link</li>
              <li>Show every level in very deep hierarchies</li>
              <li>Use breadcrumbs for primary navigation</li>
              <li>Forget to handle responsive behavior</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            The Breadcrumb component follows WAI-ARIA guidelines and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Semantic HTML structure with <code className="bg-muted px-1 rounded text-sm">nav</code> and <code className="bg-muted px-1 rounded text-sm">ol</code> elements</li>
            <li>Proper ARIA labels for screen reader navigation</li>
            <li>Keyboard accessible breadcrumb links</li>
            <li>Clear visual distinction between links and current page</li>
            <li>Sufficient color contrast for all text elements</li>
            <li>Screen reader support for navigation context</li>
            <li>Focus indicators for keyboard navigation</li>
            <li>Proper heading hierarchy when used with page titles</li>
          </ul>
        </div>
      </section>
    </div>
  )
}