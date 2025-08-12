import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { 
  Search, 
  User, 
  Settings, 
  Home, 
  Mail, 
  Phone, 
  Calendar,
  Heart,
  Star,
  Download,
  Upload,
  Edit,
  Trash,
  Plus,
  Minus,
  Check,
  X,
  Info,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Menu,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Share,
  Bell,
  Lock,
  Unlock,
  Shield,
  MapPin,
  Camera,
  Image,
  File,
  FileText,
  Folder,
  FolderOpen,
  Github,
  Twitter,
  Linkedin,
  Facebook
} from "lucide-react"

const iconCategories = [
  {
    name: "Interface",
    description: "Common UI icons for navigation and actions",
    icons: [
      { name: "Search", component: Search, usage: "Search functionality" },
      { name: "User", component: User, usage: "User profile or account" },
      { name: "Settings", component: Settings, usage: "Configuration and settings" },
      { name: "Home", component: Home, usage: "Home page or dashboard" },
      { name: "Menu", component: Menu, usage: "Navigation menu toggle" },
      { name: "MoreHorizontal", component: MoreHorizontal, usage: "More options menu" },
      { name: "ExternalLink", component: ExternalLink, usage: "Links to external resources" },
      { name: "Copy", component: Copy, usage: "Copy to clipboard action" },
    ]
  },
  {
    name: "Actions",
    description: "Icons for user actions and interactions",
    icons: [
      { name: "Plus", component: Plus, usage: "Add or create new item" },
      { name: "Minus", component: Minus, usage: "Remove or delete item" },
      { name: "Edit", component: Edit, usage: "Edit or modify content" },
      { name: "Trash", component: Trash, usage: "Delete permanently" },
      { name: "Download", component: Download, usage: "Download file or content" },
      { name: "Upload", component: Upload, usage: "Upload file or content" },
      { name: "Share", component: Share, usage: "Share content" },
      { name: "Heart", component: Heart, usage: "Like or favorite" },
    ]
  },
  {
    name: "Status",
    description: "Icons representing different states and feedback",
    icons: [
      { name: "Check", component: Check, usage: "Success or confirmation" },
      { name: "X", component: X, usage: "Close or cancel" },
      { name: "Info", component: Info, usage: "Information message" },
      { name: "AlertCircle", component: AlertCircle, usage: "Warning or alert" },
      { name: "CheckCircle", component: CheckCircle, usage: "Success state" },
      { name: "XCircle", component: XCircle, usage: "Error state" },
      { name: "Star", component: Star, usage: "Rating or highlight" },
      { name: "Bell", component: Bell, usage: "Notifications" },
    ]
  },
  {
    name: "Navigation",
    description: "Directional and navigation icons",
    icons: [
      { name: "ChevronLeft", component: ChevronLeft, usage: "Navigate back or previous" },
      { name: "ChevronRight", component: ChevronRight, usage: "Navigate forward or next" },
      { name: "ChevronUp", component: ChevronUp, usage: "Expand or scroll up" },
      { name: "ChevronDown", component: ChevronDown, usage: "Collapse or scroll down" },
    ]
  },
  {
    name: "Communication",
    description: "Icons for communication and contact",
    icons: [
      { name: "Mail", component: Mail, usage: "Email communication" },
      { name: "Phone", component: Phone, usage: "Phone or call" },
      { name: "Calendar", component: Calendar, usage: "Dates and scheduling" },
      { name: "MapPin", component: MapPin, usage: "Location or address" },
    ]
  },
  {
    name: "Security",
    description: "Icons related to security and privacy",
    icons: [
      { name: "Eye", component: Eye, usage: "Show or visibility" },
      { name: "EyeOff", component: EyeOff, usage: "Hide or privacy" },
      { name: "Lock", component: Lock, usage: "Secure or locked" },
      { name: "Unlock", component: Unlock, usage: "Unlocked or accessible" },
      { name: "Shield", component: Shield, usage: "Protection or security" },
    ]
  },
  {
    name: "Content",
    description: "Icons for files, media, and content types",
    icons: [
      { name: "File", component: File, usage: "Generic file" },
      { name: "FileText", component: FileText, usage: "Text document" },
      { name: "Folder", component: Folder, usage: "Closed folder" },
      { name: "FolderOpen", component: FolderOpen, usage: "Open folder" },
      { name: "Image", component: Image, usage: "Image file" },
      { name: "Camera", component: Camera, usage: "Photo capture" },
    ]
  },
  {
    name: "Social",
    description: "Social media and platform icons",
    icons: [
      { name: "Github", component: Github, usage: "GitHub platform" },
      { name: "Twitter", component: Twitter, usage: "Twitter platform" },
      { name: "Linkedin", component: Linkedin, usage: "LinkedIn platform" },
      { name: "Facebook", component: Facebook, usage: "Facebook platform" },
    ]
  }
]

