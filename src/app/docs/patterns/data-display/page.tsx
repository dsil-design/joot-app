import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  ShoppingCart,
  Activity,
  Calendar,
  ExternalLink,
  MoreHorizontal,
  Eye,
  Download,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from "lucide-react"

const stats = [
  {
    title: "Total Revenue",
    value: "$45,231.89",
    change: "+20.1% from last month",
    trend: "up",
    icon: DollarSign
  },
  {
    title: "Active Users",
    value: "2,350",
    change: "+180.1% from last month",
    trend: "up",
    icon: Users
  },
  {
    title: "Total Orders",
    value: "12,234",
    change: "+19% from last month",
    trend: "up",
    icon: ShoppingCart
  },
  {
    title: "Bounce Rate",
    value: "4.2%",
    change: "-2.1% from last month",
    trend: "down",
    icon: Activity
  }
]

const transactions = [
  {
    id: "1",
    customer: "John Doe",
    email: "john@example.com",
    amount: "$250.00",
    status: "completed",
    date: "2024-01-15",
    avatar: "JD"
  },
  {
    id: "2", 
    customer: "Jane Smith",
    email: "jane@example.com",
    amount: "$150.00",
    status: "pending",
    date: "2024-01-14",
    avatar: "JS"
  },
  {
    id: "3",
    customer: "Bob Wilson",
    email: "bob@example.com", 
    amount: "$350.00",
    status: "failed",
    date: "2024-01-13",
    avatar: "BW"
  },
  {
    id: "4",
    customer: "Alice Brown",
    email: "alice@example.com",
    amount: "$75.00", 
    status: "completed",
    date: "2024-01-12",
    avatar: "AB"
  }
]

const projects = [
  {
    id: 1,
    name: "Website Redesign",
    description: "Complete overhaul of the company website",
    progress: 75,
    status: "In Progress",
    dueDate: "2024-02-15",
    team: ["JD", "JS", "BW"],
    priority: "high"
  },
  {
    id: 2,
    name: "Mobile App",
    description: "iOS and Android mobile application",
    progress: 45,
    status: "In Progress", 
    dueDate: "2024-03-30",
    team: ["AB", "CD"],
    priority: "medium"
  },
  {
    id: 3,
    name: "API Documentation",
    description: "Comprehensive API documentation and examples",
    progress: 90,
    status: "Review",
    dueDate: "2024-01-25",
    team: ["EF"],
    priority: "low"
  }
]

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-500" />
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return <AlertTriangle className="h-4 w-4 text-gray-500" />
  }
}

function StatusBadge({ status }: { status: string }) {
  const variants = {
    completed: "default",
    pending: "outline", 
    failed: "destructive",
    "In Progress": "default",
    "Review": "secondary"
  } as const
  
  return (
    <Badge variant={variants[status as keyof typeof variants] || "outline"}>
      {status}
    </Badge>
  )
}

