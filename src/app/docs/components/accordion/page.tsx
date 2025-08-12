"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function AccordionPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Accordion</h1>
        <p className="text-lg text-muted-foreground">
          A vertically stacked set of interactive headings that each reveal an associated section of content.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Single Item (Collapsible)</h3>
            <ComponentDemo>
              <Accordion type="single" collapsible className="w-full max-w-md">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Is it accessible?</AccordionTrigger>
                  <AccordionContent>
                    Yes. It adheres to the WAI-ARIA design pattern and uses semantic HTML elements to ensure compatibility with screen readers and other assistive technologies.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Is it styled?</AccordionTrigger>
                  <AccordionContent>
                    Yes. It comes with default styles that matches the other components' aesthetic. You can also customize it to match your own design system.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Is it animated?</AccordionTrigger>
                  <AccordionContent>
                    Yes. It's animated by default, but you can disable it if you prefer. The animation is smooth and respects the user's motion preferences.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </ComponentDemo>
            <CodeBlock code={`<Accordion type="single" collapsible className="w-full">
  <AccordionItem value="item-1">
    <AccordionTrigger>Is it accessible?</AccordionTrigger>
    <AccordionContent>
      Yes. It adheres to the WAI-ARIA design pattern and uses semantic HTML elements.
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="item-2">
    <AccordionTrigger>Is it styled?</AccordionTrigger>
    <AccordionContent>
      Yes. It comes with default styles that matches the other components' aesthetic.
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="item-3">
    <AccordionTrigger>Is it animated?</AccordionTrigger>
    <AccordionContent>
      Yes. It's animated by default, but you can disable it if you prefer.
    </AccordionContent>
  </AccordionItem>
</Accordion>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Multiple Items (Always One Open)</h3>
            <ComponentDemo>
              <Accordion type="single" defaultValue="faq-1" className="w-full max-w-md">
                <AccordionItem value="faq-1">
                  <AccordionTrigger>What payment methods do you accept?</AccordionTrigger>
                  <AccordionContent>
                    We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers. All payments are processed securely through our encrypted payment gateway.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-2">
                  <AccordionTrigger>How long does shipping take?</AccordionTrigger>
                  <AccordionContent>
                    Standard shipping typically takes 3-5 business days within the United States. Express shipping options are available for next-day or 2-day delivery at an additional cost.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-3">
                  <AccordionTrigger>Can I return my purchase?</AccordionTrigger>
                  <AccordionContent>
                    Yes, we offer a 30-day return policy. Items must be unused and in their original packaging. Please contact our customer service team to initiate a return.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-4">
                  <AccordionTrigger>Do you offer customer support?</AccordionTrigger>
                  <AccordionContent>
                    Absolutely! Our customer support team is available Monday through Friday, 9 AM to 6 PM EST. You can reach us via email, phone, or live chat on our website.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </ComponentDemo>
            <CodeBlock code={`<Accordion type="single" defaultValue="faq-1" className="w-full">
  <AccordionItem value="faq-1">
    <AccordionTrigger>What payment methods do you accept?</AccordionTrigger>
    <AccordionContent>
      We accept all major credit cards, PayPal, and bank transfers.
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="faq-2">
    <AccordionTrigger>How long does shipping take?</AccordionTrigger>
    <AccordionContent>
      Standard shipping typically takes 3-5 business days within the United States.
    </AccordionContent>
  </AccordionItem>
</Accordion>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Multiple Items (Multiple Can Be Open)</h3>
            <ComponentDemo>
              <Accordion type="multiple" className="w-full max-w-md">
                <AccordionItem value="feature-1">
                  <AccordionTrigger>Advanced Analytics</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <p>Get detailed insights into your data with our advanced analytics dashboard.</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Real-time data visualization</li>
                        <li>Custom report generation</li>
                        <li>Data export capabilities</li>
                        <li>Automated insights and recommendations</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="feature-2">
                  <AccordionTrigger>Team Collaboration</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <p>Work together seamlessly with built-in collaboration tools.</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Real-time editing and comments</li>
                        <li>Role-based permissions</li>
                        <li>Activity tracking and notifications</li>
                        <li>Integration with popular tools</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="feature-3">
                  <AccordionTrigger>Security & Compliance</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <p>Enterprise-grade security features to protect your data.</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>End-to-end encryption</li>
                        <li>GDPR and SOC 2 compliance</li>
                        <li>Two-factor authentication</li>
                        <li>Regular security audits</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </ComponentDemo>
            <CodeBlock code={`<Accordion type="multiple" className="w-full">
  <AccordionItem value="feature-1">
    <AccordionTrigger>Advanced Analytics</AccordionTrigger>
    <AccordionContent>
      <div className="space-y-2">
        <p>Get detailed insights into your data with our advanced analytics dashboard.</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Real-time data visualization</li>
          <li>Custom report generation</li>
          <li>Data export capabilities</li>
          <li>Automated insights and recommendations</li>
        </ul>
      </div>
    </AccordionContent>
  </AccordionItem>
  {/* More items... */}
</Accordion>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Rich Content</h3>
            <ComponentDemo>
              <Accordion type="single" collapsible className="w-full max-w-md">
                <AccordionItem value="getting-started">
                  <AccordionTrigger>Getting Started Guide</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <p className="text-sm">Follow these steps to get up and running quickly:</p>
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>
                          <strong>Create your account</strong>
                          <p className="text-muted-foreground ml-4 mt-1">Sign up with your email address and verify your account.</p>
                        </li>
                        <li>
                          <strong>Set up your profile</strong>
                          <p className="text-muted-foreground ml-4 mt-1">Add your basic information and preferences.</p>
                        </li>
                        <li>
                          <strong>Explore the dashboard</strong>
                          <p className="text-muted-foreground ml-4 mt-1">Familiarize yourself with the main features and navigation.</p>
                        </li>
                      </ol>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="pricing">
                  <AccordionTrigger>Pricing Information</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Basic Plan</span>
                          <span className="text-lg font-bold">$9/month</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Perfect for individuals getting started</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Pro Plan</span>
                          <span className="text-lg font-bold">$29/month</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Ideal for growing teams and businesses</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="support">
                  <AccordionTrigger>Contact Support</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      <p className="text-sm">Need help? We're here for you!</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span>Email: support@example.com</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          <span>Live Chat: Available 9 AM - 6 PM EST</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          <span>Phone: +1 (555) 123-4567</span>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </ComponentDemo>
            <CodeBlock code={`<Accordion type="single" collapsible className="w-full">
  <AccordionItem value="getting-started">
    <AccordionTrigger>Getting Started Guide</AccordionTrigger>
    <AccordionContent>
      <div className="space-y-4">
        <p className="text-sm">Follow these steps to get up and running quickly:</p>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            <strong>Create your account</strong>
            <p className="text-muted-foreground ml-4 mt-1">
              Sign up with your email address and verify your account.
            </p>
          </li>
          {/* More steps... */}
        </ol>
      </div>
    </AccordionContent>
  </AccordionItem>
</Accordion>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Disabled Items</h3>
            <ComponentDemo>
              <Accordion type="single" collapsible className="w-full max-w-md">
                <AccordionItem value="available">
                  <AccordionTrigger>Available Feature</AccordionTrigger>
                  <AccordionContent>
                    This feature is currently available and working perfectly. You can use it right away!
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="disabled" disabled>
                  <AccordionTrigger>Coming Soon Feature</AccordionTrigger>
                  <AccordionContent>
                    This content won't be shown because the trigger is disabled.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="maintenance">
                  <AccordionTrigger>Under Maintenance</AccordionTrigger>
                  <AccordionContent>
                    This feature is currently under maintenance. Please check back later or contact support if you need immediate assistance.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </ComponentDemo>
            <CodeBlock code={`<Accordion type="single" collapsible className="w-full">
  <AccordionItem value="available">
    <AccordionTrigger>Available Feature</AccordionTrigger>
    <AccordionContent>
      This feature is currently available and working perfectly.
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="disabled" disabled>
    <AccordionTrigger>Coming Soon Feature</AccordionTrigger>
    <AccordionContent>
      This content won't be shown because the trigger is disabled.
    </AccordionContent>
  </AccordionItem>
</Accordion>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Installation</h2>
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add accordion"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage</h2>
        <CodeBlock
          code={`import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export function Example() {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger>Accordion Trigger</AccordionTrigger>
        <AccordionContent>
          Accordion content goes here.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Accordion</h3>
            <PropsTable
              data={[
                {
                  prop: "type",
                  type: "'single' | 'multiple'",
                  description: "Determines whether one or multiple items can be opened at the same time.",
                },
                {
                  prop: "collapsible",
                  type: "boolean",
                  description: "When type='single', allows closing the open item by clicking it again.",
                },
                {
                  prop: "defaultValue",
                  type: "string | string[]",
                  description: "The default value(s) of the accordion when it is first rendered.",
                },
                {
                  prop: "value",
                  type: "string | string[]",
                  description: "The controlled value(s) of the accordion.",
                },
                {
                  prop: "onValueChange",
                  type: "(value: string | string[]) => void",
                  description: "Event handler called when the value changes.",
                },
                {
                  prop: "disabled",
                  type: "boolean",
                  default: "false",
                  description: "When true, prevents the user from interacting with the accordion.",
                },
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the accordion.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">AccordionItem</h3>
            <PropsTable
              data={[
                {
                  prop: "value",
                  type: "string",
                  description: "A unique value for the item.",
                },
                {
                  prop: "disabled",
                  type: "boolean",
                  default: "false",
                  description: "When true, prevents the user from interacting with the item.",
                },
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the item.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">AccordionTrigger</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the trigger.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The content of the trigger.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">AccordionContent</h3>
            <PropsTable
              data={[
                {
                  prop: "className",
                  type: "string",
                  description: "Additional CSS class names to apply to the content wrapper.",
                },
                {
                  prop: "children",
                  type: "React.ReactNode",
                  description: "The content of the accordion item.",
                },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Design Guidelines</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-green-600">Do</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use clear, descriptive trigger labels</li>
              <li>Keep content concise and well-organized</li>
              <li>Group related items together logically</li>
              <li>Consider the default state carefully</li>
              <li>Use consistent formatting within content</li>
              <li>Test with screen readers and keyboard navigation</li>
              <li>Consider mobile usability with touch targets</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-red-600">Don't</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Nest accordions within accordions</li>
              <li>Use accordions for critical information</li>
              <li>Make trigger labels too long or unclear</li>
              <li>Hide essential navigation in accordions</li>
              <li>Use too many items in a single accordion</li>
              <li>Forget to handle loading states for dynamic content</li>
              <li>Override the keyboard navigation behavior</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">
            The Accordion component follows WAI-ARIA guidelines and includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Proper ARIA attributes for screen readers</li>
            <li>Keyboard navigation support (Space, Enter, Tab, Shift+Tab)</li>
            <li>Focus management and visual focus indicators</li>
            <li>Semantic HTML structure with proper heading levels</li>
            <li>Screen reader announcements for state changes</li>
            <li>Support for assistive technologies</li>
            <li>Respects user's motion preferences for animations</li>
            <li>High contrast support for focus and active states</li>
          </ul>
        </div>
      </section>
    </div>
  )
}