import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"

const spacingScale = [
  { name: "0", value: "0px", tailwind: "p-0, m-0, gap-0" },
  { name: "px", value: "1px", tailwind: "p-px, m-px" },
  { name: "0.5", value: "2px", tailwind: "p-0.5, m-0.5, gap-0.5" },
  { name: "1", value: "4px", tailwind: "p-1, m-1, gap-1" },
  { name: "1.5", value: "6px", tailwind: "p-1.5, m-1.5, gap-1.5" },
  { name: "2", value: "8px", tailwind: "p-2, m-2, gap-2" },
  { name: "2.5", value: "10px", tailwind: "p-2.5, m-2.5, gap-2.5" },
  { name: "3", value: "12px", tailwind: "p-3, m-3, gap-3" },
  { name: "3.5", value: "14px", tailwind: "p-3.5, m-3.5, gap-3.5" },
  { name: "4", value: "16px", tailwind: "p-4, m-4, gap-4" },
  { name: "5", value: "20px", tailwind: "p-5, m-5, gap-5" },
  { name: "6", value: "24px", tailwind: "p-6, m-6, gap-6" },
  { name: "7", value: "28px", tailwind: "p-7, m-7, gap-7" },
  { name: "8", value: "32px", tailwind: "p-8, m-8, gap-8" },
  { name: "9", value: "36px", tailwind: "p-9, m-9, gap-9" },
  { name: "10", value: "40px", tailwind: "p-10, m-10, gap-10" },
  { name: "12", value: "48px", tailwind: "p-12, m-12, gap-12" },
  { name: "16", value: "64px", tailwind: "p-16, m-16, gap-16" },
  { name: "20", value: "80px", tailwind: "p-20, m-20, gap-20" },
  { name: "24", value: "96px", tailwind: "p-24, m-24, gap-24" },
]

export default function SpacingPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Spacing</h1>
        <p className="text-lg text-muted-foreground">
          Consistent spacing system based on a 4px grid, providing harmony and rhythm throughout the interface.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Spacing Scale</h2>
        <p className="text-muted-foreground">
          Our spacing scale follows Tailwind CSS conventions, with a base unit of 4px (1 = 4px).
        </p>
        
        <ComponentDemo>
          <div className="space-y-4 w-full">
            {spacingScale.map((space) => (
              <div key={space.name} className="flex items-center gap-4">
                <div className="flex items-center gap-4 min-w-[120px]">
                  <code className="text-sm bg-muted px-2 py-1 rounded font-mono w-8 text-center">
                    {space.name}
                  </code>
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {space.value}
                  </span>
                </div>
                <div 
                  className="bg-blue-500 h-4"
                  style={{ width: space.value === "0px" ? "2px" : space.value }}
                />
                <code className="text-xs text-muted-foreground">
                  {space.tailwind}
                </code>
              </div>
            ))}
          </div>
        </ComponentDemo>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Padding Examples</h2>
        <p className="text-muted-foreground">
          Padding controls the space inside an element.
        </p>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">All Sides</h3>
            <ComponentDemo>
              <div className="flex gap-4 flex-wrap">
                <div className="p-2 bg-blue-100 border-2 border-blue-300 rounded">
                  <div className="bg-blue-500 text-white text-sm px-2 py-1 rounded">p-2</div>
                </div>
                <div className="p-4 bg-blue-100 border-2 border-blue-300 rounded">
                  <div className="bg-blue-500 text-white text-sm px-2 py-1 rounded">p-4</div>
                </div>
                <div className="p-6 bg-blue-100 border-2 border-blue-300 rounded">
                  <div className="bg-blue-500 text-white text-sm px-2 py-1 rounded">p-6</div>
                </div>
                <div className="p-8 bg-blue-100 border-2 border-blue-300 rounded">
                  <div className="bg-blue-500 text-white text-sm px-2 py-1 rounded">p-8</div>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="p-2">p-2 (8px)</div>
<div className="p-4">p-4 (16px)</div>
<div className="p-6">p-6 (24px)</div>
<div className="p-8">p-8 (32px)</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Directional Padding</h3>
            <ComponentDemo>
              <div className="flex gap-4 flex-wrap">
                <div className="px-6 py-2 bg-green-100 border-2 border-green-300 rounded">
                  <div className="bg-green-500 text-white text-sm px-2 py-1 rounded">px-6 py-2</div>
                </div>
                <div className="pl-8 pr-4 bg-green-100 border-2 border-green-300 rounded">
                  <div className="bg-green-500 text-white text-sm px-2 py-1 rounded">pl-8 pr-4</div>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="px-6 py-2">Horizontal & vertical</div>
