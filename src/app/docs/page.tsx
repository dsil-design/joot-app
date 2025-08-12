import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Palette, Type, Ruler, Sparkles, Blocks, Layout } from "lucide-react"

const sections = [
  {
    title: "Foundations",
    description: "Core design tokens, colors, typography, and spacing systems that form the base of our design language.",
    icon: Palette,
    items: [
      { name: "Colors", href: "/docs/foundations/colors" },
      { name: "Typography", href: "/docs/foundations/typography" },
      { name: "Spacing", href: "/docs/foundations/spacing" },
      { name: "Icons", href: "/docs/foundations/icons" },
      { name: "Tokens", href: "/docs/foundations/tokens" },
    ]
  },
  {
    title: "Components",
    description: "Reusable UI components built with accessibility and consistency in mind.",
    icon: Blocks,
    items: [
      { name: "Button", href: "/docs/components/button" },
      { name: "Card", href: "/docs/components/card" },
      { name: "Dialog", href: "/docs/components/dialog" },
      { name: "Input", href: "/docs/components/input" },
      { name: "Select", href: "/docs/components/select" },
      { name: "View all components", href: "/docs/components" },
    ]
  },
  {
    title: "Patterns",
    description: "Common UI patterns and best practices for building consistent user experiences.",
    icon: Layout,
    items: [
      { name: "Forms", href: "/docs/patterns/forms" },
      { name: "Navigation", href: "/docs/patterns/navigation" },
      { name: "Data Display", href: "/docs/patterns/data-display" },
    ]
  }
]

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">Joot Design System</h1>
        <p className="text-xl text-muted-foreground max-w-3xl">
          A comprehensive design system built with shadcn/ui components, featuring dynamic documentation 
          that stays in sync with your codebase.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Card key={section.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle>{section.title}</CardTitle>
                </div>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Features</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Dynamic Components
            </h3>
            <p className="text-muted-foreground">
              All component examples use live components from your codebase, ensuring documentation 
              automatically reflects any code changes.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Type className="h-4 w-4 text-primary" />
              Design Tokens
            </h3>
            <p className="text-muted-foreground">
              Comprehensive design token system extracted from your CSS custom properties, 
              with visual representations and usage examples.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button asChild>
          <Link href="/docs/foundations/colors">Get Started</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/docs/components">View Components</Link>
        </Button>
      </div>
    </div>
  )
}