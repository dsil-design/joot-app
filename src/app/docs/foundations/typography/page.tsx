import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"

const fontSizes = [
  { name: "text-xs", size: "0.75rem", lineHeight: "1rem", example: "Extra small text" },
  { name: "text-sm", size: "0.875rem", lineHeight: "1.25rem", example: "Small text" },
  { name: "text-base", size: "1rem", lineHeight: "1.5rem", example: "Base text" },
  { name: "text-lg", size: "1.125rem", lineHeight: "1.75rem", example: "Large text" },
  { name: "text-xl", size: "1.25rem", lineHeight: "1.75rem", example: "Extra large text" },
  { name: "text-2xl", size: "1.5rem", lineHeight: "2rem", example: "2X large text" },
  { name: "text-3xl", size: "1.875rem", lineHeight: "2.25rem", example: "3X large text" },
  { name: "text-4xl", size: "2.25rem", lineHeight: "2.5rem", example: "4X large text" },
  { name: "text-5xl", size: "3rem", lineHeight: "1", example: "5X large text" },
  { name: "text-6xl", size: "3.75rem", lineHeight: "1", example: "6X large text" },
]

const fontWeights = [
  { name: "font-thin", weight: "100", example: "Thin font weight" },
  { name: "font-light", weight: "300", example: "Light font weight" },
  { name: "font-normal", weight: "400", example: "Normal font weight" },
  { name: "font-medium", weight: "500", example: "Medium font weight" },
  { name: "font-semibold", weight: "600", example: "Semibold font weight" },
  { name: "font-bold", weight: "700", example: "Bold font weight" },
  { name: "font-extrabold", weight: "800", example: "Extra bold font weight" },
  { name: "font-black", weight: "900", example: "Black font weight" },
]

export default function TypographyPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Typography</h1>
        <p className="text-lg text-muted-foreground">
          Typography scale and font system using Geist Sans and Geist Mono.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Font Family</h2>
        <p className="text-muted-foreground">
          We use Geist Sans as our primary font family, with Geist Mono for code and monospace text.
        </p>
        
        <div className="space-y-4">
          <ComponentDemo>
            <div className="space-y-4 text-center">
              <div className="font-geist-sans">
                <p className="text-lg">Geist Sans - Primary Font</p>
                <p className="text-sm text-muted-foreground">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
                <p className="text-sm text-muted-foreground">abcdefghijklmnopqrstuvwxyz</p>
                <p className="text-sm text-muted-foreground">0123456789</p>
              </div>
              <div className="font-geist-mono">
                <p className="text-lg">Geist Mono - Code Font</p>
                <p className="text-sm text-muted-foreground">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
                <p className="text-sm text-muted-foreground">abcdefghijklmnopqrstuvwxyz</p>
                <p className="text-sm text-muted-foreground">0123456789 &lt;&gt;{}{}</p>
              </div>
            </div>
          </ComponentDemo>
          
          <CodeBlock
            code={`/* CSS Variables */
--font-geist-sans: 'Geist Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
--font-geist-mono: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;

/* Tailwind Classes */
.font-geist-sans { font-family: var(--font-geist-sans); }
.font-geist-mono { font-family: var(--font-geist-mono); }`}
            language="css"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Font Sizes</h2>
        <p className="text-muted-foreground">
          Typography scale based on a harmonious progression of sizes.
        </p>
        
        <div className="space-y-4">
          <ComponentDemo>
            <div className="space-y-4 w-full">
              {fontSizes.map((font) => (
                <div key={font.name} className="flex items-baseline gap-4">
                  <code className="text-sm bg-muted px-2 py-1 rounded min-w-[80px]">{font.name}</code>
                  <div className="flex-1">
                    <p className={font.name}>{font.example}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{font.size}</div>
                    <div>LH: {font.lineHeight}</div>
                  </div>
                </div>
              ))}
            </div>
          </ComponentDemo>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Font Weights</h2>
        <p className="text-muted-foreground">
          Available font weights from thin to black.
        </p>
        
        <div className="space-y-4">
          <ComponentDemo>
            <div className="space-y-4 w-full">
              {fontWeights.map((font) => (
                <div key={font.name} className="flex items-baseline gap-4">
                  <code className="text-sm bg-muted px-2 py-1 rounded min-w-[120px]">{font.name}</code>
                  <div className="flex-1">
                    <p className={font.name}>{font.example}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {font.weight}
                  </div>
                </div>
              ))}
            </div>
          </ComponentDemo>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Semantic Typography</h2>
        <p className="text-muted-foreground">
          Common typography patterns used throughout the application.
        </p>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Headings</h3>
            <ComponentDemo>
              <div className="space-y-4 w-full">
                <h1 className="text-4xl font-bold">Heading 1</h1>
                <h2 className="text-3xl font-semibold">Heading 2</h2>
                <h3 className="text-2xl font-semibold">Heading 3</h3>
                <h4 className="text-xl font-medium">Heading 4</h4>
                <h5 className="text-lg font-medium">Heading 5</h5>
                <h6 className="text-base font-medium">Heading 6</h6>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<h1 className="text-4xl font-bold">Heading 1</h1>
<h2 className="text-3xl font-semibold">Heading 2</h2>
<h3 className="text-2xl font-semibold">Heading 3</h3>
<h4 className="text-xl font-medium">Heading 4</h4>
<h5 className="text-lg font-medium">Heading 5</h5>
<h6 className="text-base font-medium">Heading 6</h6>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Text Variants</h3>
            <ComponentDemo>
              <div className="space-y-4 w-full">
                <p className="text-lg">Large body text - used for introductory paragraphs</p>
                <p className="text-base">Base body text - standard paragraph text</p>
                <p className="text-sm">Small text - used for captions and secondary information</p>
                <p className="text-xs">Extra small text - used for labels and metadata</p>
                <p className="text-muted-foreground">Muted text - used for secondary content</p>
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">Inline code text</code>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<p className="text-lg">Large body text</p>
<p className="text-base">Base body text</p>
<p className="text-sm">Small text</p>
<p className="text-xs">Extra small text</p>
<p className="text-muted-foreground">Muted text</p>
<code className="text-sm font-mono bg-muted px-2 py-1 rounded">Inline code</code>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage Guidelines</h2>
        <div className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-green-600">Do</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Use consistent font sizes for similar content types</li>
                <li>Maintain proper contrast ratios for accessibility</li>
                <li>Use semantic HTML elements (h1, h2, p, etc.)</li>
                <li>Apply appropriate line heights for readability</li>
                <li>Use font weights to create clear hierarchy</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-red-600">Don't</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Skip heading levels (h1 to h3, skipping h2)</li>
                <li>Use too many different font sizes</li>
                <li>Make text too small for accessibility</li>
                <li>Use extreme font weights unnecessarily</li>
                <li>Forget to test in dark mode</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}