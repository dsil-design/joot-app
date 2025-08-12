"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Mail, 
  Phone, 
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Info
} from "lucide-react"
import { useState } from "react"

export default function FormsPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    country: "",
    newsletter: false,
    plan: "free"
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }
    
    if (!formData.firstName) {
      newErrors.firstName = "First name is required"
    }
    
    if (!formData.lastName) {
      newErrors.lastName = "Last name is required"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      // eslint-disable-next-line no-console
      console.log("Form submitted:", formData)
      // Handle successful submission
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Form Patterns</h1>
        <p className="text-lg text-muted-foreground">
          Common form patterns and best practices for creating effective user interfaces.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Basic Form Elements</h2>
        <p className="text-muted-foreground">
          Fundamental form components used to build more complex forms.
        </p>
        
        <ComponentDemo>
          <div className="w-full max-w-sm space-y-4">
            <div className="space-y-2">
              <Label htmlFor="basic-email">Email</Label>
              <Input id="basic-email" type="email" placeholder="Enter your email" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="basic-password">Password</Label>
              <Input id="basic-password" type="password" placeholder="Enter your password" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="basic-select">Country</Label>
              <Select>
                <SelectTrigger id="basic-select">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="uk">United Kingdom</SelectItem>
                  <SelectItem value="ca">Canada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="basic-textarea">Message</Label>
              <Textarea id="basic-textarea" placeholder="Enter your message" />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox id="basic-terms" />
              <Label htmlFor="basic-terms">I agree to the terms and conditions</Label>
            </div>
            
            <Button className="w-full">Submit</Button>
          </div>
        </ComponentDemo>
        
        <CodeBlock code={`<form className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" placeholder="Enter your email" />
  </div>
  
  <div className="space-y-2">
    <Label htmlFor="password">Password</Label>
    <Input id="password" type="password" placeholder="Enter your password" />
  </div>
  
  <div className="space-y-2">
    <Label htmlFor="country">Country</Label>
    <Select>
      <SelectTrigger id="country">
        <SelectValue placeholder="Select your country" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="us">United States</SelectItem>
        <SelectItem value="uk">United Kingdom</SelectItem>
        <SelectItem value="ca">Canada</SelectItem>
      </SelectContent>
    </Select>
  </div>
  
  <div className="space-y-2">
    <Label htmlFor="message">Message</Label>
    <Textarea id="message" placeholder="Enter your message" />
  </div>
  
  <div className="flex items-center space-x-2">
    <Checkbox id="terms" />
    <Label htmlFor="terms">I agree to the terms and conditions</Label>
  </div>
  
  <Button className="w-full">Submit</Button>
</form>`} />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Registration Form</h2>
        <p className="text-muted-foreground">
          A comprehensive user registration form with validation and error handling.
        </p>
        
        <ComponentDemo>
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create Account</CardTitle>
              <CardDescription>
                Enter your information to create a new account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      className={errors.firstName ? "border-destructive" : ""}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.firstName}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      className={errors.lastName ? "border-destructive" : ""}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reg-email"
                      type="email"
                      className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.email}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      className={`pl-10 pr-10 ${errors.password ? "border-destructive" : ""}`}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.password}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    className={errors.confirmPassword ? "border-destructive" : ""}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
                
                <div className="space-y-3">
                  <Label>Choose a plan</Label>
                  <RadioGroup
                    value={formData.plan}
                    onValueChange={(value) => handleInputChange("plan", value)}
                    className="grid grid-cols-1 gap-3"
                  >
                    <div className="flex items-center space-x-3 border rounded-lg p-3">
                      <RadioGroupItem value="free" id="plan-free" />
                      <div className="flex-1">
                        <Label htmlFor="plan-free" className="cursor-pointer">
                          <div className="flex items-center justify-between">
                            <span>Free Plan</span>
                            <Badge variant="secondary">$0</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Basic features</p>
                        </Label>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 border rounded-lg p-3">
                      <RadioGroupItem value="pro" id="plan-pro" />
                      <div className="flex-1">
                        <Label htmlFor="plan-pro" className="cursor-pointer">
                          <div className="flex items-center justify-between">
                            <span>Pro Plan</span>
                            <Badge>$9/month</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Advanced features</p>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="reg-newsletter"
                    checked={formData.newsletter}
                    onCheckedChange={(checked) => handleInputChange("newsletter", !!checked)}
                  />
                  <Label htmlFor="reg-newsletter" className="text-sm">
                    I want to receive newsletters and updates
                  </Label>
                </div>
                
                <Button type="submit" className="w-full">
                  Create Account
                </Button>
              </form>
            </CardContent>
          </Card>
        </ComponentDemo>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Contact Form</h2>
        <p className="text-muted-foreground">
          A simple contact form with proper labeling and structure.
        </p>
        
        <ComponentDemo>
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
              <CardDescription>
                Send us a message and we'll get back to you soon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-first">First Name</Label>
                  <Input id="contact-first" placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-last">Last Name</Label>
                  <Input id="contact-last" placeholder="Doe" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="contact-email"
                    type="email"
                    className="pl-10"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Phone (Optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="contact-phone"
                    type="tel"
                    className="pl-10"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact-subject">Subject</Label>
                <Select>
                  <SelectTrigger id="contact-subject">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Inquiry</SelectItem>
                    <SelectItem value="support">Technical Support</SelectItem>
                    <SelectItem value="billing">Billing Question</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact-message">Message</Label>
                <Textarea
                  id="contact-message"
                  placeholder="Tell us how we can help you..."
                  className="min-h-[100px]"
                />
              </div>
              
              <Button className="w-full">Send Message</Button>
            </CardContent>
          </Card>
        </ComponentDemo>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Form Validation States</h2>
        <p className="text-muted-foreground">
          Different validation states and how to communicate them to users.
        </p>
        
        <ComponentDemo>
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2">
              <Label htmlFor="valid-input">Valid Input</Label>
              <div className="relative">
                <Input
                  id="valid-input"
                  value="john@example.com"
                  className="pr-10 border-green-500"
                  readOnly
                />
                <CheckCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
              </div>
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Email is valid
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="invalid-input">Invalid Input</Label>
              <div className="relative">
                <Input
                  id="invalid-input"
                  value="invalid-email"
                  className="pr-10 border-destructive"
                  readOnly
                />
                <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
              </div>
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Please enter a valid email address
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="warning-input">Warning Input</Label>
              <div className="relative">
                <Input
                  id="warning-input"
                  value="john@domain"
                  className="pr-10 border-yellow-500"
                  readOnly
                />
                <Info className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-yellow-500" />
              </div>
              <p className="text-sm text-yellow-600 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Email domain seems incomplete
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="disabled-input">Disabled Input</Label>
              <Input
                id="disabled-input"
                value="Disabled field"
                disabled
              />
              <p className="text-sm text-muted-foreground">
                This field is currently disabled
              </p>
            </div>
          </div>
        </ComponentDemo>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Form Layout Patterns</h2>
        <p className="text-muted-foreground">
          Different approaches to organizing form fields and content.
        </p>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Single Column Layout</h3>
            <ComponentDemo>
              <Card className="w-full max-w-sm">
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input placeholder="Enter your name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="your@email.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <Textarea placeholder="Tell us about yourself" />
                  </div>
                  <Button className="w-full">Save Changes</Button>
                </CardContent>
              </Card>
            </ComponentDemo>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Two Column Layout</h3>
            <ComponentDemo>
              <Card className="w-full max-w-lg">
                <CardHeader>
                  <CardTitle>Billing Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input placeholder="John" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input placeholder="Doe" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input placeholder="123 Main St" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input placeholder="New York" />
                    </div>
                    <div className="space-y-2">
                      <Label>ZIP Code</Label>
                      <Input placeholder="10001" />
                    </div>
                  </div>
                  
                  <Button className="w-full">Update Billing</Button>
                </CardContent>
              </Card>
            </ComponentDemo>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Form Guidelines</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-green-600">Do</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use clear, descriptive labels for all form fields</li>
              <li>Provide helpful placeholder text and examples</li>
              <li>Group related fields together logically</li>
              <li>Show validation errors near the relevant fields</li>
              <li>Use appropriate input types (email, tel, etc.)</li>
              <li>Make required fields clearly marked</li>
              <li>Provide feedback on form submission status</li>
              <li>Use progressive disclosure for complex forms</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-red-600">Don't</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use placeholder text as the only label</li>
              <li>Make forms unnecessarily long or complex</li>
              <li>Show all validation errors at once</li>
              <li>Use unclear or technical error messages</li>
              <li>Hide important information in tooltips</li>
              <li>Make optional fields look required</li>
              <li>Reset forms after validation errors</li>
              <li>Use too many different input sizes</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            Forms should be accessible to all users, including those using assistive technologies:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Associate labels with form controls using <code className="bg-muted px-1 rounded text-sm">htmlFor</code> and <code className="bg-muted px-1 rounded text-sm">id</code></li>
            <li>Use <code className="bg-muted px-1 rounded text-sm">aria-describedby</code> to associate help text and error messages</li>
            <li>Mark required fields with <code className="bg-muted px-1 rounded text-sm">aria-required="true"</code></li>
            <li>Use <code className="bg-muted px-1 rounded text-sm">aria-invalid="true"</code> for fields with validation errors</li>
            <li>Provide clear instructions and error messages</li>
            <li>Ensure forms are keyboard navigable with logical tab order</li>
            <li>Use appropriate ARIA roles and properties</li>
            <li>Test with screen readers and keyboard-only navigation</li>
          </ul>
        </div>
      </section>
    </div>
  )
}