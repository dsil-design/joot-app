import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { 
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, Star, Heart, Share, MoreHorizontal } from "lucide-react"

export default function CardPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Card</h1>
        <p className="text-lg text-muted-foreground">
          Display content with related information in a flexible container.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Default</h3>
            <ComponentDemo>
              <Card className="w-80">
                <CardHeader>
                  <CardTitle>Card Title</CardTitle>
                  <CardDescription>
                    This is a basic card example with title and description.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Card content goes here. You can add any content inside.
                  </p>
                </CardContent>
              </Card>
            </ComponentDemo>
            <CodeBlock code={`<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>
      This is a basic card example with title and description.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground">
      Card content goes here. You can add any content inside.
    </p>
  </CardContent>
</Card>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Actions</h3>
            <ComponentDemo>
              <Card className="w-80">
                <CardHeader>
                  <CardTitle>Project Update</CardTitle>
                  <CardDescription>
                    Latest updates from your team project
                  </CardDescription>
                  <CardAction>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    The design system has been updated with new components.
                  </p>
                </CardContent>
                <CardFooter>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">New</Badge>
                    <span className="text-xs text-muted-foreground">2 hours ago</span>
                  </div>
                </CardFooter>
              </Card>
            </ComponentDemo>
            <CodeBlock code={`<Card>
  <CardHeader>
    <CardTitle>Project Update</CardTitle>
    <CardDescription>
      Latest updates from your team project
    </CardDescription>
    <CardAction>
      <Button variant="ghost" size="icon">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </CardAction>
  </CardHeader>
  <CardContent>
    <p className="text-sm">
      The design system has been updated with new components.
    </p>
  </CardContent>
  <CardFooter>
    <div className="flex items-center gap-2">
      <Badge variant="secondary">New</Badge>
      <span className="text-xs text-muted-foreground">2 hours ago</span>
    </div>
  </CardFooter>
</Card>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Footer Actions</h3>
            <ComponentDemo>
              <Card className="w-80">
                <CardHeader>
                  <CardTitle>Amazing Article</CardTitle>
                  <CardDescription>
                    A comprehensive guide to modern web development
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Learn about the latest trends and best practices in web development.
                  </p>
                </CardContent>
                <CardFooter>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Heart className="h-4 w-4" />
                        12
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Share className="h-4 w-4" />
                        Share
                      </Button>
                    </div>
                    <Button size="sm">Read More</Button>
                  </div>
                </CardFooter>
              </Card>
            </ComponentDemo>
            <CodeBlock code={`<Card>
  <CardHeader>
    <CardTitle>Amazing Article</CardTitle>
    <CardDescription>
      A comprehensive guide to modern web development
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground">
      Learn about the latest trends and best practices in web development.
    </p>
  </CardContent>
  <CardFooter>
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm">
          <Heart className="h-4 w-4" />
          12
        </Button>
        <Button variant="ghost" size="sm">
          <Share className="h-4 w-4" />
          Share
        </Button>
      </div>
      <Button size="sm">Read More</Button>
    </div>
  </CardFooter>
</Card>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Content Only</h3>
            <ComponentDemo>
              <Card className="w-80">
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Settings className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">Settings Updated</h4>
                      <p className="text-sm text-muted-foreground">
                        Your preferences have been saved.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ComponentDemo>
            <CodeBlock code={`<Card>
  <CardContent>
    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Settings className="h-5 w-5" />
      </div>
      <div>
        <h4 className="font-medium">Settings Updated</h4>
        <p className="text-sm text-muted-foreground">
          Your preferences have been saved.
        </p>
      </div>
    </div>
  </CardContent>
</Card>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add card"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content</p>
      </CardContent>
      <CardFooter>
        <p>Card footer</p>
      </CardFooter>
    </Card>
  )
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Card</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the card container.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The content of the card.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">CardHeader</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the card header.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The content of the card header, typically CardTitle and CardDescription.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">CardTitle</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the card title.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The title content.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">CardDescription</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the card description.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The description content.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">CardAction</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the card action area.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The action content, typically buttons or icons.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">CardContent</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the card content.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The main content of the card.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">CardFooter</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the card footer.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The footer content, typically actions or meta information.",
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
            The Card component follows semantic HTML structure and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Proper semantic div structure for screen readers</li>
            <li>Focus management when used with interactive elements</li>
            <li>High contrast borders and backgrounds</li>
            <li>Flexible layout that adapts to different content sizes</li>
            <li>Support for keyboard navigation when containing interactive elements</li>
          </ul>
        </div>
      </section>
    </div>
  )
}