"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function TextareaDocumentation() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Textarea</h1>
        <p className="text-lg text-muted-foreground">
          Displays a form textarea or a component that looks like a textarea.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Default</h3>
            <ComponentDemo>
              <Textarea placeholder="Type your message here." />
            </ComponentDemo>
            <CodeBlock code={`<Textarea placeholder="Type your message here." />`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Disabled</h3>
            <ComponentDemo>
              <Textarea placeholder="Type your message here." disabled />
            </ComponentDemo>
            <CodeBlock code={`<Textarea placeholder="Type your message here." disabled />`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Label</h3>
            <ComponentDemo>
              <div className="grid w-full gap-1.5">
                <Label htmlFor="message">Your message</Label>
                <Textarea placeholder="Type your message here." id="message" />
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="grid w-full gap-1.5">
  <Label htmlFor="message">Your message</Label>
  <Textarea placeholder="Type your message here." id="message" />
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Text</h3>
            <ComponentDemo>
              <div className="grid w-full gap-1.5">
                <Label htmlFor="message-2">Your Message</Label>
                <Textarea placeholder="Type your message here." id="message-2" />
                <p className="text-sm text-muted-foreground">
                  Your message will be copied to the support team.
                </p>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="grid w-full gap-1.5">
  <Label htmlFor="message-2">Your Message</Label>
  <Textarea placeholder="Type your message here." id="message-2" />
  <p className="text-sm text-muted-foreground">
    Your message will be copied to the support team.
  </p>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Button</h3>
            <ComponentDemo>
              <div className="grid w-full gap-2">
                <Textarea placeholder="Type your message here." />
                <Button>Send message</Button>
              </div>
            </ComponentDemo>
            <CodeBlock code={`<div className="grid w-full gap-2">
  <Textarea placeholder="Type your message here." />
  <Button>Send message</Button>
</div>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Form</h3>
            <ComponentDemo>
              <form className="space-y-4">
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="feedback">Feedback</Label>
                  <Textarea
                    placeholder="Tell us what you think..."
                    id="feedback"
                    rows={4}
                  />
                  <p className="text-sm text-muted-foreground">
                    We appreciate your feedback to help us improve.
                  </p>
                </div>
                <Button type="submit">Submit Feedback</Button>
              </form>
            </ComponentDemo>
            <CodeBlock code={`<form className="space-y-4">
  <div className="grid w-full gap-1.5">
    <Label htmlFor="feedback">Feedback</Label>
    <Textarea
      placeholder="Tell us what you think..."
      id="feedback"
      rows={4}
    />
    <p className="text-sm text-muted-foreground">
      We appreciate your feedback to help us improve.
    </p>
  </div>
  <Button type="submit">Submit Feedback</Button>
</form>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage Guidelines</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-green-600">✅ Do</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use for multi-line text input</li>
              <li>Provide clear placeholder text</li>
              <li>Set appropriate rows attribute for expected content length</li>
              <li>Include helpful description text when needed</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-red-600">❌ Don't</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use for single-line input (use Input instead)</li>
              <li>Make the textarea too small for the expected content</li>
              <li>Forget to provide labels for accessibility</li>
              <li>Use without proper form validation when required</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <PropsTable
          data={[
            {
              prop: "placeholder",
              type: "string",
              default: "undefined",
              description: "Placeholder text for the textarea."
            },
            {
              prop: "disabled",
              type: "boolean",
              default: "false",
              description: "Whether the textarea is disabled."
            },
            {
              prop: "rows",
              type: "number",
              default: "undefined",
              description: "Number of visible text lines."
            },
            {
              prop: "cols",
              type: "number",
              default: "undefined",
              description: "Visible width of the text control."
            },
            {
              prop: "maxLength",
              type: "number",
              default: "undefined",
              description: "Maximum number of characters allowed."
            },
            {
              prop: "resize",
              type: "'none' | 'both' | 'horizontal' | 'vertical'",
              default: "'vertical'",
              description: "How the textarea can be resized."
            }
          ]}
        />
      </section>
    </div>
  )
}
