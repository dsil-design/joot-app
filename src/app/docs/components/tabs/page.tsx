"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function TabsDocumentation() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Tabs</h1>
        <p className="text-lg text-muted-foreground">
          A set of layered sections of content—known as tab panels—that are displayed one at a time.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Default</h3>
            <ComponentDemo>
              <Tabs defaultValue="account" className="w-[400px]">
                <TabsList>
                  <TabsTrigger value="account">Account</TabsTrigger>
                  <TabsTrigger value="password">Password</TabsTrigger>
                </TabsList>
                <TabsContent value="account">
                  <Card>
                    <CardHeader>
                      <CardTitle>Account</CardTitle>
                      <CardDescription>
                        Make changes to your account here. Click save when you're done.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="space-y-1">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" defaultValue="Pedro Duarte" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" defaultValue="@peduarte" />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button>Save changes</Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                <TabsContent value="password">
                  <Card>
                    <CardHeader>
                      <CardTitle>Password</CardTitle>
                      <CardDescription>
                        Change your password here. After saving, you'll be logged out.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="space-y-1">
                        <Label htmlFor="current">Current password</Label>
                        <Input id="current" type="password" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="new">New password</Label>
                        <Input id="new" type="password" />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button>Save password</Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
              </Tabs>
            </ComponentDemo>
            <CodeBlock code={`<Tabs defaultValue="account" className="w-[400px]">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          Make changes to your account here. Click save when you're done.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-1">
          <Label htmlFor="name">Name</Label>
          <Input id="name" defaultValue="Pedro Duarte" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="username">Username</Label>
          <Input id="username" defaultValue="@peduarte" />
        </div>
      </CardContent>
      <CardFooter>
        <Button>Save changes</Button>
      </CardFooter>
    </Card>
  </TabsContent>
  <TabsContent value="password">
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Change your password here. After saving, you'll be logged out.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-1">
          <Label htmlFor="current">Current password</Label>
          <Input id="current" type="password" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="new">New password</Label>
          <Input id="new" type="password" />
        </div>
      </CardContent>
      <CardFooter>
        <Button>Save password</Button>
      </CardFooter>
    </Card>
  </TabsContent>
</Tabs>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Vertical</h3>
            <ComponentDemo>
              <Tabs defaultValue="overview" orientation="vertical" className="w-[400px]">
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="reports">Reports</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Overview</CardTitle>
                      <CardDescription>
                        View your account overview and recent activity.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        This is the overview tab content. You can see your account summary here.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="analytics" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Analytics</CardTitle>
                      <CardDescription>
                        View detailed analytics and insights.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Analytics content would go here with charts and graphs.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="reports" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Reports</CardTitle>
                      <CardDescription>
                        Generate and view reports.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Report generation tools and historical reports.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="notifications" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Notifications</CardTitle>
                      <CardDescription>
                        Manage your notification preferences.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Notification settings and preferences.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </ComponentDemo>
            <CodeBlock code={`<Tabs defaultValue="overview" orientation="vertical" className="w-[400px]">
  <TabsList className="grid w-full grid-cols-1">
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
    <TabsTrigger value="reports">Reports</TabsTrigger>
    <TabsTrigger value="notifications">Notifications</TabsTrigger>
  </TabsList>
  <TabsContent value="overview" className="mt-0">
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription>
          View your account overview and recent activity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This is the overview tab content.
        </p>
      </CardContent>
    </Card>
  </TabsContent>
  {/* Other TabsContent components... */}
</Tabs>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage Guidelines</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-green-600">✅ Do</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use for organizing related content into sections</li>
              <li>Keep tab labels short and descriptive</li>
              <li>Maintain consistent content structure across tabs</li>
              <li>Use when users need to switch between different views</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-red-600">❌ Don't</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use for sequential processes (use a stepper instead)</li>
              <li>Include too many tabs (consider grouping or alternatives)</li>
              <li>Use for navigation between different pages</li>
              <li>Make tab content too different in purpose or structure</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <PropsTable
          data={[
            {
              prop: "value",
              type: "string",
              default: "undefined",
              description: "The controlled value of the tabs."
            },
            {
              prop: "defaultValue",
              type: "string",
              default: "undefined",
              description: "The default value when initially rendered."
            },
            {
              prop: "onValueChange",
              type: "function",
              default: "undefined",
              description: "Event handler called when the value changes."
            },
            {
              prop: "orientation",
              type: "'horizontal' | 'vertical'",
              default: "'horizontal'",
              description: "The orientation of the tabs."
            },
            {
              prop: "dir",
              type: "'ltr' | 'rtl'",
              default: "'ltr'",
              description: "The reading direction of the tabs."
            }
          ]}
        />
      </section>
    </div>
  )
}
