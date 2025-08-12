import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

export default function SkeletonPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Skeleton</h1>
        <p className="text-lg text-muted-foreground">
          Use to show a placeholder while content is loading.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Basic Skeleton</h3>
            <ComponentDemo>
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="flex items-center space-x-4">
  <Skeleton className="h-12 w-12 rounded-full" />
  <div className="space-y-2">
    <Skeleton className="h-4 w-[250px]" />
    <Skeleton className="h-4 w-[200px]" />
  </div>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Card Skeleton</h3>
            <ComponentDemo>
              <div className="flex flex-col space-y-3">
                <Skeleton className="h-[125px] w-[250px] rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="flex flex-col space-y-3">
  <Skeleton className="h-[125px] w-[250px] rounded-xl" />
  <div className="space-y-2">
    <Skeleton className="h-4 w-[250px]" />
    <Skeleton className="h-4 w-[200px]" />
  </div>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">List Skeletons</h3>
            <ComponentDemo>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="space-y-4">
  {[...Array(5)].map((_, i) => (
    <div key={i} className="flex items-center space-x-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16" />
    </div>
  ))}
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Different Shapes and Sizes</h3>
            <ComponentDemo>
              <div className="grid grid-cols-2 gap-6">
                {/* Rectangle */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Rectangle</h4>
                  <Skeleton className="h-20 w-full" />
                </div>

                {/* Circle */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Circle</h4>
                  <Skeleton className="h-20 w-20 rounded-full" />
                </div>

                {/* Rounded Rectangle */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Rounded</h4>
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>

                {/* Text Lines */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Text Lines</h4>
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-3/5" />
                  </div>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="grid grid-cols-2 gap-6">
  {/* Rectangle */}
  <div className="space-y-2">
    <h4 className="text-sm font-medium">Rectangle</h4>
    <Skeleton className="h-20 w-full" />
  </div>

  {/* Circle */}
  <div className="space-y-2">
    <h4 className="text-sm font-medium">Circle</h4>
    <Skeleton className="h-20 w-20 rounded-full" />
  </div>

  {/* Rounded Rectangle */}
  <div className="space-y-2">
    <h4 className="text-sm font-medium">Rounded</h4>
    <Skeleton className="h-20 w-full rounded-lg" />
  </div>

  {/* Text Lines */}
  <div className="space-y-2">
    <h4 className="text-sm font-medium">Text Lines</h4>
    <div className="space-y-1">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-3/5" />
    </div>
  </div>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Profile Card Loading</h3>
            <ComponentDemo>
              <Card className="w-[350px]">
                <CardHeader className="flex flex-row items-center space-y-0 space-x-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <div className="flex space-x-4">
                    <div className="space-y-1">
                      <Skeleton className="h-6 w-12" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="space-y-1">
                      <Skeleton className="h-6 w-12" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="space-y-1">
                      <Skeleton className="h-6 w-12" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex space-x-2 w-full">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 w-20" />
                  </div>
                </CardFooter>
              </Card>
            </ComponentDemo>
            <CodeBlock code={`<Card className="w-[350px]">
  <CardHeader className="flex flex-row items-center space-y-0 space-x-4">
    <Skeleton className="h-16 w-16 rounded-full" />
    <div className="space-y-2 flex-1">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-48" />
    </div>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
    <div className="flex space-x-4">
      <div className="space-y-1">
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  </CardContent>
  <CardFooter>
    <div className="flex space-x-2 w-full">
      <Skeleton className="h-9 flex-1" />
      <Skeleton className="h-9 w-20" />
    </div>
  </CardFooter>
</Card>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Table Loading State</h3>
            <ComponentDemo>
              <div className="w-full">
                <div className="rounded-md border">
                  <div className="p-4 border-b">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                  <div className="divide-y">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="p-4 flex items-center space-x-4">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1 flex-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="w-full">
  <div className="rounded-md border">
    <div className="p-4 border-b">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
    <div className="divide-y">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-4 flex items-center space-x-4">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  </div>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Article Loading</h3>
            <ComponentDemo>
              <div className="max-w-2xl space-y-6">
                {/* Header */}
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-1 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-1 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>

                {/* Featured Image */}
                <Skeleton className="h-48 w-full rounded-lg" />

                {/* Content */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/5" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>

                {/* Tags */}
                <div className="flex space-x-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="max-w-2xl space-y-6">
  {/* Header */}
  <div className="space-y-4">
    <Skeleton className="h-8 w-3/4" />
    <div className="flex items-center space-x-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-1 rounded-full" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-1 rounded-full" />
      <Skeleton className="h-4 w-20" />
    </div>
  </div>

  {/* Featured Image */}
  <Skeleton className="h-48 w-full rounded-lg" />

  {/* Content */}
  <div className="space-y-4">
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/5" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  </div>

  {/* Tags */}
  <div className="flex space-x-2">
    <Skeleton className="h-6 w-16 rounded-full" />
    <Skeleton className="h-6 w-20 rounded-full" />
    <Skeleton className="h-6 w-12 rounded-full" />
  </div>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Loading with Shimmer Effect</h3>
            <ComponentDemo>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="relative overflow-hidden">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="relative overflow-hidden">
                      <Skeleton className="h-4 w-[250px]" />
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                    </div>
                    <div className="relative overflow-hidden">
                      <Skeleton className="h-4 w-[200px]" />
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                    </div>
                  </div>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`{/* Add this to your CSS or Tailwind config for the shimmer animation */}
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

<div className="space-y-4">
  <div className="flex items-center space-x-4">
    <div className="relative overflow-hidden">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
    <div className="space-y-2 flex-1">
      <div className="relative overflow-hidden">
        <Skeleton className="h-4 w-[250px]" />
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      </div>
      <div className="relative overflow-hidden">
        <Skeleton className="h-4 w-[200px]" />
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      </div>
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
          code="npx shadcn@latest add skeleton"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import { Skeleton } from "@/components/ui/skeleton"

export function Example() {
  return (
    <div className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  )
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Skeleton</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the skeleton. Use to control size, shape, and styling.",
                },
                {
                  prop: "...props",
                  type: "React.ComponentProps<'div'>",
                  description: "All other props are passed through to the underlying div element.",
                },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Styling</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The Skeleton component uses CSS animation and can be customized with Tailwind classes:
          </p>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Common Size Classes</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><code className="text-xs bg-muted px-1 py-0.5 rounded">h-4 w-[250px]</code> - Text line</li>
                <li><code className="text-xs bg-muted px-1 py-0.5 rounded">h-12 w-12 rounded-full</code> - Avatar</li>
                <li><code className="text-xs bg-muted px-1 py-0.5 rounded">h-[125px] w-[250px] rounded-xl</code> - Card image</li>
                <li><code className="text-xs bg-muted px-1 py-0.5 rounded">h-8 w-32</code> - Button</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Shape Variants</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><code className="text-xs bg-muted px-1 py-0.5 rounded">rounded-full</code> - Circle (avatars, icons)</li>
                <li><code className="text-xs bg-muted px-1 py-0.5 rounded">rounded-lg</code> - Rounded rectangle</li>
                <li><code className="text-xs bg-muted px-1 py-0.5 rounded">rounded-md</code> - Default (text, buttons)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            The Skeleton component includes accessibility considerations:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Uses a subtle pulse animation that respects `prefers-reduced-motion`</li>
            <li>Provides visual indication that content is loading</li>
            <li>Should be used temporarily while real content loads</li>
            <li>Consider adding `aria-label="Loading"` for screen readers when appropriate</li>
            <li>Replace with actual content as soon as it becomes available</li>
            <li>Maintains consistent layout to prevent content jumps</li>
          </ul>
        </div>
      </section>
    </div>
  )
}