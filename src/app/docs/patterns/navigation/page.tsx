"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { 
  Home, 
  Settings, 
  User, 
  Bell, 
  Search,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Folder,
  FileText,
  Image as ImageIcon,
  MoreHorizontal,
  Calendar,
  Users,
  BarChart3,
  CreditCard,
  HelpCircle,
  LogOut
} from "lucide-react"
import { useState } from "react"

export default function NavigationPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeAccordion, setActiveAccordion] = useState<string | null>("projects")

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Navigation Patterns</h1>
        <p className="text-lg text-muted-foreground">
          Navigation patterns that help users understand where they are and how to get where they want to go.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Breadcrumb Navigation</h2>
        <p className="text-muted-foreground">
          Show users their current location within a hierarchical structure.
        </p>
        
        <ComponentDemo>
          <div className="space-y-4 w-full">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Simple Breadcrumb</p>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/docs">Documentation</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Navigation Patterns</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-2">With Ellipsis</p>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbEllipsis />
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/docs">Documentation</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/docs/patterns">Patterns</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Navigation</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>
        </ComponentDemo>
        
        <CodeBlock code={`<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/docs">Documentation</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Navigation Patterns</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>`} />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Tab Navigation</h2>
        <p className="text-muted-foreground">
          Organize content into distinct views that users can switch between.
        </p>
        
        <ComponentDemo>
          <Card className="w-full max-w-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Project Dashboard</CardTitle>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
              
              <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                {[
                  { id: "overview", label: "Overview", icon: Home },
                  { id: "analytics", label: "Analytics", icon: BarChart3 },
                  { id: "team", label: "Team", icon: Users },
                  { id: "settings", label: "Settings", icon: Settings }
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeTab === "overview" && (
                  <div>
                    <h3 className="font-semibold mb-2">Project Overview</h3>
                    <p className="text-sm text-muted-foreground">
                      Welcome to your project dashboard. Here you can see an overview of your project's progress and key metrics.
                    </p>
                  </div>
                )}
                {activeTab === "analytics" && (
                  <div>
                    <h3 className="font-semibold mb-2">Analytics</h3>
                    <p className="text-sm text-muted-foreground">
                      View detailed analytics and insights about your project's performance and user engagement.
                    </p>
                  </div>
                )}
                {activeTab === "team" && (
                  <div>
                    <h3 className="font-semibold mb-2">Team Management</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage your team members, their roles, and permissions within the project.
                    </p>
                  </div>
                )}
                {activeTab === "settings" && (
                  <div>
                    <h3 className="font-semibold mb-2">Project Settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure your project settings, integrations, and preferences.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </ComponentDemo>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Sidebar Navigation</h2>
        <p className="text-muted-foreground">
          Persistent navigation sidebar with hierarchical structure and collapsible sections.
        </p>
        
        <ComponentDemo>
          <div className="flex w-full max-w-4xl h-96 border rounded-lg overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-muted/20 border-r flex flex-col">
              {/* Header */}
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">A</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Acme Inc</h3>
                    <p className="text-xs text-muted-foreground">Workspace</p>
                  </div>
                </div>
              </div>
              
              {/* Navigation */}
              <div className="flex-1 overflow-y-auto p-2">
                <nav className="space-y-1">
                  <button className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm hover:bg-muted/50 text-left bg-muted">
                    <Home className="h-4 w-4" />
                    Dashboard
                  </button>
                  
                  <div>
                    <button
                      onClick={() => setActiveAccordion(activeAccordion === "projects" ? null : "projects")}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm hover:bg-muted/50 text-left"
                    >
                      <ChevronRight className={`h-4 w-4 transition-transform ${activeAccordion === "projects" ? "rotate-90" : ""}`} />
                      <Folder className="h-4 w-4" />
                      Projects
                    </button>
                    {activeAccordion === "projects" && (
                      <div className="ml-6 mt-1 space-y-1">
                        <button className="flex items-center gap-3 w-full px-3 py-1.5 rounded-md text-sm hover:bg-muted/50 text-left text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          Website Redesign
                        </button>
                        <button className="flex items-center gap-3 w-full px-3 py-1.5 rounded-md text-sm hover:bg-muted/50 text-left text-muted-foreground">
                          <ImageIcon className="h-3 w-3" />
                          Mobile App
                        </button>
                        <button className="flex items-center gap-3 w-full px-3 py-1.5 rounded-md text-sm hover:bg-muted/50 text-left text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          API Documentation
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <button className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm hover:bg-muted/50 text-left">
                    <Calendar className="h-4 w-4" />
                    Calendar
                  </button>
                  
                  <button className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm hover:bg-muted/50 text-left">
                    <Users className="h-4 w-4" />
                    Team
                    <Badge className="ml-auto h-5 px-1.5 text-xs">3</Badge>
                  </button>
                  
                  <button className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm hover:bg-muted/50 text-left">
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </button>
                  
                  <button className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm hover:bg-muted/50 text-left">
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                </nav>
              </div>
              
              {/* Footer */}
              <div className="p-4 border-t">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">John Doe</p>
                    <p className="text-xs text-muted-foreground truncate">john@acme.com</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold">Dashboard</h1>
                  <p className="text-sm text-muted-foreground">Welcome back to your workspace</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Bell className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              
              {/* Content Area */}
              <div className="flex-1 p-6">
                <div className="text-center py-12">
                  <h2 className="text-lg font-semibold mb-2">Main Content Area</h2>
                  <p className="text-muted-foreground">Your main application content would appear here.</p>
                </div>
              </div>
            </div>
          </div>
        </ComponentDemo>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Mobile Navigation</h2>
        <p className="text-muted-foreground">
          Responsive navigation patterns for mobile devices.
        </p>
        
        <ComponentDemo>
          <div className="w-full max-w-sm mx-auto">
            <div className="bg-background border rounded-lg overflow-hidden h-96">
              {/* Mobile Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
                
                <h1 className="font-semibold">Dashboard</h1>
                
                <Button variant="ghost" size="icon">
                  <Search className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Slide-out Menu */}
              {sidebarOpen && (
                <div className="absolute inset-0 bg-background z-10 flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="font-semibold">Menu</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4">
                    <nav className="space-y-2">
                      <button className="flex items-center gap-3 w-full px-3 py-3 rounded-md text-left hover:bg-muted">
                        <Home className="h-5 w-5" />
                        <span className="font-medium">Dashboard</span>
                      </button>
                      <button className="flex items-center gap-3 w-full px-3 py-3 rounded-md text-left hover:bg-muted">
                        <BarChart3 className="h-5 w-5" />
                        <span className="font-medium">Analytics</span>
                      </button>
                      <button className="flex items-center gap-3 w-full px-3 py-3 rounded-md text-left hover:bg-muted">
                        <Users className="h-5 w-5" />
                        <span className="font-medium">Team</span>
                      </button>
                      <button className="flex items-center gap-3 w-full px-3 py-3 rounded-md text-left hover:bg-muted">
                        <Settings className="h-5 w-5" />
                        <span className="font-medium">Settings</span>
                      </button>
                    </nav>
                  </div>
                  
                  <div className="p-4 border-t">
                    <button className="flex items-center gap-3 w-full px-3 py-3 rounded-md text-left hover:bg-muted text-red-600">
                      <LogOut className="h-5 w-5" />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Content */}
              {!sidebarOpen && (
                <div className="p-4 text-center py-12">
                  <h2 className="text-lg font-semibold mb-2">Mobile View</h2>
                  <p className="text-sm text-muted-foreground">
                    Tap the menu button to see the navigation drawer.
                  </p>
                </div>
              )}
            </div>
            
            {/* Bottom Navigation */}
            <div className="mt-4 bg-background border rounded-lg p-2">
              <div className="flex items-center justify-around">
                <button className="flex flex-col items-center gap-1 p-3 rounded-md text-primary bg-primary/10">
                  <Home className="h-5 w-5" />
                  <span className="text-xs font-medium">Home</span>
                </button>
                <button className="flex flex-col items-center gap-1 p-3 rounded-md text-muted-foreground hover:text-foreground">
                  <BarChart3 className="h-5 w-5" />
                  <span className="text-xs font-medium">Stats</span>
                </button>
                <button className="flex flex-col items-center gap-1 p-3 rounded-md text-muted-foreground hover:text-foreground relative">
                  <Bell className="h-5 w-5" />
                  <span className="text-xs font-medium">Alerts</span>
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></div>
                </button>
                <button className="flex flex-col items-center gap-1 p-3 rounded-md text-muted-foreground hover:text-foreground">
                  <User className="h-5 w-5" />
                  <span className="text-xs font-medium">Profile</span>
                </button>
              </div>
            </div>
          </div>
        </ComponentDemo>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Pagination</h2>
        <p className="text-muted-foreground">
          Navigate through large datasets with clear pagination controls.
        </p>
        
        <ComponentDemo>
          <div className="space-y-6 w-full">
            <div>
              <p className="text-sm text-muted-foreground mb-4">Simple Pagination</p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">1</span> to <span className="font-medium">10</span> of{" "}
                  <span className="font-medium">97</span> results
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button variant="default" size="sm" className="w-8 h-8 p-0">
                      1
                    </Button>
                    <Button variant="outline" size="sm" className="w-8 h-8 p-0">
                      2
                    </Button>
                    <Button variant="outline" size="sm" className="w-8 h-8 p-0">
                      3
                    </Button>
                    <span className="text-muted-foreground px-2">...</span>
                    <Button variant="outline" size="sm" className="w-8 h-8 p-0">
                      10
                    </Button>
                  </div>
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </div>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-4">Load More Pattern</p>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="w-12 h-12 bg-muted rounded-lg"></div>
                        <div className="flex-1">
                          <h4 className="font-medium">Item {item}</h4>
                          <p className="text-sm text-muted-foreground">
                            Description for item {item}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    <div className="text-center pt-4">
                      <Button variant="outline">
                        Load More Items
                      </Button>
                      <p className="text-sm text-muted-foreground mt-2">
                        Showing 3 of 25 items
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </ComponentDemo>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Design Guidelines</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-green-600">Do</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use consistent navigation patterns throughout your app</li>
              <li>Clearly indicate the user's current location</li>
              <li>Provide multiple ways to navigate when appropriate</li>
              <li>Use descriptive labels that users can understand</li>
              <li>Group related navigation items together</li>
              <li>Make navigation predictable and persistent</li>
              <li>Prioritize the most important navigation items</li>
              <li>Test navigation with real users</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-red-600">Don't</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use too many navigation levels or complex hierarchies</li>
              <li>Change navigation patterns between sections</li>
              <li>Hide primary navigation behind hamburger menus on desktop</li>
              <li>Use unclear or ambiguous navigation labels</li>
              <li>Make users click through many levels to reach content</li>
              <li>Overwhelm users with too many navigation options</li>
              <li>Break expected navigation conventions without good reason</li>
              <li>Forget to provide breadcrumbs in deep hierarchies</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            Navigation should be accessible to all users, including those using assistive technologies:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Use semantic HTML elements like <code className="bg-muted px-1 rounded text-sm">nav</code>, <code className="bg-muted px-1 rounded text-sm">ul</code>, and <code className="bg-muted px-1 rounded text-sm">li</code></li>
            <li>Provide ARIA labels for navigation landmarks</li>
            <li>Ensure all navigation is keyboard accessible</li>
            <li>Use proper heading hierarchy for navigation sections</li>
            <li>Provide skip links for screen reader users</li>
            <li>Indicate current page/section with <code className="bg-muted px-1 rounded text-sm">aria-current</code></li>
            <li>Use sufficient color contrast for navigation text</li>
            <li>Don't rely on color alone to indicate navigation states</li>
            <li>Provide focus indicators for all interactive elements</li>
          </ul>
        </div>
      </section>
    </div>
  )
}