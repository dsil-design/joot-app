import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

const tags = Array.from({ length: 50 }).map(
  (_, i, a) => `v1.2.0-beta.${a.length - i}`
)

const works = [
  {
    artist: "Ornella Binni",
    art: "https://images.unsplash.com/photo-1465869185982-5a1a7522cbcb?auto=format&fit=crop&w=300&q=80",
  },
  {
    artist: "Tom Byrom",
    art: "https://images.unsplash.com/photo-1548516173-3cabfa4607e9?auto=format&fit=crop&w=300&q=80",
  },
  {
    artist: "Vladimir Malyavko",
    art: "https://images.unsplash.com/photo-1494337480532-3725c85fd2ab?auto=format&fit=crop&w=300&q=80",
  },
]

export default function ScrollAreaPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Scroll Area</h1>
        <p className="text-lg text-muted-foreground">
          Augment native scroll functionality for custom, cross-platform styling.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Basic Scroll Area</h3>
            <ComponentDemo>
              <ScrollArea className="h-72 w-48 rounded-md border">
                <div className="p-4">
                  <h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
                  {tags.map((tag) => (
                    <>
                      <div key={tag} className="text-sm">
                        {tag}
                      </div>
                      <Separator className="my-2" />
                    </>
                  ))}
                </div>
              </ScrollArea>
            </ComponentDemo>
            <CodeBlock code={`const tags = Array.from({ length: 50 }).map(
  (_, i, a) => \`v1.2.0-beta.\${a.length - i}\`
)

<ScrollArea className="h-72 w-48 rounded-md border">
  <div className="p-4">
    <h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
    {tags.map((tag) => (
      <>
        <div key={tag} className="text-sm">
          {tag}
        </div>
        <Separator className="my-2" />
      </>
    ))}
  </div>
</ScrollArea>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Horizontal Scroll</h3>
            <ComponentDemo>
              <ScrollArea className="w-96 whitespace-nowrap rounded-md border">
                <div className="flex w-max space-x-4 p-4">
                  {works.map((artwork) => (
                    <figure key={artwork.artist} className="shrink-0">
                      <div className="overflow-hidden rounded-md">
                        <img
                          src={artwork.art}
                          alt={`Photo by ${artwork.artist}`}
                          className="aspect-[3/4] h-fit w-fit object-cover"
                          width={300}
                          height={400}
                        />
                      </div>
                      <figcaption className="pt-2 text-xs text-muted-foreground">
                        Photo by{" "}
                        <span className="font-semibold text-foreground">
                          {artwork.artist}
                        </span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </ComponentDemo>
            <CodeBlock code={`const works = [
  {
    artist: "Ornella Binni",
    art: "https://images.unsplash.com/photo-1465869185982-5a1a7522cbcb?auto=format&fit=crop&w=300&q=80",
  },
  // ... more works
]

<ScrollArea className="w-96 whitespace-nowrap rounded-md border">
  <div className="flex w-max space-x-4 p-4">
    {works.map((artwork) => (
      <figure key={artwork.artist} className="shrink-0">
        <div className="overflow-hidden rounded-md">
          <img
            src={artwork.art}
            alt={\`Photo by \${artwork.artist}\`}
            className="aspect-[3/4] h-fit w-fit object-cover"
            width={300}
            height={400}
          />
        </div>
        <figcaption className="pt-2 text-xs text-muted-foreground">
          Photo by{" "}
          <span className="font-semibold text-foreground">
            {artwork.artist}
          </span>
        </figcaption>
      </figure>
    ))}
  </div>
  <ScrollBar orientation="horizontal" />
</ScrollArea>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Both Directions</h3>
            <ComponentDemo>
              <ScrollArea className="h-72 w-80 rounded-md border">
                <div className="p-4">
                  <h4 className="mb-4 text-sm font-medium leading-none">
                    Two-directional scrolling
                  </h4>
                  <div className="space-y-4">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} className="flex space-x-2 whitespace-nowrap">
                        <Badge variant="outline">Item {i + 1}</Badge>
                        <div className="text-sm text-muted-foreground">
                          This is a very long line of content that will require horizontal scrolling to read completely. It demonstrates how the scroll area handles content that overflows in both directions.
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <ScrollBar />
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </ComponentDemo>
            <CodeBlock code={`<ScrollArea className="h-72 w-80 rounded-md border">
  <div className="p-4">
    <h4 className="mb-4 text-sm font-medium leading-none">
      Two-directional scrolling
    </h4>
    <div className="space-y-4">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="flex space-x-2 whitespace-nowrap">
          <Badge variant="outline">Item {i + 1}</Badge>
          <div className="text-sm text-muted-foreground">
            This is a very long line of content that will require horizontal scrolling to read completely. It demonstrates how the scroll area handles content that overflows in both directions.
          </div>
        </div>
      ))}
    </div>
  </div>
  <ScrollBar />
  <ScrollBar orientation="horizontal" />
</ScrollArea>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">In Card Layout</h3>
            <ComponentDemo>
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="p-6 pb-0">
                  <h3 className="text-lg font-semibold">Notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    You have 3 unread messages.
                  </p>
                </div>
                <div className="p-6 pt-4">
                  <ScrollArea className="h-64">
                    <div className="space-y-4">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center space-x-4 rounded-md border p-3"
                        >
                          <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium leading-none">
                              Notification {i + 1}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              This is the description for notification {i + 1}.
                            </p>
                          </div>
                          <Badge variant={i % 3 === 0 ? "default" : "secondary"}>
                            {i % 3 === 0 ? "New" : "Read"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="rounded-lg border bg-card text-card-foreground shadow-sm">
  <div className="p-6 pb-0">
    <h3 className="text-lg font-semibold">Notifications</h3>
    <p className="text-sm text-muted-foreground">
      You have 3 unread messages.
    </p>
  </div>
  <div className="p-6 pt-4">
    <ScrollArea className="h-64">
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center space-x-4 rounded-md border p-3"
          >
            <div className="h-10 w-10 rounded-full bg-gray-200"></div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">
                Notification {i + 1}
              </p>
              <p className="text-sm text-muted-foreground">
                This is the description for notification {i + 1}.
              </p>
            </div>
            <Badge variant={i % 3 === 0 ? "default" : "secondary"}>
              {i % 3 === 0 ? "New" : "Read"}
            </Badge>
          </div>
        ))}
      </div>
    </ScrollArea>
  </div>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Custom Styling</h3>
            <ComponentDemo>
              <ScrollArea className="h-72 w-48 rounded-md border">
                <div className="p-4">
                  <h4 className="mb-4 text-sm font-medium leading-none">
                    Custom Scrollbar
                  </h4>
                  {tags.map((tag) => (
                    <>
                      <div key={tag} className="text-sm py-1 px-2 hover:bg-accent rounded">
                        {tag}
                      </div>
                      <Separator className="my-1" />
                    </>
                  ))}
                </div>
                <ScrollBar className="w-3">
                  <div className="bg-primary rounded-full" />
                </ScrollBar>
              </ScrollArea>
            </ComponentDemo>
            <CodeBlock code={`<ScrollArea className="h-72 w-48 rounded-md border">
  <div className="p-4">
    <h4 className="mb-4 text-sm font-medium leading-none">
      Custom Scrollbar
    </h4>
    {tags.map((tag) => (
      <>
        <div key={tag} className="text-sm py-1 px-2 hover:bg-accent rounded">
          {tag}
        </div>
        <Separator className="my-1" />
      </>
    ))}
  </div>
  <ScrollBar className="w-3">
    <div className="bg-primary rounded-full" />
  </ScrollBar>
</ScrollArea>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Table with Scroll</h3>
            <ComponentDemo>
              <div className="rounded-md border">
                <ScrollArea className="h-64">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                          Name
                        </th>
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                          Email
                        </th>
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                          Role
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 20 }).map((_, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="p-4 align-middle">User {i + 1}</td>
                          <td className="p-4 align-middle">
                            <Badge variant={i % 2 === 0 ? "default" : "secondary"}>
                              {i % 2 === 0 ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="p-4 align-middle text-muted-foreground">
                            user{i + 1}@example.com
                          </td>
                          <td className="p-4 align-middle">
                            {i % 3 === 0 ? "Admin" : i % 3 === 1 ? "User" : "Viewer"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="rounded-md border">
  <ScrollArea className="h-64">
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
            Name
          </th>
          <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
            Status
          </th>
          <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
            Email
          </th>
          <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
            Role
          </th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 20 }).map((_, i) => (
          <tr key={i} className="border-b last:border-0">
            <td className="p-4 align-middle">User {i + 1}</td>
            <td className="p-4 align-middle">
              <Badge variant={i % 2 === 0 ? "default" : "secondary"}>
                {i % 2 === 0 ? "Active" : "Inactive"}
              </Badge>
            </td>
            <td className="p-4 align-middle text-muted-foreground">
              user{i + 1}@example.com
            </td>
            <td className="p-4 align-middle">
              {i % 3 === 0 ? "Admin" : i % 3 === 1 ? "User" : "Viewer"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </ScrollArea>
</div>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add scroll-area"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import { ScrollArea } from "@/components/ui/scroll-area"

export function Example() {
  return (
    <ScrollArea className="h-[200px] w-[350px] rounded-md border p-4">
      Jokester began sneaking into the castle in the middle of the night and
      leaving jokes all over the place: under the king's pillow, in his soup,
      even in the royal toilet. The king was furious, but he couldn't seem to
      stop Jokester. And then, one day, the people of the kingdom discovered
      that the jokes left by Jokester were so funny that they couldn't help but
      laugh. And once they started laughing, they couldn't stop.
    </ScrollArea>
  )
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">ScrollArea</h3>
            <PropsTable
              data={[
                {
                  prop: "type",
                  type: "'auto' | 'always' | 'scroll' | 'hover'",
                  default: "'hover'",
                  description: "Describes the nature of scrollbar visibility. 'auto' means that scrollbars are visible when content is overflowing on the corresponding orientation. 'always' means that scrollbars are always visible. 'scroll' means that scrollbars are visible when the user is scrolling along its corresponding orientation. 'hover' when the user is scrolling along its corresponding orientation and when the user is hovering over the scroll area.",
                },
                {
                  prop: "scrollHideDelay",
                  type: "number",
                  default: "600",
                  description: "If type is set to either 'scroll' or 'hover', this prop determines the length of time, in milliseconds, before the scrollbars are hidden after the user stops interacting with scrollbars.",
                },
                {
                  prop: "dir",
                  type: "'ltr' | 'rtl'",
                  description: "The reading direction of the scroll area when applicable. If omitted, inherits globally from DirectionProvider or assumes LTR (left-to-right) reading mode.",
                },
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the scroll area.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">ScrollBar</h3>
            <PropsTable
              data={[
                {
                  prop: "orientation",
                  type: "'vertical' | 'horizontal'",
                  default: "'vertical'",
                  description: "The orientation of the scrollbar.",
                },
                {
                  prop: "forceMount",
                  type: "boolean",
                  description: "Used to force mounting when more control is needed. Useful when controlling animation with React animation libraries.",
                },
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the scrollbar.",
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
            The Scroll Area component follows WAI-ARIA scrollbar pattern and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Keyboard navigation support for scrolling</li>
            <li>Screen reader announcements for scrollable regions</li>
            <li>Proper ARIA attributes and roles for scrollbars</li>
            <li>Support for both vertical and horizontal scrolling</li>
            <li>Customizable scrollbar appearance and behavior</li>
            <li>Touch and mouse interaction support</li>
            <li>Respects user's reduced motion preferences</li>
          </ul>
        </div>
      </section>
    </div>
  )
}