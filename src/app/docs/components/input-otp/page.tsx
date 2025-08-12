"use client"

import { ComponentDemo } from "@/components/docs/component-demo"
import { CodeBlock } from "@/components/docs/code-block"
import { PropsTable } from "@/components/docs/props-table"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp"
import { useState } from "react"

export default function InputOTPDocumentation() {
  const [value, setValue] = useState("")

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Input OTP</h1>
        <p className="text-lg text-muted-foreground">
          Accessible one-time password component with copy paste functionality.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Default</h3>
            <ComponentDemo>
              <InputOTP maxLength={6} value={value} onChange={setValue}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </ComponentDemo>
            <CodeBlock code={`<InputOTP maxLength={6} value={value} onChange={setValue}>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
    <InputOTPSlot index={2} />
    <InputOTPSlot index={3} />
    <InputOTPSlot index={4} />
    <InputOTPSlot index={5} />
  </InputOTPGroup>
</InputOTP>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">With Separator</h3>
            <ComponentDemo>
              <InputOTP maxLength={6}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </ComponentDemo>
            <CodeBlock code={`<InputOTP maxLength={6}>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
    <InputOTPSlot index={2} />
  </InputOTPGroup>
  <InputOTPSeparator />
  <InputOTPGroup>
    <InputOTPSlot index={3} />
    <InputOTPSlot index={4} />
    <InputOTPSlot index={5} />
  </InputOTPGroup>
</InputOTP>`} />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Pattern</h3>
            <ComponentDemo>
              <InputOTP
                maxLength={6}
                pattern="^[0-9]+$"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </ComponentDemo>
            <CodeBlock code={`<InputOTP
  maxLength={6}
  pattern="^[0-9]+$"
>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
    <InputOTPSlot index={2} />
    <InputOTPSlot index={3} />
    <InputOTPSlot index={4} />
    <InputOTPSlot index={5} />
  </InputOTPGroup>
</InputOTP>`} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage Guidelines</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-green-600">✅ Do</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use for one-time passwords and verification codes</li>
              <li>Support copy and paste functionality</li>
              <li>Provide clear visual feedback for each slot</li>
              <li>Auto-focus the next slot after input</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-red-600">❌ Don't</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use for regular password input</li>
              <li>Make slots too small to interact with</li>
              <li>Forget to handle backspace navigation</li>
              <li>Use for non-numeric codes without proper validation</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">API Reference</h2>
        <PropsTable
          data={[
            {
              prop: "maxLength",
              type: "number",
              default: "6",
              description: "Maximum number of characters."
            },
            {
              prop: "value",
              type: "string",
              default: "''",
              description: "The controlled value of the OTP input."
            },
            {
              prop: "onChange",
              type: "function",
              default: "undefined",
              description: "Event handler called when the value changes."
            },
            {
              prop: "pattern",
              type: "RegExp",
              default: "undefined",
              description: "Pattern to validate input characters."
            },
            {
              prop: "disabled",
              type: "boolean",
              default: "false",
              description: "Whether the input is disabled."
            }
          ]}
        />
      </section>
    </div>
  )
}
