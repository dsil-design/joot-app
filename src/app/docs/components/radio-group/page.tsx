"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export default function RadioGroupDocumentation() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Radio Group</h1>
        <p className="text-lg text-muted-foreground">
          A set of checkable buttons—known as radio buttons—where no more than one of the buttons can be checked at a time.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Default</h3>
            <ComponentDemo>
              <RadioGroup defaultValue="comfortable">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="default" id="r1" />
                  <Label htmlFor="r1">Default</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="comfortable" id="r2" />
                  <Label htmlFor="r2">Comfortable</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="compact" id="r3" />
                  <Label htmlFor="r3">Compact</Label>
                </div>
              </RadioGroup>
            </ComponentDemo>
            <CodeBlock code={`<RadioGroup defaultValue="comfortable">
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="default" id="r1" />
    <Label htmlFor="r1">Default</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="comfortable" id="r2" />
    <Label htmlFor="r2">Comfortable</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="compact" id="r3" />
    <Label htmlFor="r3">Compact</Label>
  </div>
</RadioGroup>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Form</h3>
            <ComponentDemo>
              <form className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    How do you prefer to receive notifications?
                  </Label>
                  <RadioGroup defaultValue="email" name="notifications">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="email" id="email" />
                      <Label htmlFor="email">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sms" id="sms" />
                      <Label htmlFor="sms">SMS</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="push" id="push" />
                      <Label htmlFor="push">Push notifications</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="none" id="none" />
                      <Label htmlFor="none">None</Label>
                    </div>
                  </RadioGroup>
                </div>
              </form>
            </ComponentDemo>
            <CodeBlock code={`<form className="space-y-6">
  <div className="space-y-3">
    <Label className="text-base font-medium">
      How do you prefer to receive notifications?
    </Label>
    <RadioGroup defaultValue="email" name="notifications">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="email" id="email" />
        <Label htmlFor="email">Email</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="sms" id="sms" />
        <Label htmlFor="sms">SMS</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="push" id="push" />
        <Label htmlFor="push">Push notifications</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="none" id="none" />
        <Label htmlFor="none">None</Label>
      </div>
    </RadioGroup>
  </div>
</form>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Disabled</h3>
            <ComponentDemo>
              <RadioGroup defaultValue="option-one" disabled>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="option-one" id="option-one" />
                  <Label htmlFor="option-one">Option One</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="option-two" id="option-two" />
                  <Label htmlFor="option-two">Option Two</Label>
                </div>
              </RadioGroup>
            </ComponentDemo>
            <CodeBlock code={`<RadioGroup defaultValue="option-one" disabled>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option-one" id="option-one" />
    <Label htmlFor="option-one">Option One</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option-two" id="option-two" />
    <Label htmlFor="option-two">Option Two</Label>
  </div>
</RadioGroup>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage Guidelines</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-green-600">✅ Do</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use when users need to select one option from a list</li>
              <li>Provide clear, descriptive labels for each option</li>
              <li>Group related options together</li>
              <li>Set a sensible default selection when appropriate</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-red-600">❌ Don't</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use for multiple selections (use checkboxes instead)</li>
              <li>Use for binary choices (use a switch or checkbox)</li>
              <li>Include too many options (consider a select dropdown)</li>
              <li>Use without proper labels</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <PropsTable
          data={[
            {
              prop: "value",
              type: "string",
              default: "undefined",
              description: "The controlled value of the radio group."
            },
            {
              prop: "defaultValue",
              type: "string",
              default: "undefined",
              description: "The default value when initially rendered."
            },
            {
              prop: "onValueChange",
              type: "function",
              default: "undefined",
              description: "Event handler called when the value changes."
            },
            {
              prop: "disabled",
              type: "boolean",
              default: "false",
              description: "Whether the radio group is disabled."
            },
            {
              prop: "name",
              type: "string",
              default: "undefined",
              description: "The name of the radio group for form submission."
            }
          ]}
        />
      </section>
    </div>
  )
}
