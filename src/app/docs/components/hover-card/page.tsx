import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { CalendarDays, Github, Heart, MapPin, MessageCircle, Star, Users } from "lucide-react"

export default function HoverCardPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Hover Card</h1>
        <p className="text-lg text-muted-foreground">
          For sighted users to preview content available behind a link.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Basic Hover Card</h3>
            <ComponentDemo>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button variant="link">@nextjs</Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="flex justify-between space-x-4">
                    <Avatar>
                      <AvatarImage src="https://github.com/vercel.png" />
                      <AvatarFallback>VC</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">@nextjs</h4>
                      <p className="text-sm">
                        The React Framework – created and maintained by @vercel.
                      </p>
                      <div className="flex items-center pt-2">
                        <CalendarDays className="mr-2 h-4 w-4 opacity-70" />
                        <span className="text-xs text-muted-foreground">
                          Joined December 2021
                        </span>
                      </div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </ComponentDemo>
            <CodeBlock code={`<HoverCard>
  <HoverCardTrigger asChild>
    <Button variant="link">@nextjs</Button>
  </HoverCardTrigger>
  <HoverCardContent className="w-80">
    <div className="flex justify-between space-x-4">
      <Avatar>
        <AvatarImage src="https://github.com/vercel.png" />
        <AvatarFallback>VC</AvatarFallback>
      </Avatar>
      <div className="space-y-1">
        <h4 className="text-sm font-semibold">@nextjs</h4>
        <p className="text-sm">
          The React Framework – created and maintained by @vercel.
        </p>
        <div className="flex items-center pt-2">
          <CalendarDays className="mr-2 h-4 w-4 opacity-70" />
          <span className="text-xs text-muted-foreground">
            Joined December 2021
          </span>
        </div>
      </div>
    </div>
  </HoverCardContent>
</HoverCard>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">User Profile Card</h3>
            <ComponentDemo>
              <div className="flex items-center space-x-4">
                <p className="text-sm">Follow</p>
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Button variant="link" className="p-0 h-auto font-semibold">
                      @shadcn
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src="https://github.com/shadcn.png" />
                          <AvatarFallback>SC</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold">shadcn</h4>
                            <Badge variant="secondary">Pro</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">@shadcn</p>
                          <p className="text-sm">
                            Building @shadcn/ui. Design Engineer @vercel.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <MapPin className="mr-1 h-3 w-3" />
                          San Francisco
                        </div>
                        <div className="flex items-center">
                          <Github className="mr-1 h-3 w-3" />
                          shadcn
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center">
                          <strong className="mr-1">23.1k</strong>
                          <Users className="mr-1 h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">followers</span>
                        </div>
                        <div className="flex items-center">
                          <strong className="mr-1">180</strong>
                          <Heart className="mr-1 h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">following</span>
                        </div>
                      </div>

                      <div className="flex space-x-2 pt-2">
                        <Button size="sm" className="flex-1">Follow</Button>
                        <Button size="sm" variant="outline">
                          <MessageCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
                <p className="text-sm">for updates.</p>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="flex items-center space-x-4">
  <p className="text-sm">Follow</p>
  <HoverCard>
    <HoverCardTrigger asChild>
      <Button variant="link" className="p-0 h-auto font-semibold">
        @shadcn
      </Button>
    </HoverCardTrigger>
    <HoverCardContent className="w-80">
      <div className="space-y-4">
        <div className="flex items-start space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>SC</AvatarFallback>
          </Avatar>
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">shadcn</h4>
              <Badge variant="secondary">Pro</Badge>
            </div>
            <p className="text-sm text-muted-foreground">@shadcn</p>
            <p className="text-sm">
              Building @shadcn/ui. Design Engineer @vercel.
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <MapPin className="mr-1 h-3 w-3" />
            San Francisco
          </div>
          <div className="flex items-center">
            <Github className="mr-1 h-3 w-3" />
            shadcn
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <strong className="mr-1">23.1k</strong>
            <Users className="mr-1 h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">followers</span>
          </div>
          <div className="flex items-center">
            <strong className="mr-1">180</strong>
            <Heart className="mr-1 h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">following</span>
          </div>
        </div>

        <div className="flex space-x-2 pt-2">
          <Button size="sm" className="flex-1">Follow</Button>
          <Button size="sm" variant="outline">
            <MessageCircle className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </HoverCardContent>
  </HoverCard>
  <p className="text-sm">for updates.</p>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Rich Content Card</h3>
            <ComponentDemo>
              <div className="max-w-md">
                <p className="text-sm">
                  Check out this amazing
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Button variant="link" className="px-1 h-auto font-semibold text-blue-600">
                        project on GitHub
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-96">
                      <Card className="border-0 shadow-none">
                        <CardHeader className="pb-4">
                          <div className="flex items-center space-x-4">
                            <Avatar>
                              <AvatarImage src="https://github.com/shadcn.png" />
                              <AvatarFallback>SC</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <CardTitle className="text-base">shadcn/ui</CardTitle>
                              <CardDescription>
                                Beautifully designed components built with Radix UI and Tailwind CSS.
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center">
                                <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                                TypeScript
                              </div>
                              <div className="flex items-center">
                                <Star className="w-3 h-3 mr-1" />
                                47.2k
                              </div>
                              <div className="flex items-center">
                                <Github className="w-3 h-3 mr-1" />
                                4.1k
                              </div>
                            </div>
                            <span>Updated 2 hours ago</span>
                          </div>
                        </CardContent>
                      </Card>
                    </HoverCardContent>
                  </HoverCard>
                  that I've been working on.
                </p>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="max-w-md">
  <p className="text-sm">
    Check out this amazing
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="link" className="px-1 h-auto font-semibold text-blue-600">
          project on GitHub
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-96">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>SC</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-base">shadcn/ui</CardTitle>
                <CardDescription>
                  Beautifully designed components built with Radix UI and Tailwind CSS.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                  TypeScript
                </div>
                <div className="flex items-center">
                  <Star className="w-3 h-3 mr-1" />
                  47.2k
                </div>
                <div className="flex items-center">
                  <Github className="w-3 h-3 mr-1" />
                  4.1k
                </div>
              </div>
              <span>Updated 2 hours ago</span>
            </div>
          </CardContent>
        </Card>
      </HoverCardContent>
    </HoverCard>
    that I've been working on.
  </p>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Different Positions</h3>
            <ComponentDemo>
              <div className="flex flex-wrap gap-8 justify-center">
                <HoverCard openDelay={100}>
                  <HoverCardTrigger asChild>
                    <Button variant="outline">Top</Button>
                  </HoverCardTrigger>
                  <HoverCardContent side="top" className="w-60">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Top Position</h4>
                      <p className="text-sm text-muted-foreground">
                        This hover card appears above the trigger.
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>

                <HoverCard openDelay={100}>
                  <HoverCardTrigger asChild>
                    <Button variant="outline">Right</Button>
                  </HoverCardTrigger>
                  <HoverCardContent side="right" className="w-60">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Right Position</h4>
                      <p className="text-sm text-muted-foreground">
                        This hover card appears to the right of the trigger.
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>

                <HoverCard openDelay={100}>
                  <HoverCardTrigger asChild>
                    <Button variant="outline">Bottom</Button>
                  </HoverCardTrigger>
                  <HoverCardContent side="bottom" className="w-60">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Bottom Position</h4>
                      <p className="text-sm text-muted-foreground">
                        This hover card appears below the trigger (default).
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>

                <HoverCard openDelay={100}>
                  <HoverCardTrigger asChild>
                    <Button variant="outline">Left</Button>
                  </HoverCardTrigger>
                  <HoverCardContent side="left" className="w-60">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Left Position</h4>
                      <p className="text-sm text-muted-foreground">
                        This hover card appears to the left of the trigger.
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="flex flex-wrap gap-8 justify-center">
  <HoverCard openDelay={100}>
    <HoverCardTrigger asChild>
      <Button variant="outline">Top</Button>
    </HoverCardTrigger>
    <HoverCardContent side="top" className="w-60">
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Top Position</h4>
        <p className="text-sm text-muted-foreground">
          This hover card appears above the trigger.
        </p>
      </div>
    </HoverCardContent>
  </HoverCard>

  <HoverCard openDelay={100}>
    <HoverCardTrigger asChild>
      <Button variant="outline">Right</Button>
    </HoverCardTrigger>
    <HoverCardContent side="right" className="w-60">
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Right Position</h4>
        <p className="text-sm text-muted-foreground">
          This hover card appears to the right of the trigger.
        </p>
      </div>
    </HoverCardContent>
  </HoverCard>

  {/* Similarly for bottom and left */}
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Custom Delay Settings</h3>
            <ComponentDemo>
              <div className="flex gap-4">
                <HoverCard openDelay={0}>
                  <HoverCardTrigger asChild>
                    <Button variant="outline">Instant</Button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-60">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Instant Open</h4>
                      <p className="text-sm text-muted-foreground">
                        No delay when hovering (openDelay: 0).
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>

                <HoverCard openDelay={1000} closeDelay={500}>
                  <HoverCardTrigger asChild>
                    <Button variant="outline">Slow</Button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-60">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Slow Open/Close</h4>
                      <p className="text-sm text-muted-foreground">
                        1 second delay to open, 0.5 second delay to close.
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="flex gap-4">
  <HoverCard openDelay={0}>
    <HoverCardTrigger asChild>
      <Button variant="outline">Instant</Button>
    </HoverCardTrigger>
    <HoverCardContent className="w-60">
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Instant Open</h4>
        <p className="text-sm text-muted-foreground">
          No delay when hovering (openDelay: 0).
        </p>
      </div>
    </HoverCardContent>
  </HoverCard>

  <HoverCard openDelay={1000} closeDelay={500}>
    <HoverCardTrigger asChild>
      <Button variant="outline">Slow</Button>
    </HoverCardTrigger>
    <HoverCardContent className="w-60">
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Slow Open/Close</h4>
        <p className="text-sm text-muted-foreground">
          1 second delay to open, 0.5 second delay to close.
        </p>
      </div>
    </HoverCardContent>
  </HoverCard>
</div>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add hover-card"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

export function Example() {
  return (
    <HoverCard>
      <HoverCardTrigger>Hover</HoverCardTrigger>
      <HoverCardContent>
        The React Framework – created and maintained by @vercel.
      </HoverCardContent>
    </HoverCard>
  )
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">HoverCard</h3>
            <PropsTable
              data={[
                {
                  prop: "defaultOpen",
                  type: "boolean",
                  description: "The open state of the hover card when it is initially rendered.",
                },
                {
                  prop: "open",
                  type: "boolean",
                  description: "The controlled open state of the hover card.",
                },
                {
                  prop: "onOpenChange",
                  type: "(open: boolean) => void",
                  description: "Event handler called when the open state of the hover card changes.",
                },
                {
                  prop: "openDelay",
                  type: "number",
                  default: "700",
                  description: "The duration from when the mouse enters the trigger until the hover card opens.",
                },
                {
                  prop: "closeDelay",
                  type: "number",
                  default: "300",
                  description: "The duration from when the mouse leaves the trigger until the hover card closes.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">HoverCardTrigger</h3>
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

          <div>
            <h3 className="text-lg font-medium mb-2">HoverCardContent</h3>
            <PropsTable
              data={[
                {
                  prop: "align",
                  type: "'start' | 'center' | 'end'",
                  default: "'center'",
                  description: "The preferred alignment against the trigger.",
                },
                {
                  prop: "alignOffset",
                  type: "number",
                  default: "0",
                  description: "An offset in pixels from the 'start' or 'end' alignment options.",
                },
                {
                  prop: "side",
                  type: "'top' | 'right' | 'bottom' | 'left'",
                  default: "'bottom'",
                  description: "The preferred side of the trigger to render against.",
                },
                {
                  prop: "sideOffset",
                  type: "number",
                  default: "0",
                  description: "The distance in pixels from the trigger.",
                },
                {
                  prop: "avoidCollisions",
                  type: "boolean",
                  default: "true",
                  description: "When true, overrides the side and align preferences to prevent collisions.",
                },
                {
                  prop: "collisionBoundary",
                  type: "Element | null | Array<Element | null>",
                  default: "[]",
                  description: "The element used as the collision boundary.",
                },
                {
                  prop: "collisionPadding",
                  type: "number | Partial<Record<Side, number>>",
                  default: "0",
                  description: "The distance in pixels from the boundary edges where collision detection should occur.",
                },
                {
                  prop: "arrowPadding",
                  type: "number",
                  default: "0",
                  description: "The padding between the arrow and the edges of the content.",
                },
                {
                  prop: "sticky",
                  type: "'partial' | 'always'",
                  default: "'partial'",
                  description: "The sticky behavior on the align axis.",
                },
                {
                  prop: "hideWhenDetached",
                  type: "boolean",
                  default: "false",
                  description: "Whether to hide the content when the trigger becomes fully occluded.",
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
            The Hover Card component follows WAI-ARIA hovercard pattern and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Automatic focus management when opened via keyboard</li>
            <li>Screen reader support with proper ARIA attributes</li>
            <li>Keyboard navigation support (Escape to close)</li>
            <li>Respects user's reduced motion preferences</li>
            <li>Smart positioning to avoid viewport edges</li>
            <li>Customizable open and close delays</li>
            <li>Works with both mouse and keyboard interactions</li>
          </ul>
        </div>
      </section>
    </div>
  )
}