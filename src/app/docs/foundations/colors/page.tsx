import { ColorSwatch } from "@/components/docs/color-swatch"
import { CodeBlock } from "@/components/docs/code-block"

const baseColors = [
  { name: "Black", value: "#000000", cssVar: "--black" },
  { name: "White", value: "#ffffff", cssVar: "--white" },
  { name: "Transparent", value: "#ffffff00", cssVar: "--transparent" },
]

const zincColors = [
  { name: "Zinc 50", value: "#fafafa", cssVar: "--zinc-50" },
  { name: "Zinc 100", value: "#f4f4f5", cssVar: "--zinc-100" },
  { name: "Zinc 200", value: "#e4e4e7", cssVar: "--zinc-200" },
  { name: "Zinc 300", value: "#d4d4d8", cssVar: "--zinc-300" },
  { name: "Zinc 400", value: "#9f9fa9", cssVar: "--zinc-400" },
  { name: "Zinc 500", value: "#71717b", cssVar: "--zinc-500" },
  { name: "Zinc 600", value: "#52525c", cssVar: "--zinc-600" },
  { name: "Zinc 700", value: "#3f3f46", cssVar: "--zinc-700" },
  { name: "Zinc 800", value: "#27272a", cssVar: "--zinc-800" },
  { name: "Zinc 900", value: "#18181b", cssVar: "--zinc-900" },
  { name: "Zinc 950", value: "#09090b", cssVar: "--zinc-950" },
]

const redColors = [
  { name: "Red 50", value: "#fef2f2", cssVar: "--red-50" },
  { name: "Red 100", value: "#ffe2e2", cssVar: "--red-100" },
  { name: "Red 200", value: "#ffc9c9", cssVar: "--red-200" },
  { name: "Red 300", value: "#ffa2a2", cssVar: "--red-300" },
  { name: "Red 400", value: "#ff6467", cssVar: "--red-400" },
  { name: "Red 500", value: "#fb2c36", cssVar: "--red-500" },
  { name: "Red 600", value: "#e7000b", cssVar: "--red-600" },
  { name: "Red 700", value: "#c10007", cssVar: "--red-700" },
  { name: "Red 800", value: "#9f0712", cssVar: "--red-800" },
  { name: "Red 900", value: "#82181a", cssVar: "--red-900" },
  { name: "Red 950", value: "#460809", cssVar: "--red-950" },
]

const amberColors = [
  { name: "Amber 50", value: "#fffbeb", cssVar: "--amber-50" },
  { name: "Amber 100", value: "#fef3c6", cssVar: "--amber-100" },
  { name: "Amber 200", value: "#fee685", cssVar: "--amber-200" },
  { name: "Amber 300", value: "#ffd230", cssVar: "--amber-300" },
  { name: "Amber 400", value: "#ffba00", cssVar: "--amber-400" },
  { name: "Amber 500", value: "#fd9a00", cssVar: "--amber-500" },
  { name: "Amber 600", value: "#e17100", cssVar: "--amber-600" },
  { name: "Amber 700", value: "#bb4d00", cssVar: "--amber-700" },
  { name: "Amber 800", value: "#973c00", cssVar: "--amber-800" },
  { name: "Amber 900", value: "#7b3306", cssVar: "--amber-900" },
  { name: "Amber 950", value: "#461901", cssVar: "--amber-950" },
]

const greenColors = [
  { name: "Green 50", value: "#f0fdf4", cssVar: "--green-50" },
  { name: "Green 100", value: "#dcfce7", cssVar: "--green-100" },
  { name: "Green 200", value: "#b9f8cf", cssVar: "--green-200" },
  { name: "Green 300", value: "#7bf1a8", cssVar: "--green-300" },
  { name: "Green 400", value: "#05df72", cssVar: "--green-400" },
  { name: "Green 500", value: "#00c951", cssVar: "--green-500" },
  { name: "Green 600", value: "#00a63e", cssVar: "--green-600" },
  { name: "Green 700", value: "#008236", cssVar: "--green-700" },
  { name: "Green 800", value: "#016630", cssVar: "--green-800" },
  { name: "Green 900", value: "#0d542b", cssVar: "--green-900" },
  { name: "Green 950", value: "#052e16", cssVar: "--green-950" },
]

const blueColors = [
  { name: "Blue 50", value: "#eff6ff", cssVar: "--blue-50" },
  { name: "Blue 100", value: "#dbeafe", cssVar: "--blue-100" },
  { name: "Blue 200", value: "#bedbff", cssVar: "--blue-200" },
  { name: "Blue 300", value: "#8ec5ff", cssVar: "--blue-300" },
  { name: "Blue 400", value: "#51a2ff", cssVar: "--blue-400" },
  { name: "Blue 500", value: "#2b7fff", cssVar: "--blue-500" },
  { name: "Blue 600", value: "#155dfc", cssVar: "--blue-600" },
  { name: "Blue 700", value: "#1447e6", cssVar: "--blue-700" },
  { name: "Blue 800", value: "#193cb8", cssVar: "--blue-800" },
  { name: "Blue 900", value: "#1c398e", cssVar: "--blue-900" },
  { name: "Blue 950", value: "#162456", cssVar: "--blue-950" },
]