export default function DataDisplayPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Data Display Patterns</h1>
        <p className="text-lg text-muted-foreground">
          Effective patterns for displaying and organizing data in user interfaces.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Statistics Cards</h2>
        <p className="text-muted-foreground">
          Display key metrics and KPIs with clear visual hierarchy.
        </p>
        
        <ComponentDemo>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 w-full">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      {stat.trend === "up" ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      {stat.change}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ComponentDemo>
        
        <CodeBlock code={`const stats = [
  {
    title: "Total Revenue",
    value: "$45,231.89", 
    change: "+20.1% from last month",
    trend: "up",
    icon: DollarSign
  },
  // ... more stats
]

<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {stats.map((stat, index) => {
    const Icon = stat.icon
    return (
      <Card key={index}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {stat.title}
          </CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stat.value}</div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            {stat.trend === "up" ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            {stat.change}
          </p>
        </CardContent>
      </Card>
    )
  })}
</div>`} />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Data Tables</h2>
        <p className="text-muted-foreground">
          Organized display of tabular data with actions and status indicators.
        </p>
        
        <ComponentDemo>
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                A list of your recent transactions and their status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {transaction.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{transaction.customer}</div>
                            <div className="text-sm text-muted-foreground">
                              {transaction.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {transaction.amount}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon status={transaction.status} />
                          <StatusBadge status={transaction.status} />
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {transaction.date}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </ComponentDemo>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Project Cards</h2>
        <p className="text-muted-foreground">
          Card-based layout for displaying project information with progress indicators.
        </p>
        
        <ComponentDemo>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 w-full">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {project.description}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={project.priority === "high" ? "destructive" : 
                              project.priority === "medium" ? "default" : "secondary"}
                    >
                      {project.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Due {project.dueDate}
                      </span>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {project.team.map((member, index) => (
                        <Avatar key={index} className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className="text-xs">{member}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ComponentDemo>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">List with Details</h2>
        <p className="text-muted-foreground">
          Detailed list view with expandable information and actions.
        </p>
        
        <ComponentDemo>
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage your team members and their permissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  name: "John Doe",
                  email: "john@company.com",
                  role: "Admin",
                  status: "Active",
                  lastSeen: "2 hours ago",
                  avatar: "JD"
                },
                {
                  name: "Jane Smith", 
                  email: "jane@company.com",
                  role: "Developer",
                  status: "Active",
                  lastSeen: "5 minutes ago",
                  avatar: "JS"
                },
                {
                  name: "Bob Wilson",
                  email: "bob@company.com",
                  role: "Designer", 
                  status: "Away",
                  lastSeen: "1 day ago",
                  avatar: "BW"
                }
              ].map((member, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>{member.avatar}</AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{member.name}</h4>
                        <Badge variant={member.status === "Active" ? "default" : "secondary"}>
                          {member.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{member.role}</span>
                        <span>•</span>
                        <span>Last seen {member.lastSeen}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </ComponentDemo>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Empty States</h2>
        <p className="text-muted-foreground">
          How to handle and display empty or no-data states effectively.
        </p>
        
        <ComponentDemo>
          <div className="grid gap-4 md:grid-cols-2 w-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No team members yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  You haven't added any team members to your workspace yet. 
                  Invite colleagues to start collaborating.
                </p>
                <Button>
                  <Users className="h-4 w-4 mr-2" />
                  Invite Team Member
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No activity found</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  There's no recent activity to show. Activity will appear here 
                  once your team starts working on projects.
                </p>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  View All Activity
                </Button>
              </CardContent>
            </Card>
          </div>
        </ComponentDemo>
        
        <CodeBlock code={`function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          {description}
        </p>
        {action}
      </CardContent>
    </Card>
  )
}

<EmptyState
  icon={Users}
  title="No team members yet"
  description="You haven't added any team members to your workspace yet. Invite colleagues to start collaborating."
  action={
    <Button>
      <Users className="h-4 w-4 mr-2" />
      Invite Team Member
    </Button>
  }
/>`} />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Design Guidelines</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-green-600">Do</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use consistent spacing and alignment throughout</li>
              <li>Prioritize the most important information visually</li>
              <li>Group related data together logically</li>
              <li>Use appropriate data types and formatting</li>
              <li>Provide clear visual indicators for status and states</li>
              <li>Include helpful empty states with actionable next steps</li>
              <li>Make data scannable with proper typography hierarchy</li>
              <li>Use progressive disclosure for complex data</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-red-600">Don't</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Overcrowd interfaces with too much data at once</li>
              <li>Use inconsistent data formats or units</li>
              <li>Mix different interaction patterns in the same view</li>
              <li>Leave empty states without explanation or actions</li>
              <li>Use color alone to convey meaning or status</li>
              <li>Make tables too wide for comfortable reading</li>
              <li>Hide important actions in hard-to-find menus</li>
              <li>Use overly complex data visualizations for simple data</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            Data display components should be accessible to all users:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Use proper semantic HTML elements for tables and lists</li>
            <li>Provide meaningful table headers and captions</li>
            <li>Ensure sufficient color contrast for all text and indicators</li>
            <li>Use ARIA labels and descriptions for complex data</li>
            <li>Make interactive elements keyboard accessible</li>
            <li>Provide alternative text for data visualizations</li>
            <li>Use skip links for large data tables</li>
            <li>Test with screen readers and keyboard navigation</li>
            <li>Don't rely solely on color to convey information</li>
          </ul>
        </div>
      </section>
    </div>
  )
}