const iconSizes = [
  { name: "Small", size: "h-4 w-4", pixels: "16px" },
  { name: "Default", size: "h-5 w-5", pixels: "20px" },
  { name: "Medium", size: "h-6 w-6", pixels: "24px" },
  { name: "Large", size: "h-8 w-8", pixels: "32px" },
  { name: "Extra Large", size: "h-12 w-12", pixels: "48px" },
]

export default function IconsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Icons</h1>
        <p className="text-lg text-muted-foreground">
          Consistent icon system using Lucide React for clear visual communication throughout the interface.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Overview</h2>
        <p className="text-muted-foreground">
          Our icon system is built on Lucide React, providing a comprehensive set of consistent, 
          well-designed icons. All icons follow the same design principles with consistent stroke 
          width, corner radius, and visual weight.
        </p>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-green-600">Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Consistent 24x24px base size with scalable SVGs</li>
              <li>2px stroke width for optimal clarity</li>
              <li>Semantic naming for easy identification</li>
              <li>Tree-shakable imports for optimal bundle size</li>
              <li>Accessible with proper ARIA labels</li>
              <li>Customizable colors via CSS classes</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Library Information</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><strong>Library:</strong> Lucide React</li>
              <li><strong>Icons Available:</strong> 1,000+</li>
              <li><strong>Format:</strong> SVG</li>
              <li><strong>License:</strong> MIT</li>
              <li><strong>Size:</strong> ~2KB per icon (gzipped)</li>
              <li><strong>Stroke Width:</strong> 2px</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Icon Sizes</h2>
        <p className="text-muted-foreground">
          Standard icon sizes using Tailwind CSS classes.
        </p>
        
        <ComponentDemo>
          <div className="flex items-center gap-6 flex-wrap">
            {iconSizes.map((size) => (
              <div key={size.name} className="flex flex-col items-center gap-2">
                <Settings className={size.size} />
                <div className="text-center">
                  <div className="text-sm font-medium">{size.name}</div>
                  <div className="text-xs text-muted-foreground">{size.pixels}</div>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">{size.size}</code>
                </div>
              </div>
            ))}
          </div>
        </ComponentDemo>
        
        <CodeBlock code={`import { Settings } from "lucide-react"

// Different sizes
<Settings className="h-4 w-4" />  // 16px - Small
<Settings className="h-5 w-5" />  // 20px - Default  
<Settings className="h-6 w-6" />  // 24px - Medium
<Settings className="h-8 w-8" />  // 32px - Large
<Settings className="h-12 w-12" /> // 48px - Extra Large`} />
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Icon Categories</h2>
          <p className="text-muted-foreground">
            Icons organized by common use cases and functionality.
          </p>
        </div>
        
        {iconCategories.map((category) => (
          <div key={category.name} className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold">{category.name}</h3>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </div>
            
            <ComponentDemo>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 w-full">
                {category.icons.map((icon) => {
                  const IconComponent = icon.component
                  return (
                    <div
                      key={icon.name}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <IconComponent className="h-6 w-6" />
                      <div className="text-center">
                        <div className="text-xs font-medium">{icon.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 leading-tight">
                          {icon.usage}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ComponentDemo>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <p className="text-muted-foreground">
          How to use icons in your components with proper styling and accessibility.
        </p>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Basic Usage</h3>
            <ComponentDemo>
              <div className="flex items-center gap-4">
                <Search className="h-5 w-5" />
                <span>Search</span>
              </div>
            </ComponentDemo>
            <CodeBlock code={`import { Search } from "lucide-react"

export function SearchButton() {
  return (
    <div className="flex items-center gap-2">
      <Search className="h-5 w-5" />
      <span>Search</span>
    </div>
  )
}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Colors</h3>
            <ComponentDemo>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Success</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <span>Warning</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span>Error</span>
                </div>
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  <span>Info</span>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`import { CheckCircle, AlertCircle, XCircle, Info } from "lucide-react"

// Status icons with semantic colors
<CheckCircle className="h-5 w-5 text-green-600" />
<AlertCircle className="h-5 w-5 text-amber-600" />
<XCircle className="h-5 w-5 text-red-600" />
<Info className="h-5 w-5 text-blue-600" />`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">In Buttons</h3>
            <ComponentDemo>
              <div className="flex gap-4">
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md">
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border rounded-md">
                  <Share className="h-4 w-4" />
                  Share
                </button>
                <button className="p-2 border rounded-md">
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </ComponentDemo>
            <CodeBlock code={`import { Download, Share, Settings } from "lucide-react"

// With text
<button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md">
  <Download className="h-4 w-4" />
  Download
</button>

// Icon only
<button className="p-2 border rounded-md">
  <Settings className="h-4 w-4" />
</button>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Interactive States</h3>
            <ComponentDemo>
              <div className="flex gap-4">
                <button className="p-2 rounded-md hover:bg-muted transition-colors">
                  <Heart className="h-5 w-5" />
                </button>
                <button className="p-2 rounded-md hover:bg-muted transition-colors">
                  <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                </button>
                <button className="p-2 rounded-md hover:bg-muted transition-colors">
                  <Star className="h-5 w-5" />
                </button>
                <button className="p-2 rounded-md hover:bg-muted transition-colors">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </button>
              </div>
            </ComponentDemo>
            <CodeBlock code={`import { Heart, Star } from "lucide-react"

// Default state
<Heart className="h-5 w-5" />
<Star className="h-5 w-5" />

// Active/filled state
<Heart className="h-5 w-5 fill-red-500 text-red-500" />
<Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npm install lucide-react"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Best Practices</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-green-600">Do</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use semantic icon names that match their purpose</li>
              <li>Maintain consistent sizes within the same context</li>
              <li>Use color to reinforce meaning (red for errors, green for success)</li>
              <li>Include alt text or aria-labels for accessibility</li>
              <li>Use appropriate sizes for touch targets (minimum 24px)</li>
              <li>Keep icon usage consistent throughout the application</li>
              <li>Import only the icons you need to optimize bundle size</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-red-600">Don't</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Mix different icon libraries within the same interface</li>
              <li>Use icons that don't match their conventional meaning</li>
              <li>Make icons too small to be clearly visible</li>
              <li>Rely solely on color to convey meaning</li>
              <li>Use too many different icon sizes in one view</li>
              <li>Use decorative icons without proper accessibility considerations</li>
              <li>Import the entire icon library if you only need a few icons</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            Icons should be implemented with accessibility in mind:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Add <code className="bg-muted px-1 rounded text-sm">aria-label</code> for interactive icons without text</li>
            <li>Use <code className="bg-muted px-1 rounded text-sm">aria-hidden="true"</code> for decorative icons</li>
            <li>Ensure sufficient color contrast (4.5:1 minimum)</li>
            <li>Don't rely solely on icons to convey important information</li>
            <li>Provide text alternatives when icons are the primary way to understand content</li>
            <li>Make interactive icons large enough for touch interaction (minimum 44px tap target)</li>
          </ul>
        </div>
      </section>
    </div>
  )
}