const semanticColors = [
  { name: "Background", cssVar: "--background", description: "Main background color" },
  { name: "Foreground", cssVar: "--foreground", description: "Primary text color" },
  { name: "Card", cssVar: "--card", description: "Card background color" },
  { name: "Card Foreground", cssVar: "--card-foreground", description: "Card text color" },
  { name: "Popover", cssVar: "--popover", description: "Popover background color" },
  { name: "Popover Foreground", cssVar: "--popover-foreground", description: "Popover text color" },
  { name: "Primary", cssVar: "--primary", description: "Primary brand color" },
  { name: "Primary Foreground", cssVar: "--primary-foreground", description: "Primary text color" },
  { name: "Secondary", cssVar: "--secondary", description: "Secondary background color" },
  { name: "Secondary Foreground", cssVar: "--secondary-foreground", description: "Secondary text color" },
  { name: "Muted", cssVar: "--muted", description: "Muted background color" },
  { name: "Muted Foreground", cssVar: "--muted-foreground", description: "Muted text color" },
  { name: "Accent", cssVar: "--accent", description: "Accent background color" },
  { name: "Accent Foreground", cssVar: "--accent-foreground", description: "Accent text color" },
  { name: "Destructive", cssVar: "--destructive", description: "Destructive action color" },
  { name: "Destructive Foreground", cssVar: "--destructive-foreground", description: "Destructive text color" },
  { name: "Border", cssVar: "--border", description: "Border color" },
  { name: "Input", cssVar: "--input", description: "Input border color" },
  { name: "Ring", cssVar: "--ring", description: "Focus ring color" },
]

export default function ColorsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Colors</h1>
        <p className="text-lg text-muted-foreground">
          Our color system is built on CSS custom properties, providing both primitive color scales 
          and semantic theme tokens that adapt to light and dark modes.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Base Colors</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {baseColors.map((color) => (
            <ColorSwatch
              key={color.cssVar}
              name={color.name}
              value={color.value}
              cssVar={color.cssVar}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Zinc Scale</h2>
        <p className="text-muted-foreground">
          Primary neutral color scale used throughout the interface.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {zincColors.map((color) => (
            <ColorSwatch
              key={color.cssVar}
              name={color.name}
              value={color.value}
              cssVar={color.cssVar}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Red Scale</h2>
        <p className="text-muted-foreground">
          Used for error states, destructive actions, and danger alerts.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {redColors.map((color) => (
            <ColorSwatch
              key={color.cssVar}
              name={color.name}
              value={color.value}
              cssVar={color.cssVar}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Amber Scale</h2>
        <p className="text-muted-foreground">
          Used for warning states, caution alerts, and attention-grabbing elements.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {amberColors.map((color) => (
            <ColorSwatch
              key={color.cssVar}
              name={color.name}
              value={color.value}
              cssVar={color.cssVar}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Green Scale</h2>
        <p className="text-muted-foreground">
          Used for success states, positive feedback, and confirmation actions.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {greenColors.map((color) => (
            <ColorSwatch
              key={color.cssVar}
              name={color.name}
              value={color.value}
              cssVar={color.cssVar}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Blue Scale</h2>
        <p className="text-muted-foreground">
          Primary brand color scale used for interactive elements and primary actions.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {blueColors.map((color) => (
            <ColorSwatch
              key={color.cssVar}
              name={color.name}
              value={color.value}
              cssVar={color.cssVar}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Semantic Colors</h2>
        <p className="text-muted-foreground">
          Theme-aware colors that automatically adapt between light and dark modes.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {semanticColors.map((color) => (
            <ColorSwatch
              key={color.cssVar}
              name={color.name}
              value="Dynamic"
              cssVar={color.cssVar}
              description={color.description}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <p className="text-muted-foreground">
          Colors can be used via CSS custom properties or Tailwind classes.
        </p>
        
        <div className="space-y-4">
          <CodeBlock
            title="CSS Custom Properties"
            code={`/* Use color variables directly */
.my-element {
  background-color: var(--primary);
  color: var(--primary-foreground);
  border: 1px solid var(--border);
}

/* Colors automatically adapt in dark mode */
.dark .my-element {
  /* No additional styles needed */
}`}
            language="css"
          />
          
          <CodeBlock
            title="Tailwind Classes"
            code={`{/* Use Tailwind utility classes */}
<div className="bg-primary text-primary-foreground border">
  Primary background with foreground text
</div>

<div className="text-muted-foreground">
  Muted text that adapts to theme
</div>`}
            language="tsx"
          />
        </div>
      </section>
    </div>
  )
}