<div className="pl-8 pr-4">Left & right specific</div>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Margin Examples</h2>
        <p className="text-muted-foreground">
          Margin controls the space outside an element.
        </p>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Margin Between Elements</h3>
            <ComponentDemo>
              <div className="space-y-4">
                <div className="flex flex-col">
                  <div className="bg-red-500 text-white p-2 rounded">Element 1</div>
                  <div className="bg-red-500 text-white p-2 rounded mt-2">Element 2 (mt-2)</div>
                  <div className="bg-red-500 text-white p-2 rounded mt-4">Element 3 (mt-4)</div>
                  <div className="bg-red-500 text-white p-2 rounded mt-8">Element 4 (mt-8)</div>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="bg-red-500">Element 1</div>
<div className="bg-red-500 mt-2">Element 2 (mt-2)</div>
<div className="bg-red-500 mt-4">Element 3 (mt-4)</div>
<div className="bg-red-500 mt-8">Element 4 (mt-8)</div>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Gap (Flexbox & Grid)</h2>
        <p className="text-muted-foreground">
          Gap property for spacing between flex and grid items.
        </p>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Flex Gap</h3>
            <ComponentDemo>
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <div className="bg-purple-500 text-white p-2 rounded text-sm">gap-2</div>
                  <div className="bg-purple-500 text-white p-2 rounded text-sm">Item</div>
                  <div className="bg-purple-500 text-white p-2 rounded text-sm">Item</div>
                </div>
                <div className="flex gap-4 flex-wrap">
                  <div className="bg-purple-500 text-white p-2 rounded text-sm">gap-4</div>
                  <div className="bg-purple-500 text-white p-2 rounded text-sm">Item</div>
                  <div className="bg-purple-500 text-white p-2 rounded text-sm">Item</div>
                </div>
                <div className="flex gap-8 flex-wrap">
                  <div className="bg-purple-500 text-white p-2 rounded text-sm">gap-8</div>
                  <div className="bg-purple-500 text-white p-2 rounded text-sm">Item</div>
                  <div className="bg-purple-500 text-white p-2 rounded text-sm">Item</div>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="flex gap-2">
  <div>Item</div>
  <div>Item</div>
</div>

<div className="flex gap-4">
  <div>Item</div>
  <div>Item</div>
</div>

<div className="flex gap-8">
  <div>Item</div>
  <div>Item</div>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Grid Gap</h3>
            <ComponentDemo>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-amber-500 text-white p-2 rounded text-sm text-center">
                      gap-2
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-amber-500 text-white p-2 rounded text-sm text-center">
                      gap-4
                    </div>
                  ))}
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="grid grid-cols-3 gap-2">
  <div>Item</div>
  <div>Item</div>
  <div>Item</div>
</div>

<div className="grid grid-cols-3 gap-4">
  <div>Item</div>
  <div>Item</div>
  <div>Item</div>
</div>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Space Utility</h2>
        <p className="text-muted-foreground">
          Add space between child elements automatically.
        </p>
        
        <ComponentDemo>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="bg-teal-500 text-white p-2 rounded">space-y-2</div>
              <div className="bg-teal-500 text-white p-2 rounded">Child item</div>
              <div className="bg-teal-500 text-white p-2 rounded">Child item</div>
            </div>
            <div className="space-y-4">
              <div className="bg-teal-500 text-white p-2 rounded">space-y-4</div>
              <div className="bg-teal-500 text-white p-2 rounded">Child item</div>
              <div className="bg-teal-500 text-white p-2 rounded">Child item</div>
            </div>
          </div>
        </ComponentDemo>
        <CodeBlock code={`<div className="space-y-2">
  <div>Child automatically gets margin-top</div>
  <div>Child item</div>
  <div>Child item</div>
</div>

<div className="space-y-4">
  <div>Larger vertical spacing</div>
  <div>Child item</div>
  <div>Child item</div>
</div>`} />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage Guidelines</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-green-600">Do</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use consistent spacing values from the scale</li>
              <li>Follow the 4px base unit grid system</li>
              <li>Use gap for flex and grid layouts when possible</li>
              <li>Prefer space-* utilities for consistent child spacing</li>
              <li>Use larger spacing for better touch targets on mobile</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-red-600">Don't</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use arbitrary spacing values outside the scale</li>
              <li>Mix different spacing systems in the same component</li>
              <li>Create cramped interfaces with too little spacing</li>
              <li>Use excessive spacing that breaks visual hierarchy</li>
              <li>Ignore touch target sizes for interactive elements</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}