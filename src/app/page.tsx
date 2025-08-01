"use client";

import React, { useState, useEffect } from "react";
import { CalendarDays, Search, Bell, Settings, Users, FolderOpen, BarChart3, MessageSquare, HelpCircle, Plus, Filter, MoreHorizontal, CheckCircle2, Clock, AlertTriangle, Star, ChevronDown, ChevronRight, Calendar, User, Mail, Phone, MapPin, Zap, Target, TrendingUp, Activity, Download, Upload, Edit, Trash2, Eye, Copy, Share, Lock, Unlock, Home, Briefcase, FileText, Image as ImageIcon, Video, Music, Archive, Bookmark, Heart, ThumbsUp, Flag, Shield, Wifi, Battery, Volume2, Mic, Camera, Printer, Monitor, Smartphone, Tablet, Laptop, Server, Database, Cloud, Globe, Link, Code, Terminal, GitBranch, Package, Layers, Grid, List, LayoutGrid, Sidebar, Menu, X, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, RotateCcw, RefreshCw, Maximize, Minimize, ZoomIn, ZoomOut } from "lucide-react";

// Import all UI components
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger } from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger, MenubarSub, MenubarSubContent, MenubarSubTrigger } from "@/components/ui/menubar";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export default function TaskFlowPro() {
  const [commandOpen, setCommandOpen] = useState(false);
  const [progress, setProgress] = useState(13);
  const [switchStates, setSwitchStates] = useState({
    notifications: true,
    autoSave: true,
  });
  const [selectedPriority, setSelectedPriority] = useState("medium");

  useEffect(() => {
    const timer = setTimeout(() => setProgress(66), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    toast[type](message);
  };

  const teamMembers = [
    { name: "Alice Johnson", role: "Project Manager", status: "online" },
    { name: "Bob Smith", role: "Developer", status: "away" },
    { name: "Carol Davis", role: "Designer", status: "online" },
  ];

  const projects = [
    { id: 1, name: "Website Redesign", progress: 75, priority: "High" },
    { id: 2, name: "Mobile App", progress: 45, priority: "Medium" },
    { id: 3, name: "API Integration", progress: 90, priority: "High" },
  ];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <Toaster />
        
        {/* Command Dialog - Critical Component */}
        <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => showToast("Creating new project...", "info")}>
                <Plus className="mr-2 h-4 w-4" />
                <span>New Project</span>
              </CommandItem>
              <CommandItem onSelect={() => showToast("Opening team view...", "info")}>
                <Users className="mr-2 h-4 w-4" />
                <span>View Team</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>

        {/* Header with Menubar */}
        <header className="border-b bg-card">
          <div className="flex h-16 items-center px-6">
            <h1 className="text-2xl font-bold text-primary">TaskFlow Pro</h1>
            
            <Menubar className="ml-4">
              <MenubarMenu>
                <MenubarTrigger>File</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem onClick={() => showToast("Creating new project...", "info")}>
                    New Project
                  </MenubarItem>
                  <MenubarItem onClick={() => showToast("Opening project...", "info")}>
                    Open Project
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
              <MenubarMenu>
                <MenubarTrigger>View</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem>Grid View</MenubarItem>
                  <MenubarItem>List View</MenubarItem>
                </MenubarContent>
              </MenubarMenu>
            </Menubar>

            <div className="ml-auto flex items-center space-x-4">
              {/* Search Button */}
              <Button variant="outline" onClick={() => setCommandOpen(true)}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>

              {/* Notifications Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="h-4 w-4" />
                    <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs">3</Badge>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <h4 className="font-medium">Notifications</h4>
                    <div className="space-y-2">
                      <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription>Task completed successfully</AlertDescription>
                      </Alert>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>John Doe</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => showToast("Opening profile...", "info")}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => showToast("Opening settings...", "info")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar with ScrollArea */}
          <aside className="w-64 border-r bg-card h-[calc(100vh-4rem)]">
            <ScrollArea className="h-full">
              <div className="p-6">
                <nav className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start">
                    <Home className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Projects
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Team
                  </Button>
                </nav>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Recent</h3>
                  {projects.map((project) => (
                    <Button key={project.id} variant="ghost" size="sm" className="w-full justify-start h-8">
                      <div className="w-2 h-2 rounded-full bg-primary mr-2" />
                      <span className="truncate">{project.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
              {/* Breadcrumb */}
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Overview</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              {/* Alert */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>System Maintenance</AlertTitle>
                <AlertDescription>
                  Scheduled maintenance tonight from 2:00 AM to 4:00 AM EST.
                </AlertDescription>
              </Alert>

              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">12</div>
                    <Progress value={75} className="mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">47</div>
                    <Progress value={progress} className="mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">8</div>
                    <Progress value={90} className="mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completion</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">87%</div>
                    <Progress value={87} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="forms">Forms</TabsTrigger>
                  <TabsTrigger value="team">Team</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Button Variants</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => showToast("Primary clicked!", "success")}>Primary</Button>
                          <Button variant="secondary" onClick={() => showToast("Secondary clicked!", "info")}>Secondary</Button>
                          <Button variant="destructive" onClick={() => showToast("Destructive clicked!", "error")}>Destructive</Button>
                          <Button variant="outline">Outline</Button>
                          <Button variant="ghost">Ghost</Button>
                          <Button variant="link">Link</Button>
                        </div>
                        <Separator />
                        <div className="flex items-center space-x-4">
                          <Label>Priority:</Label>
                          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <Badge variant={selectedPriority === "high" ? "destructive" : "default"}>
                            {selectedPriority}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Team Members</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {teamMembers.map((member, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.role}</p>
                            </div>
                            <Badge variant={member.status === 'online' ? 'default' : 'secondary'}>
                              {member.status}
                            </Badge>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Mail className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Send email to {member.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="forms" className="space-y-4">
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Input Components</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="text">Text Input</Label>
                          <Input id="text" placeholder="Enter text..." />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" placeholder="user@example.com" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="message">Message</Label>
                          <Textarea id="message" placeholder="Your message..." />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Selection Components</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Tasks</Label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox id="task1" defaultChecked />
                              <Label htmlFor="task1">Design system</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="task2" />
                              <Label htmlFor="task2">API testing</Label>
                            </div>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <RadioGroup defaultValue="active">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="active" id="active" />
                              <Label htmlFor="active">Active</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="inactive" id="inactive" />
                              <Label htmlFor="inactive">Inactive</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="team" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold">Team Management</h2>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" />Add Member</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Team Member</DialogTitle>
                          <DialogDescription>Invite a new team member.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" placeholder="Full name" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="Email address" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={() => showToast("Member invited!", "success")}>Send Invitation</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive email updates</p>
                        </div>
                        <Switch 
                          checked={switchStates.notifications}
                          onCheckedChange={(checked) => {
                            setSwitchStates(prev => ({...prev, notifications: checked}));
                            showToast(`Notifications ${checked ? 'enabled' : 'disabled'}`, "success");
                          }}
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Auto-save</Label>
                          <p className="text-sm text-muted-foreground">Save changes automatically</p>
                        </div>
                        <Switch 
                          checked={switchStates.autoSave}
                          onCheckedChange={(checked) => {
                            setSwitchStates(prev => ({...prev, autoSave: checked}));
                            showToast(`Auto-save ${checked ? 'enabled' : 'disabled'}`, "success");
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
