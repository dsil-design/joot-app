"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Shield, 
  Eye, 
  Moon, 
  Sun, 
  Wifi,
  Bluetooth,
  Globe,
  Lock
} from "lucide-react"
import { useState } from "react"

export default function SwitchPage() {
  const [notifications, setNotifications] = useState(true)
  const [emails, setEmails] = useState(false)
  const [messages, setMessages] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [wifi, setWifi] = useState(true)
  const [bluetooth, setBluetooth] = useState(false)

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Switch</h1>
        <p className="text-lg text-muted-foreground">
          A control that allows the user to toggle between checked and not checked.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Basic Switch</h3>
            <ComponentDemo>
              <div className="flex items-center space-x-2">
                <Switch id="airplane-mode" />
                <Label htmlFor="airplane-mode">Airplane Mode</Label>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="flex items-center space-x-2">
  <Switch id="airplane-mode" />
  <Label htmlFor="airplane-mode">Airplane Mode</Label>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Labels</h3>
            <ComponentDemo>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications" className="text-sm font-medium">
                    Push notifications
                  </Label>
                  <Switch 
                    id="notifications" 
                    checked={notifications}
                    onCheckedChange={setNotifications}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-notifications" className="text-sm font-medium">
                    Email notifications
                  </Label>
                  <Switch 
                    id="email-notifications" 
                    checked={emails}
                    onCheckedChange={setEmails}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="message-notifications" className="text-sm font-medium">
                    Message notifications
                  </Label>
                  <Switch 
                    id="message-notifications" 
                    checked={messages}
                    onCheckedChange={setMessages}
                  />
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`const [notifications, setNotifications] = useState(true)
const [emails, setEmails] = useState(false)
const [messages, setMessages] = useState(true)

<div className="space-y-4">
  <div className="flex items-center justify-between">
    <Label htmlFor="notifications" className="text-sm font-medium">
      Push notifications
    </Label>
    <Switch 
      id="notifications" 
      checked={notifications}
      onCheckedChange={setNotifications}
    />
  </div>
  <div className="flex items-center justify-between">
    <Label htmlFor="email-notifications" className="text-sm font-medium">
      Email notifications
    </Label>
    <Switch 
      id="email-notifications" 
      checked={emails}
      onCheckedChange={setEmails}
    />
  </div>
  <div className="flex items-center justify-between">
    <Label htmlFor="message-notifications" className="text-sm font-medium">
      Message notifications
    </Label>
    <Switch 
      id="message-notifications" 
      checked={messages}
      onCheckedChange={setMessages}
    />
  </div>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Disabled States</h3>
            <ComponentDemo>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch id="disabled-off" disabled />
                  <Label htmlFor="disabled-off" className="text-sm opacity-50">
                    Disabled (off)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="disabled-on" disabled defaultChecked />
                  <Label htmlFor="disabled-on" className="text-sm opacity-50">
                    Disabled (on)
                  </Label>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="space-y-4">
  <div className="flex items-center space-x-2">
    <Switch id="disabled-off" disabled />
    <Label htmlFor="disabled-off" className="text-sm opacity-50">
      Disabled (off)
    </Label>
  </div>
  <div className="flex items-center space-x-2">
    <Switch id="disabled-on" disabled defaultChecked />
    <Label htmlFor="disabled-on" className="text-sm opacity-50">
      Disabled (on)
    </Label>
  </div>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Icons and Descriptions</h3>
            <ComponentDemo>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label htmlFor="push-notifications" className="text-sm font-medium">
                        Push notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Receive notifications about activity on your account
                      </p>
                    </div>
                  </div>
                  <Switch 
                    id="push-notifications" 
                    checked={notifications}
                    onCheckedChange={setNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label htmlFor="email-alerts" className="text-sm font-medium">
                        Email alerts
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Get email updates about your projects and team activity
                      </p>
                    </div>
                  </div>
                  <Switch 
                    id="email-alerts" 
                    checked={emails}
                    onCheckedChange={setEmails}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label htmlFor="chat-notifications" className="text-sm font-medium">
                        Chat notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Receive notifications when someone sends you a message
                      </p>
                    </div>
                  </div>
                  <Switch 
                    id="chat-notifications" 
                    checked={messages}
                    onCheckedChange={setMessages}
                  />
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="space-y-6">
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-3">
      <Bell className="h-5 w-5 text-muted-foreground" />
      <div>
        <Label htmlFor="push-notifications" className="text-sm font-medium">
          Push notifications
        </Label>
        <p className="text-xs text-muted-foreground">
          Receive notifications about activity on your account
        </p>
      </div>
    </div>
    <Switch 
      id="push-notifications" 
      checked={notifications}
      onCheckedChange={setNotifications}
    />
  </div>

  {/* More notification options... */}
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Settings Card</h3>
            <ComponentDemo>
              <Card className="w-[400px]">
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>
                    Manage your notification preferences and stay updated.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Communication</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm">Email notifications</Label>
                          <div className="text-xs text-muted-foreground">
                            Receive email about your account activity
                          </div>
                        </div>
                        <Switch 
                          checked={emails}
                          onCheckedChange={setEmails}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm">Push notifications</Label>
                          <div className="text-xs text-muted-foreground">
                            Receive push notifications on your devices
                          </div>
                        </div>
                        <Switch 
                          checked={notifications}
                          onCheckedChange={setNotifications}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Appearance</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                        <Label className="text-sm">Dark mode</Label>
                        <Badge variant="secondary" className="text-xs">
                          {darkMode ? "On" : "Off"}
                        </Badge>
                      </div>
                      <Switch 
                        checked={darkMode}
                        onCheckedChange={setDarkMode}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ComponentDemo>
            <CodeBlock code={`<Card className="w-[400px]">
  <CardHeader>
    <CardTitle>Notification Settings</CardTitle>
    <CardDescription>
      Manage your notification preferences and stay updated.
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-6">
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Communication</h4>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm">Email notifications</Label>
            <div className="text-xs text-muted-foreground">
              Receive email about your account activity
            </div>
          </div>
          <Switch 
            checked={emails}
            onCheckedChange={setEmails}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm">Push notifications</Label>
            <div className="text-xs text-muted-foreground">
              Receive push notifications on your devices
            </div>
          </div>
          <Switch 
            checked={notifications}
            onCheckedChange={setNotifications}
          />
        </div>
      </div>
    </div>
    
    <Separator />
    
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Appearance</h4>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          <Label className="text-sm">Dark mode</Label>
          <Badge variant="secondary" className="text-xs">
            {darkMode ? "On" : "Off"}
          </Badge>
        </div>
        <Switch 
          checked={darkMode}
          onCheckedChange={setDarkMode}
        />
      </div>
    </div>
  </CardContent>
</Card>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">System Settings</h3>
            <ComponentDemo>
              <div className="max-w-md space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center">
                    <Wifi className="h-4 w-4 mr-2" />
                    Network & Connectivity
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Wi-Fi</Label>
                        <div className="text-xs text-muted-foreground">
                          {wifi ? "Connected to MyNetwork" : "Disconnected"}
                        </div>
                      </div>
                      <Switch 
                        checked={wifi}
                        onCheckedChange={setWifi}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Bluetooth</Label>
                        <div className="text-xs text-muted-foreground">
                          {bluetooth ? "Available for pairing" : "Off"}
                        </div>
                      </div>
                      <Switch 
                        checked={bluetooth}
                        onCheckedChange={setBluetooth}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Privacy & Security
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Location services</Label>
                        <div className="text-xs text-muted-foreground">
                          Allow apps to use your location
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Analytics</Label>
                        <div className="text-xs text-muted-foreground">
                          Share usage data to improve the experience
                        </div>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Two-factor authentication</Label>
                        <div className="text-xs text-muted-foreground">
                          Add an extra layer of security
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="max-w-md space-y-6">
  <div>
    <h4 className="text-sm font-medium mb-3 flex items-center">
      <Wifi className="h-4 w-4 mr-2" />
      Network & Connectivity
    </h4>
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm">Wi-Fi</Label>
          <div className="text-xs text-muted-foreground">
            {wifi ? "Connected to MyNetwork" : "Disconnected"}
          </div>
        </div>
        <Switch 
          checked={wifi}
          onCheckedChange={setWifi}
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm">Bluetooth</Label>
          <div className="text-xs text-muted-foreground">
            {bluetooth ? "Available for pairing" : "Off"}
          </div>
        </div>
        <Switch 
          checked={bluetooth}
          onCheckedChange={setBluetooth}
        />
      </div>
    </div>
  </div>

  <Separator />

  <div>
    <h4 className="text-sm font-medium mb-3 flex items-center">
      <Shield className="h-4 w-4 mr-2" />
      Privacy & Security
    </h4>
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm">Location services</Label>
          <div className="text-xs text-muted-foreground">
            Allow apps to use your location
          </div>
        </div>
        <Switch defaultChecked />
      </div>
      {/* More privacy settings... */}
    </div>
  </div>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Form Integration</h3>
            <ComponentDemo>
              <form className="space-y-6 max-w-sm">
                <div>
                  <Label className="text-base font-medium">Preferences</Label>
                  <div className="space-y-4 mt-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="marketing-emails" className="text-sm">
                        Marketing emails
                      </Label>
                      <Switch id="marketing-emails" name="marketing-emails" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="product-updates" className="text-sm">
                        Product updates
                      </Label>
                      <Switch id="product-updates" name="product-updates" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="newsletter" className="text-sm">
                        Newsletter subscription
                      </Label>
                      <Switch id="newsletter" name="newsletter" />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-base font-medium">Account</Label>
                  <div className="space-y-4 mt-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="profile-visible" className="text-sm">
                        Public profile
                      </Label>
                      <Switch id="profile-visible" name="profile-visible" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="activity-status" className="text-sm">
                        Show activity status
                      </Label>
                      <Switch id="activity-status" name="activity-status" />
                    </div>
                  </div>
                </div>
              </form>
            </ComponentDemo>
            <CodeBlock code={`<form className="space-y-6 max-w-sm">
  <div>
    <Label className="text-base font-medium">Preferences</Label>
    <div className="space-y-4 mt-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="marketing-emails" className="text-sm">
          Marketing emails
        </Label>
        <Switch id="marketing-emails" name="marketing-emails" />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="product-updates" className="text-sm">
          Product updates
        </Label>
        <Switch id="product-updates" name="product-updates" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="newsletter" className="text-sm">
          Newsletter subscription
        </Label>
        <Switch id="newsletter" name="newsletter" />
      </div>
    </div>
  </div>
  
  <Separator />
  
  <div>
    <Label className="text-base font-medium">Account</Label>
    <div className="space-y-4 mt-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="profile-visible" className="text-sm">
          Public profile
        </Label>
        <Switch id="profile-visible" name="profile-visible" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="activity-status" className="text-sm">
          Show activity status
        </Label>
        <Switch id="activity-status" name="activity-status" />
      </div>
    </div>
  </div>
</form>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add switch"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import { Switch } from "@/components/ui/switch"

export function Example() {
  return (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Airplane Mode</Label>
    </div>
  )
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Switch</h3>
            <PropsTable
              data={[
                {
                  prop: "checked",
                  type: "boolean",
                  description: "The controlled checked state of the switch.",
                },
                {
                  prop: "defaultChecked",
                  type: "boolean",
                  description: "The default checked state when initially rendered.",
                },
                {
                  prop: "onCheckedChange",
                  type: "(checked: boolean) => void",
                  description: "Event handler called when the checked state of the switch changes.",
                },
                {
                  prop: "disabled",
                  type: "boolean",
                  default: "false",
                  description: "When true, prevents the user from interacting with the switch.",
                },
                {
                  prop: "required",
                  type: "boolean",
                  default: "false",
                  description: "When true, indicates that the user must check the switch before the form can be submitted.",
                },
                {
                  prop: "name",
                  type: "string",
                  description: "The name of the switch. Submitted with its owning form as part of a name/value pair.",
                },
                {
                  prop: "value",
                  type: "string",
                  default: "'on'",
                  description: "The value given as data when submitted with a name.",
                },
                {
                  prop: "id",
                  type: "string",
                  description: "The id of the switch. Used to associate with a Label.",
                },
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the switch.",
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
            The Switch component follows WAI-ARIA switch pattern and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Full keyboard navigation support (Space to toggle, Tab to navigate)</li>
            <li>Screen reader announcements for checked/unchecked states</li>
            <li>Proper ARIA attributes and roles</li>
            <li>Focus management and visual focus indicators</li>
            <li>Support for disabled state with appropriate styling</li>
            <li>Form integration with name/value pairs for form submission</li>
            <li>Label association through htmlFor/id attributes</li>
          </ul>
        </div>
      </section>
    </div>
  )
}