import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User } from "lucide-react"

export default function AvatarPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Avatar</h1>
        <p className="text-lg text-muted-foreground">
          An image element with a fallback for representing the user.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Default</h3>
            <ComponentDemo>
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </ComponentDemo>
            <CodeBlock code={`<Avatar>
  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
  <AvatarFallback>CN</AvatarFallback>
</Avatar>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Sizes</h3>
            <ComponentDemo>
              <div className="flex items-center gap-4">
                <Avatar className="h-6 w-6">
                  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                  <AvatarFallback className="text-xs">CN</AvatarFallback>
                </Avatar>
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                  <AvatarFallback className="text-sm">CN</AvatarFallback>
                </Avatar>
                <Avatar className="h-10 w-10">
                  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <Avatar className="h-12 w-12">
                  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <Avatar className="h-16 w-16">
                  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                  <AvatarFallback className="text-lg">CN</AvatarFallback>
                </Avatar>
              </div>
            </ComponentDemo>
            <CodeBlock code={`{/* Extra Small - 24px */}
<Avatar className="h-6 w-6">
  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
  <AvatarFallback className="text-xs">CN</AvatarFallback>
</Avatar>

{/* Small - 32px */}
<Avatar className="h-8 w-8">
  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
  <AvatarFallback className="text-sm">CN</AvatarFallback>
</Avatar>

{/* Medium - 40px */}
<Avatar className="h-10 w-10">
  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
  <AvatarFallback>CN</AvatarFallback>
</Avatar>

{/* Large - 48px */}
<Avatar className="h-12 w-12">
  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
  <AvatarFallback>CN</AvatarFallback>
</Avatar>

{/* Extra Large - 64px */}
<Avatar className="h-16 w-16">
  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
  <AvatarFallback className="text-lg">CN</AvatarFallback>
</Avatar>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Fallback Types</h3>
            <ComponentDemo>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-2">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">Initials</span>
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <Avatar>
                    <AvatarImage src="/broken-link.jpg" alt="Broken" />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">Icon</span>
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <Avatar>
                    <AvatarImage src="/broken-link.jpg" alt="Broken" />
                    <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                      JD
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">Colored</span>
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <Avatar>
                    <AvatarImage src="/broken-link.jpg" alt="Broken" />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                      AB
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">Gradient</span>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`{/* Text initials */}
<Avatar>
  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
  <AvatarFallback>CN</AvatarFallback>
</Avatar>

{/* Icon fallback */}
<Avatar>
  <AvatarImage src="/broken-link.jpg" alt="Broken" />
  <AvatarFallback>
    <User className="h-4 w-4" />
  </AvatarFallback>
</Avatar>

{/* Colored fallback */}
<Avatar>
  <AvatarImage src="/broken-link.jpg" alt="Broken" />
  <AvatarFallback className="bg-blue-100 text-blue-600">
    JD
  </AvatarFallback>
</Avatar>

{/* Gradient fallback */}
<Avatar>
  <AvatarImage src="/broken-link.jpg" alt="Broken" />
  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
    AB
  </AvatarFallback>
</Avatar>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Avatar Groups</h3>
            <ComponentDemo>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Overlapping</p>
                  <div className="flex -space-x-2">
                    <Avatar className="border-2 border-background">
                      <AvatarImage src="https://github.com/shadcn.png" alt="User 1" />
                      <AvatarFallback>U1</AvatarFallback>
                    </Avatar>
                    <Avatar className="border-2 border-background">
                      <AvatarImage src="/broken-link.jpg" alt="User 2" />
                      <AvatarFallback>U2</AvatarFallback>
                    </Avatar>
                    <Avatar className="border-2 border-background">
                      <AvatarImage src="/broken-link.jpg" alt="User 3" />
                      <AvatarFallback>U3</AvatarFallback>
                    </Avatar>
                    <Avatar className="border-2 border-background">
                      <AvatarFallback className="bg-muted text-muted-foreground">+2</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Spaced</p>
                  <div className="flex gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="https://github.com/shadcn.png" alt="User 1" />
                      <AvatarFallback>U1</AvatarFallback>
                    </Avatar>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/broken-link.jpg" alt="User 2" />
                      <AvatarFallback>U2</AvatarFallback>
                    </Avatar>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/broken-link.jpg" alt="User 3" />
                      <AvatarFallback>U3</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`{/* Overlapping avatars */}
<div className="flex -space-x-2">
  <Avatar className="border-2 border-background">
    <AvatarImage src="https://github.com/shadcn.png" alt="User 1" />
    <AvatarFallback>U1</AvatarFallback>
  </Avatar>
  <Avatar className="border-2 border-background">
    <AvatarImage src="/broken-link.jpg" alt="User 2" />
    <AvatarFallback>U2</AvatarFallback>
  </Avatar>
  <Avatar className="border-2 border-background">
    <AvatarImage src="/broken-link.jpg" alt="User 3" />
    <AvatarFallback>U3</AvatarFallback>
  </Avatar>
  <Avatar className="border-2 border-background">
    <AvatarFallback className="bg-muted text-muted-foreground">+2</AvatarFallback>
  </Avatar>
</div>

{/* Spaced avatars */}
<div className="flex gap-2">
  <Avatar className="h-8 w-8">
    <AvatarImage src="https://github.com/shadcn.png" alt="User 1" />
    <AvatarFallback>U1</AvatarFallback>
  </Avatar>
  <Avatar className="h-8 w-8">
    <AvatarImage src="/broken-link.jpg" alt="User 2" />
    <AvatarFallback>U2</AvatarFallback>
  </Avatar>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Status Indicators</h3>
            <ComponentDemo>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></div>
                </div>
                
                <div className="relative">
                  <Avatar>
                    <AvatarImage src="/broken-link.jpg" alt="User" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-yellow-500 border-2 border-background"></div>
                </div>
                
                <div className="relative">
                  <Avatar>
                    <AvatarImage src="/broken-link.jpg" alt="User" />
                    <AvatarFallback>AB</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-background"></div>
                </div>
                
                <div className="relative">
                  <Avatar>
                    <AvatarImage src="/broken-link.jpg" alt="User" />
                    <AvatarFallback>MN</AvatarFallback>
                  </Avatar>
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">3</Badge>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`{/* Online status */}
<div className="relative">
  <Avatar>
    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
    <AvatarFallback>CN</AvatarFallback>
  </Avatar>
  <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></div>
</div>

{/* Away status */}
<div className="relative">
  <Avatar>
    <AvatarImage src="/broken-link.jpg" alt="User" />
    <AvatarFallback>JD</AvatarFallback>
  </Avatar>
  <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-yellow-500 border-2 border-background"></div>
</div>

{/* Offline status */}
<div className="relative">
  <Avatar>
    <AvatarImage src="/broken-link.jpg" alt="User" />
    <AvatarFallback>AB</AvatarFallback>
  </Avatar>
  <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-background"></div>
</div>

{/* Notification badge */}
<div className="relative">
  <Avatar>
    <AvatarImage src="/broken-link.jpg" alt="User" />
    <AvatarFallback>MN</AvatarFallback>
  </Avatar>
  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">3</Badge>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Profile Cards</h3>
            <ComponentDemo>
              <div className="space-y-4 w-full max-w-sm">
                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium leading-none">Colin Nagy</p>
                    <p className="text-sm text-muted-foreground">@shadcn</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Avatar>
                    <AvatarImage src="/broken-link.jpg" alt="Jane Doe" />
                    <AvatarFallback className="bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">JD</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Jane Doe</p>
                    <p className="text-sm text-muted-foreground">Product Designer</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-xs text-muted-foreground">Online</span>
                    </div>
                  </div>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="flex items-center space-x-4 p-4 border rounded-lg">
  <Avatar>
    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
    <AvatarFallback>CN</AvatarFallback>
  </Avatar>
  <div>
    <p className="text-sm font-medium leading-none">Colin Nagy</p>
    <p className="text-sm text-muted-foreground">@shadcn</p>
  </div>
</div>

<div className="flex items-center space-x-4 p-4 border rounded-lg">
  <Avatar>
    <AvatarImage src="/broken-link.jpg" alt="Jane Doe" />
    <AvatarFallback className="bg-purple-100 text-purple-600">JD</AvatarFallback>
  </Avatar>
  <div className="space-y-1">
    <p className="text-sm font-medium leading-none">Jane Doe</p>
    <p className="text-sm text-muted-foreground">Product Designer</p>
    <div className="flex items-center gap-2">
      <div className="h-2 w-2 rounded-full bg-green-500"></div>
      <span className="text-xs text-muted-foreground">Online</span>
    </div>
  </div>
</div>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add avatar"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function Example() {
  return (
    <Avatar>
      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  )
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Avatar</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the avatar container.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The avatar content, typically AvatarImage and AvatarFallback.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">AvatarImage</h3>
            <PropsTable
              data={[
                {
                  prop: "src",
                  type: "string",
                  description: "The source URL of the avatar image.",
                },
                {
                  prop: "alt",
                  type: "string",
                  description: "Alternative text for the avatar image for accessibility.",
                },
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the avatar image.",
                },
                {
                  prop: "onLoadingStatusChange",
                  type: "(status: 'idle' | 'loading' | 'loaded' | 'error') => void",
                  description: "Callback fired when the loading status of the image changes.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">AvatarFallback</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the avatar fallback.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The fallback content, typically initials or an icon.",
                },
                {
                  prop: "delayMs",
                  type: "number",
                  description: "Delay in milliseconds before showing the fallback.",
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
              <li>Use high-quality, clear profile images</li>
              <li>Provide meaningful fallback text (initials or icons)</li>
              <li>Maintain consistent avatar sizes within the same context</li>
              <li>Use appropriate alt text for accessibility</li>
              <li>Consider different screen sizes and pixel densities</li>
              <li>Use status indicators sparingly and meaningfully</li>
              <li>Group avatars logically when showing multiple users</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-red-600">Don't</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use low-resolution or pixelated images</li>
              <li>Make avatars too small to be recognizable</li>
              <li>Use inappropriate or offensive images</li>
              <li>Ignore fallback states for broken or missing images</li>
              <li>Mix different avatar sizes randomly</li>
              <li>Overuse status indicators or badges</li>
              <li>Forget to handle loading and error states</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            The Avatar component is built with accessibility in mind:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Always include meaningful <code className="bg-muted px-1 rounded text-sm">alt</code> text for avatar images</li>
            <li>Fallback content is automatically announced by screen readers</li>
            <li>Status indicators should have appropriate ARIA labels when meaningful</li>
            <li>Use sufficient color contrast for fallback backgrounds and text</li>
            <li>Consider focus indicators when avatars are interactive</li>
            <li>Provide context for avatar groups (e.g., "Team members")</li>
            <li>Test with screen readers to ensure proper announcements</li>
          </ul>
        </div>
      </section>
    </div>
  )
}