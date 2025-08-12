"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, Settings, User, LogOut } from "lucide-react"

export default function SeparatorPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Separator</h1>
        <p className="text-lg text-muted-foreground">
          Visually or semantically separates content.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Horizontal Separator</h3>
            <ComponentDemo>
              <div className="space-y-4 max-w-md">
                <div>
                  <h4 className="text-sm font-medium">Profile</h4>
                  <p className="text-sm text-muted-foreground">Manage your profile settings</p>
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium">Account</h4>
                  <p className="text-sm text-muted-foreground">Update your account information</p>
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium">Security</h4>
                  <p className="text-sm text-muted-foreground">Configure security settings</p>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="space-y-4">
  <div>
    <h4 className="text-sm font-medium">Profile</h4>
    <p className="text-sm text-muted-foreground">Manage your profile settings</p>
  </div>
  <Separator />
  <div>
    <h4 className="text-sm font-medium">Account</h4>
    <p className="text-sm text-muted-foreground">Update your account information</p>
  </div>
  <Separator />
  <div>
    <h4 className="text-sm font-medium">Security</h4>
    <p className="text-sm text-muted-foreground">Configure security settings</p>
  </div>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Vertical Separator</h3>
            <ComponentDemo>
              <div className="flex items-center space-x-4 max-w-md">
                <Button variant="outline" size="sm">
                  <Home className="h-4 w-4" />
                  Home
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button variant="outline" size="sm">
                  <User className="h-4 w-4" />
                  Profile
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="flex items-center space-x-4">
  <Button variant="outline" size="sm">
    <Home className="h-4 w-4" />
    Home
  </Button>
  <Separator orientation="vertical" className="h-6" />
  <Button variant="outline" size="sm">
    <User className="h-4 w-4" />
    Profile
  </Button>
  <Separator orientation="vertical" className="h-6" />
  <Button variant="outline" size="sm">
    <Settings className="h-4 w-4" />
    Settings
  </Button>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Text</h3>
            <ComponentDemo>
              <SeparatorWithTextExample />
            </ComponentDemo>
            <CodeBlock code={`function SeparatorWithTextExample() {
  return (
    <div className="space-y-4 max-w-md">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Sign up for our newsletter</h3>
        <p className="text-sm text-muted-foreground">Get updates on new features</p>
      </div>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline">Google</Button>
        <Button variant="outline">GitHub</Button>
      </div>
    </div>
  )
}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">In Layouts</h3>
            <ComponentDemo>
              <LayoutExample />
            </ComponentDemo>
            <CodeBlock code={`function LayoutExample() {
  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>User Settings</CardTitle>
        <CardDescription>Manage your account preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Display Name</Label>
          <Input id="name" defaultValue="John Doe" />
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" defaultValue="john@example.com" />
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <Label>Preferences</Label>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="notifications" defaultChecked />
            <Label htmlFor="notifications">Email notifications</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="marketing" />
            <Label htmlFor="marketing">Marketing emails</Label>
          </div>
        </div>
        
        <Separator />
        
        <div className="flex justify-between">
          <Button variant="outline">Cancel</Button>
          <Button>Save changes</Button>
        </div>
      </CardContent>
    </Card>
  )
}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Navigation Menu</h3>
            <ComponentDemo>
              <NavigationExample />
            </ComponentDemo>
            <CodeBlock code={`function NavigationExample() {
  return (
    <div className="max-w-sm border rounded-lg">
      {/* Header */}
      <div className="p-4">
        <h3 className="font-semibold">Navigation Menu</h3>
        <p className="text-sm text-muted-foreground">Choose an option</p>
      </div>
      
      <Separator />
      
      {/* Main Navigation */}
      <div className="p-2">
        <div className="space-y-1">
          <Button variant="ghost" className="w-full justify-start">
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <User className="h-4 w-4 mr-2" />
            Profile
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>
      
      <Separator />
      
      {/* Footer Actions */}
      <div className="p-2">
        <Button variant="ghost" className="w-full justify-start text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  )
}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Content Sections</h3>
            <ComponentDemo>
              <ContentSectionsExample />
            </ComponentDemo>
            <CodeBlock code={`function ContentSectionsExample() {
  return (
    <div className="max-w-lg space-y-6">
      <section>
        <h3 className="text-lg font-semibold mb-2">Recent Activity</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">User signed up</span>
            <Badge variant="secondary">2 min ago</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">New order received</span>
            <Badge variant="secondary">5 min ago</Badge>
          </div>
        </div>
      </section>
      
      <Separator />
      
      <section>
        <h3 className="text-lg font-semibold mb-2">Quick Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">1,234</div>
            <div className="text-sm text-muted-foreground">Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">567</div>
            <div className="text-sm text-muted-foreground">Orders</div>
          </div>
        </div>
      </section>
      
      <Separator />
      
      <section>
        <h3 className="text-lg font-semibold mb-2">Actions</h3>
        <div className="flex gap-2">
          <Button size="sm">Export Data</Button>
          <Button size="sm" variant="outline">Refresh</Button>
        </div>
      </section>
    </div>
  )
}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Sidebar Layout</h3>
            <ComponentDemo>
              <SidebarLayoutExample />
            </ComponentDemo>
            <CodeBlock code={`function SidebarLayoutExample() {
  return (
    <div className="border rounded-lg overflow-hidden max-w-2xl">
      <div className="flex h-64">
        {/* Sidebar */}
        <div className="w-48 bg-muted/30 p-4">
          <h4 className="font-semibold mb-4">Categories</h4>
          <div className="space-y-2">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              All Items
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              Electronics
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              Clothing
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              Books
            </Button>
          </div>
        </div>
        
        <Separator orientation="vertical" />
        
        {/* Main Content */}
        <div className="flex-1 p-4">
          <h4 className="font-semibold mb-4">Product List</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Wireless Headphones</span>
              <Badge>$99</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Smart Watch</span>
              <Badge>$199</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Laptop Stand</span>
              <Badge>$49</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Custom Styling</h3>
            <ComponentDemo>
              <div className="space-y-6 max-w-md">
                <div>
                  <h4 className="text-sm font-medium mb-2">Thick Separator</h4>
                  <Separator className="h-1 bg-gray-300" />
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Colored Separator</h4>
                  <Separator className="bg-blue-500" />
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Dashed Separator</h4>
                  <Separator className="border-dashed border-t border-border bg-transparent h-0" />
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Dotted Separator</h4>
                  <Separator className="border-dotted border-t-2 border-border bg-transparent h-0" />
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<!-- Thick -->
<Separator className="h-1 bg-gray-300" />

<!-- Colored -->
<Separator className="bg-blue-500" />

<!-- Dashed -->
<Separator className="border-dashed border-t border-border bg-transparent h-0" />

<!-- Dotted -->
<Separator className="border-dotted border-t-2 border-border bg-transparent h-0" />`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add separator"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import { Separator } from "@/components/ui/separator"

export function Example() {
  return (
    <div className="space-y-4">
      <div>Content above</div>
      <Separator />
      <div>Content below</div>
    </div>
  )
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <PropsTable
          data={[
            {
              prop: "orientation",
              type: "'horizontal' | 'vertical'",
              default: "'horizontal'",
              description: "The orientation of the separator.",
            },
            {
              prop: "decorative",
              type: "boolean",
              default: "true",
              description: "Whether or not the separator is purely decorative. When true, it's ignored by assistive technology.",
            },
            {
              prop: "className",
              type: "string",
              description: "Additional CSS class names to apply to the separator.",
            },
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Design Guidelines</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2 text-green-600">Do</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use separators to group related content</li>
              <li>Choose appropriate orientation based on layout direction</li>
              <li>Maintain consistent separator styling throughout your application</li>
              <li>Use separators to improve visual hierarchy</li>
              <li>Consider semantic separation for screen readers when needed</li>
              <li>Use subtle styling that doesn't distract from content</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2 text-red-600">Don't</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Overuse separators where whitespace would suffice</li>
              <li>Use separators that are too prominent or distracting</li>
              <li>Mix different separator styles inconsistently</li>
              <li>Use separators without considering the overall layout</li>
              <li>Forget to set proper height for vertical separators</li>
              <li>Use separators as the only means of organizing content</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            The Separator component follows WAI-ARIA separator pattern and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Proper ARIA role="separator" when not decorative</li>
            <li>Option to mark as decorative (ignored by assistive technology)</li>
            <li>Proper orientation announcements for screen readers</li>
            <li>Keyboard navigation compatibility</li>
            <li>High contrast support for better visibility</li>
            <li>Semantic meaning preservation in different contexts</li>
          </ul>
        </div>
      </section>
    </div>
  )
}

function SeparatorWithTextExample() {
  return (
    <div className="space-y-4 max-w-md">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Sign up for our newsletter</h3>
        <p className="text-sm text-muted-foreground">Get updates on new features</p>
      </div>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline">Google</Button>
        <Button variant="outline">GitHub</Button>
      </div>
    </div>
  )
}

function LayoutExample() {
  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>User Settings</CardTitle>
        <CardDescription>Manage your account preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Display Name</Label>
          <Input id="name" defaultValue="John Doe" />
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" defaultValue="john@example.com" />
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <Label>Preferences</Label>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="notifications" defaultChecked />
            <Label htmlFor="notifications">Email notifications</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="marketing" />
            <Label htmlFor="marketing">Marketing emails</Label>
          </div>
        </div>
        
        <Separator />
        
        <div className="flex justify-between">
          <Button variant="outline">Cancel</Button>
          <Button>Save changes</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function NavigationExample() {
  return (
    <div className="max-w-sm border rounded-lg">
      {/* Header */}
      <div className="p-4">
        <h3 className="font-semibold">Navigation Menu</h3>
        <p className="text-sm text-muted-foreground">Choose an option</p>
      </div>
      
      <Separator />
      
      {/* Main Navigation */}
      <div className="p-2">
        <div className="space-y-1">
          <Button variant="ghost" className="w-full justify-start">
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <User className="h-4 w-4 mr-2" />
            Profile
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>
      
      <Separator />
      
      {/* Footer Actions */}
      <div className="p-2">
        <Button variant="ghost" className="w-full justify-start text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  )
}

function ContentSectionsExample() {
  return (
    <div className="max-w-lg space-y-6">
      <section>
        <h3 className="text-lg font-semibold mb-2">Recent Activity</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">User signed up</span>
            <Badge variant="secondary">2 min ago</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">New order received</span>
            <Badge variant="secondary">5 min ago</Badge>
          </div>
        </div>
      </section>
      
      <Separator />
      
      <section>
        <h3 className="text-lg font-semibold mb-2">Quick Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">1,234</div>
            <div className="text-sm text-muted-foreground">Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">567</div>
            <div className="text-sm text-muted-foreground">Orders</div>
          </div>
        </div>
      </section>
      
      <Separator />
      
      <section>
        <h3 className="text-lg font-semibold mb-2">Actions</h3>
        <div className="flex gap-2">
          <Button size="sm">Export Data</Button>
          <Button size="sm" variant="outline">Refresh</Button>
        </div>
      </section>
    </div>
  )
}

function SidebarLayoutExample() {
  return (
    <div className="border rounded-lg overflow-hidden max-w-2xl">
      <div className="flex h-64">
        {/* Sidebar */}
        <div className="w-48 bg-muted/30 p-4">
          <h4 className="font-semibold mb-4">Categories</h4>
          <div className="space-y-2">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              All Items
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              Electronics
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              Clothing
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              Books
            </Button>
          </div>
        </div>
        
        <Separator orientation="vertical" />
        
        {/* Main Content */}
        <div className="flex-1 p-4">
          <h4 className="font-semibold mb-4">Product List</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Wireless Headphones</span>
              <Badge>$99</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Smart Watch</span>
              <Badge>$199</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Laptop Stand</span>
              <Badge>$49</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}