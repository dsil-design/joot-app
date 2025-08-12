"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

export default function ProgressPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Progress</h1>
        <p className="text-lg text-muted-foreground">
          Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Basic Progress</h3>
            <ComponentDemo>
              <div className="space-y-4 w-full max-w-md">
                <Progress value={33} />
                <Progress value={66} />
                <Progress value={100} />
              </div>
            </ComponentDemo>
            <CodeBlock code={`<Progress value={33} />
<Progress value={66} />
<Progress value={100} />`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Labels</h3>
            <ComponentDemo>
              <ProgressWithLabelsExample />
            </ComponentDemo>
            <CodeBlock code={`function ProgressWithLabelsExample() {
  const [progress, setProgress] = useState(45)

  return (
    <div className="space-y-4 w-full max-w-md">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Upload Progress</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>
      
      <div className="space-y-2">
        <Label>Download Progress (75%)</Label>
        <Progress value={75} />
        <p className="text-xs text-muted-foreground">3 of 4 files completed</p>
      </div>
    </div>
  )
}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Animated Progress</h3>
            <ComponentDemo>
              <AnimatedProgressExample />
            </ComponentDemo>
            <CodeBlock code={`function AnimatedProgressExample() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setProgress(66), 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="space-y-4 w-full max-w-md">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Loading...</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="transition-all duration-1000" />
      </div>
      
      <Button 
        onClick={() => setProgress(progress >= 100 ? 0 : progress + 20)}
        size="sm"
      >
        {progress >= 100 ? 'Reset' : 'Increase'}
      </Button>
    </div>
  )
}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Indeterminate Progress</h3>
            <ComponentDemo>
              <IndeterminateProgressExample />
            </ComponentDemo>
            <CodeBlock code={`function IndeterminateProgressExample() {
  const [isLoading, setIsLoading] = useState(false)

  const startLoading = async () => {
    setIsLoading(true)
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 3000))
    setIsLoading(false)
  }

  return (
    <div className="space-y-4 w-full max-w-md">
      <div className="space-y-2">
        <Label>Processing...</Label>
        <div className="relative">
          <Progress value={isLoading ? undefined : 0} />
          {isLoading && (
            <div 
              className="absolute top-0 left-0 h-full bg-primary rounded-full animate-pulse"
              style={{ width: '30%', animation: 'progress-indeterminate 2s infinite' }}
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {isLoading ? 'Please wait...' : 'Ready to start'}
        </p>
      </div>
      
      <Button onClick={startLoading} disabled={isLoading} size="sm">
        {isLoading ? 'Processing...' : 'Start Process'}
      </Button>

      <style jsx>{\`
        @keyframes progress-indeterminate {
          0% { left: -30%; }
          100% { left: 100%; }
        }
      \`}</style>
    </div>
  )
}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Multi-step Progress</h3>
            <ComponentDemo>
              <MultiStepProgressExample />
            </ComponentDemo>
            <CodeBlock code={`function MultiStepProgressExample() {
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4
  const progress = (currentStep / totalSteps) * 100

  const steps = [
    'Personal Info',
    'Contact Details', 
    'Preferences',
    'Review & Submit'
  ]

  return (
    <div className="space-y-4 w-full max-w-md">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
        <p className="text-sm font-medium">{steps[currentStep - 1]}</p>
      </div>
      
      <div className="flex gap-2">
        <Button 
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          variant="outline"
          size="sm"
        >
          Previous
        </Button>
        <Button 
          onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
          disabled={currentStep === totalSteps}
          size="sm"
        >
          Next
        </Button>
      </div>
    </div>
  )
}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">File Upload Progress</h3>
            <ComponentDemo>
              <FileUploadProgressExample />
            </ComponentDemo>
            <CodeBlock code={`function FileUploadProgressExample() {
  const [uploads, setUploads] = useState([
    { id: 1, name: 'document.pdf', progress: 100, status: 'completed' },
    { id: 2, name: 'image.jpg', progress: 75, status: 'uploading' },
    { id: 3, name: 'video.mp4', progress: 0, status: 'pending' },
  ])

  const simulateUpload = (id: number) => {
    setUploads(prev => prev.map(upload => 
      upload.id === id 
        ? { ...upload, status: 'uploading', progress: 0 }
        : upload
    ))

    const interval = setInterval(() => {
      setUploads(prev => prev.map(upload => {
        if (upload.id === id && upload.progress < 100) {
          const newProgress = Math.min(100, upload.progress + Math.random() * 20)
          return {
            ...upload,
            progress: newProgress,
            status: newProgress >= 100 ? 'completed' : 'uploading'
          }
        }
        return upload
      }))
    }, 300)

    setTimeout(() => clearInterval(interval), 5000)
  }

  return (
    <div className="space-y-3 w-full max-w-md">
      {uploads.map((upload) => (
        <div key={upload.id} className="space-y-2 p-3 border rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium truncate">{upload.name}</span>
            <span className="text-xs text-muted-foreground">
              {upload.status === 'completed' ? 'Done' : upload.status === 'uploading' ? \`\${Math.round(upload.progress)}%\` : 'Pending'}
            </span>
          </div>
          <Progress 
            value={upload.progress} 
            className={cn(
              "h-1",
              upload.status === 'completed' && "bg-green-200",
              upload.status === 'uploading' && "bg-blue-200"
            )}
          />
          {upload.status === 'pending' && (
            <Button 
              onClick={() => simulateUpload(upload.id)}
              size="sm"
              variant="outline"
              className="w-full h-6 text-xs"
            >
              Start Upload
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Colored Variants</h3>
            <ComponentDemo>
              <div className="space-y-4 w-full max-w-md">
                <div className="space-y-2">
                  <Label>Default Progress</Label>
                  <Progress value={60} />
                </div>
                
                <div className="space-y-2">
                  <Label>Success Progress</Label>
                  <Progress 
                    value={80} 
                    className="[&>div]:bg-green-500" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Warning Progress</Label>
                  <Progress 
                    value={40} 
                    className="[&>div]:bg-yellow-500" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Error Progress</Label>
                  <Progress 
                    value={25} 
                    className="[&>div]:bg-red-500" 
                  />
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<!-- Success -->
<Progress 
  value={80} 
  className="[&>div]:bg-green-500" 
/>

<!-- Warning -->
<Progress 
  value={40} 
  className="[&>div]:bg-yellow-500" 
/>

<!-- Error -->
<Progress 
  value={25} 
  className="[&>div]:bg-red-500" 
/>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Different Sizes</h3>
            <ComponentDemo>
              <div className="space-y-4 w-full max-w-md">
                <div className="space-y-2">
                  <Label>Small (h-1)</Label>
                  <Progress value={60} className="h-1" />
                </div>
                
                <div className="space-y-2">
                  <Label>Default (h-2)</Label>
                  <Progress value={60} />
                </div>
                
                <div className="space-y-2">
                  <Label>Large (h-3)</Label>
                  <Progress value={60} className="h-3" />
                </div>
                
                <div className="space-y-2">
                  <Label>Extra Large (h-4)</Label>
                  <Progress value={60} className="h-4" />
                </div>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<!-- Small -->
<Progress value={60} className="h-1" />

<!-- Default -->
<Progress value={60} />

<!-- Large -->
<Progress value={60} className="h-3" />

<!-- Extra Large -->
<Progress value={60} className="h-4" />`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add progress"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import { Progress } from "@/components/ui/progress"

export function Example() {
  return <Progress value={33} />
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <PropsTable
          data={[
            {
              prop: "value",
              type: "number",
              description: "The progress value between 0 and 100.",
            },
            {
              prop: "max",
              type: "number",
              default: "100",
              description: "The maximum progress value.",
            },
            {
              prop: "getValueLabel",
              type: "(value: number, max: number) => string",
              description: "A function to get the accessible label text representing the current value.",
            },
            {
              prop: "className",
              type: "string",
              description: "Additional CSS class names to apply to the progress bar.",
            },
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Design Guidelines</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2 text-green-600">Do</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use progress bars for tasks with known duration or completion percentage</li>
              <li>Include percentage or step indicators when helpful</li>
              <li>Use appropriate colors to indicate different states (success, warning, error)</li>
              <li>Provide clear labels describing what is progressing</li>
              <li>Use indeterminate progress for unknown durations</li>
              <li>Keep progress updates smooth and responsive</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2 text-red-600">Don't</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use progress bars for instant operations</li>
              <li>Make progress bars too small to see clearly</li>
              <li>Use misleading progress values or fake progress</li>
              <li>Hide important error states behind generic progress</li>
              <li>Use progress bars without any context or labels</li>
              <li>Make progress bars jump backwards unexpectedly</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            The Progress component follows WAI-ARIA progressbar pattern and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Proper ARIA attributes (role="progressbar", aria-valuemin, aria-valuemax, aria-valuenow)</li>
            <li>Screen reader announcements for progress updates</li>
            <li>Support for custom value label functions</li>
            <li>Keyboard navigation compatibility</li>
            <li>High contrast support for better visibility</li>
            <li>Semantic HTML structure for assistive technologies</li>
          </ul>
        </div>
      </section>
    </div>
  )
}

function ProgressWithLabelsExample() {
  const progress = 45

  return (
    <div className="space-y-4 w-full max-w-md">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Upload Progress</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>
      
      <div className="space-y-2">
        <Label>Download Progress (75%)</Label>
        <Progress value={75} />
        <p className="text-xs text-muted-foreground">3 of 4 files completed</p>
      </div>
    </div>
  )
}

function AnimatedProgressExample() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setProgress(66), 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="space-y-4 w-full max-w-md">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Loading...</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="transition-all duration-1000" />
      </div>
      
      <Button 
        onClick={() => setProgress(progress >= 100 ? 0 : progress + 20)}
        size="sm"
      >
        {progress >= 100 ? 'Reset' : 'Increase'}
      </Button>
    </div>
  )
}

function IndeterminateProgressExample() {
  const [isLoading, setIsLoading] = useState(false)

  const startLoading = async () => {
    setIsLoading(true)
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 3000))
    setIsLoading(false)
  }

  return (
    <div className="space-y-4 w-full max-w-md">
      <div className="space-y-2">
        <Label>Processing...</Label>
        <div className="relative">
          <Progress value={isLoading ? undefined : 0} />
          {isLoading && (
            <div 
              className="absolute top-0 left-0 h-full bg-primary rounded-full animate-pulse"
              style={{ width: '30%', animation: 'progress-indeterminate 2s infinite' }}
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {isLoading ? 'Please wait...' : 'Ready to start'}
        </p>
      </div>
      
      <Button onClick={startLoading} disabled={isLoading} size="sm">
        {isLoading ? 'Processing...' : 'Start Process'}
      </Button>

      <style jsx>{`
        @keyframes progress-indeterminate {
          0% { left: -30%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  )
}

function MultiStepProgressExample() {
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4
  const progress = (currentStep / totalSteps) * 100

  const steps = [
    'Personal Info',
    'Contact Details', 
    'Preferences',
    'Review & Submit'
  ]

  return (
    <div className="space-y-4 w-full max-w-md">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
        <p className="text-sm font-medium">{steps[currentStep - 1]}</p>
      </div>
      
      <div className="flex gap-2">
        <Button 
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          variant="outline"
          size="sm"
        >
          Previous
        </Button>
        <Button 
          onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
          disabled={currentStep === totalSteps}
          size="sm"
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function FileUploadProgressExample() {
  const [uploads, setUploads] = useState([
    { id: 1, name: 'document.pdf', progress: 100, status: 'completed' },
    { id: 2, name: 'image.jpg', progress: 75, status: 'uploading' },
    { id: 3, name: 'video.mp4', progress: 0, status: 'pending' },
  ])

  const simulateUpload = (id: number) => {
    setUploads(prev => prev.map(upload => 
      upload.id === id 
        ? { ...upload, status: 'uploading', progress: 0 }
        : upload
    ))

    const interval = setInterval(() => {
      setUploads(prev => prev.map(upload => {
        if (upload.id === id && upload.progress < 100) {
          const newProgress = Math.min(100, upload.progress + Math.random() * 20)
          return {
            ...upload,
            progress: newProgress,
            status: newProgress >= 100 ? 'completed' : 'uploading'
          }
        }
        return upload
      }))
    }, 300)

    setTimeout(() => clearInterval(interval), 5000)
  }

  return (
    <div className="space-y-3 w-full max-w-md">
      {uploads.map((upload) => (
        <div key={upload.id} className="space-y-2 p-3 border rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium truncate">{upload.name}</span>
            <span className="text-xs text-muted-foreground">
              {upload.status === 'completed' ? 'Done' : upload.status === 'uploading' ? `${Math.round(upload.progress)}%` : 'Pending'}
            </span>
          </div>
          <Progress 
            value={upload.progress} 
            className={cn(
              "h-1",
              upload.status === 'completed' && "bg-green-200",
              upload.status === 'uploading' && "bg-blue-200"
            )}
          />
          {upload.status === 'pending' && (
            <Button 
              onClick={() => simulateUpload(upload.id)}
              size="sm"
              variant="outline"
              className="w-full h-6 text-xs"
            >
              Start Upload
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}