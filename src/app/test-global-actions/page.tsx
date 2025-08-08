'use client'

import React, { useState } from 'react'
import { useGlobalAction } from '@/contexts/GlobalActionContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

export default function TestGlobalActionsPage() {
  const { isActionInProgress, activeActions, withGlobalAction } = useGlobalAction()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    newsletter: false,
    terms: false
  })
  const [testResults, setTestResults] = useState<string[]>([])

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  const simulateAsyncAction = async (actionName: string, duration: number = 2000) => {
    await withGlobalAction(`test-${actionName}`, async () => {
      addTestResult(`Started ${actionName} (${duration}ms)`)
      await new Promise(resolve => setTimeout(resolve, duration))
      addTestResult(`Completed ${actionName}`)
    })
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await simulateAsyncAction('form-submission', 3000)
  }

  const handleQuickAction = () => {
    simulateAsyncAction('quick-action', 1500)
  }

  const handleLongAction = () => {
    simulateAsyncAction('long-action', 5000)
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="min-h-screen bg-background p-spacing-8">
      <div className="max-w-4xl mx-auto space-y-spacing-8">
        {/* Header */}
        <div className="text-center space-y-spacing-4">
          <h1 className="text-3xl/bold">Global Action State Management Test</h1>
          <p className="text-lg/normal text-muted-foreground">
            Test page to validate global disabling of interactive elements during actions
          </p>
        </div>

        {/* Status Display */}
        <Card className="p-spacing-6">
          <div className="space-y-spacing-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl/semibold">Global Action Status</h2>
              <Badge variant={isActionInProgress ? "destructive" : "default"}>
                {isActionInProgress ? "Action In Progress" : "Ready"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-spacing-4">
              <div>
                <Label className="text-sm/medium">Actions in Progress:</Label>
                <p className="text-base/normal">{activeActions.size}</p>
              </div>
              <div>
                <Label className="text-sm/medium">Active Action IDs:</Label>
                <p className="text-sm/normal text-muted-foreground">
                  {activeActions.size > 0 ? Array.from(activeActions).join(', ') : 'None'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <Card className="p-spacing-6">
          <div className="space-y-spacing-4">
            <h2 className="text-xl/semibold">Test Action Buttons</h2>
            <p className="text-sm/normal text-muted-foreground">
              Click any button to start an action. All other interactive elements should become disabled.
            </p>
            <div className="flex flex-wrap gap-spacing-4">
              <Button onClick={handleQuickAction}>
                Quick Action (1.5s)
              </Button>
              <Button variant="secondary" onClick={handleLongAction}>
                Long Action (5s)
              </Button>
              <Button variant="outline" onClick={() => simulateAsyncAction('instant', 500)}>
                Instant Action (0.5s)
              </Button>
              <Button variant="destructive" onClick={() => simulateAsyncAction('critical', 2500)}>
                Critical Action (2.5s)
              </Button>
            </div>
          </div>
        </Card>

        {/* Interactive Form */}
        <Card className="p-spacing-6">
          <form onSubmit={handleFormSubmit} className="space-y-spacing-6">
            <h2 className="text-xl/semibold">Interactive Form Test</h2>
            <p className="text-sm/normal text-muted-foreground">
              All form elements should be disabled when any action is running.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing-4">
              <div className="space-y-spacing-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your name"
                />
              </div>
              
              <div className="space-y-spacing-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="space-y-spacing-2">
              <Label htmlFor="message">Message</Label>
              <textarea
                id="message"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Enter your message"
              />
            </div>

            <div className="space-y-spacing-4">
              <div className="flex items-center space-x-spacing-2">
                <Checkbox
                  id="newsletter"
                  checked={formData.newsletter}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, newsletter: !!checked }))}
                />
                <Label htmlFor="newsletter">Subscribe to newsletter</Label>
              </div>

              <div className="flex items-center space-x-spacing-2">
                <Switch
                  id="terms"
                  checked={formData.terms}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, terms: checked }))}
                />
                <Label htmlFor="terms">Accept terms and conditions</Label>
              </div>
            </div>

            <div className="flex gap-spacing-4">
              <Button type="submit">
                Submit Form (3s)
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormData({
                name: '',
                email: '',
                message: '',
                newsletter: false,
                terms: false
              })}>
                Clear Form
              </Button>
            </div>
          </form>
        </Card>

        {/* Test Results */}
        <Card className="p-spacing-6">
          <div className="space-y-spacing-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl/semibold">Test Results Log</h2>
              <Button variant="outline" size="sm" onClick={clearResults}>
                Clear Log
              </Button>
            </div>
            
            {testResults.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No test results yet. Click any action button to start testing.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-spacing-2">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm/normal font-mono bg-muted p-spacing-2 rounded">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* QA Checklist */}
        <Card className="p-spacing-6">
          <div className="space-y-spacing-4">
            <h2 className="text-xl/semibold">QA Testing Checklist</h2>
            <div className="space-y-spacing-2 text-sm/normal">
              <div className="flex items-center space-x-spacing-2">
                <Badge variant="outline">✓</Badge>
                <span>All buttons become disabled when any action is running</span>
              </div>
              <div className="flex items-center space-x-spacing-2">
                <Badge variant="outline">✓</Badge>
                <span>All input fields become disabled during actions</span>
              </div>
              <div className="flex items-center space-x-spacing-2">
                <Badge variant="outline">✓</Badge>
                <span>Checkboxes and switches become disabled during actions</span>
              </div>
              <div className="flex items-center space-x-spacing-2">
                <Badge variant="outline">✓</Badge>
                <span>Form submission is blocked during other actions</span>
              </div>
              <div className="flex items-center space-x-spacing-2">
                <Badge variant="outline">✓</Badge>
                <span>Visual feedback shows disabled state (opacity, cursor)</span>
              </div>
              <div className="flex items-center space-x-spacing-2">
                <Badge variant="outline">✓</Badge>
                <span>Multiple concurrent actions are tracked properly</span>
              </div>
            </div>
          </div>
        </Card>

        <Separator />

        {/* Navigation */}
        <div className="text-center space-y-spacing-4">
          <p className="text-sm/normal text-muted-foreground">
            Navigate to other pages to test global action state across the entire app
          </p>
          <div className="flex justify-center gap-spacing-4">
            <Button variant="outline" asChild>
              <a href="/">Home</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/login">Login</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/test-page">Test Page</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/docs">Documentation</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
