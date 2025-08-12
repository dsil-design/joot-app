interface PropItem {
  prop: string
  type: string
  default?: string
  description: string
  required?: boolean
}

interface PropsTableProps {
  data: PropItem[]
}

export function PropsTable({ data }: PropsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-border">
        <thead>
          <tr className="bg-muted/50">
            <th className="border border-border px-4 py-2 text-left text-sm font-semibold">Prop</th>
            <th className="border border-border px-4 py-2 text-left text-sm font-semibold">Type</th>
            <th className="border border-border px-4 py-2 text-left text-sm font-semibold">Default</th>
            <th className="border border-border px-4 py-2 text-left text-sm font-semibold">Description</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className="border-t">
              <td className="border border-border px-4 py-2">
                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] text-sm">
                  {item.prop}
                  {item.required && <span className="text-red-500 ml-1">*</span>}
                </code>
              </td>
              <td className="border border-border px-4 py-2">
                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] text-sm">
                  {item.type}
                </code>
              </td>
              <td className="border border-border px-4 py-2">
                {item.default ? (
                  <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] text-sm">
                    {item.default}
                  </code>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="border border-border px-4 py-2 text-sm">
                {item.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}