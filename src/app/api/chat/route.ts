import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CHAT_MODEL = 'claude-haiku-4-5-20251001'

const SYSTEM_PROMPT = `You are Joot Assistant, an AI helper for a personal finance tracking app called Joot. You have access to the user's transaction data, vendors, payment methods, tags, and email imports.

Key context:
- Transactions are stored in their original currency (the currency actually paid)
- The app converts to USD as the display currency using historical exchange rates
- Supported currencies include USD, THB, EUR, GBP, SGD, and more
- Transaction types are "income" or "expense"
- Transactions can be sourced from manual entry, email receipts, or bank statement imports

When answering questions:
- Be concise and direct
- Format currency amounts nicely (e.g. $1,234.56 or ฿35,000)
- When showing multiple results, use clean formatting
- If a query returns no results, say so clearly and suggest alternative searches
- For date-related queries, today is ${new Date().toISOString().split('T')[0]}
- Always use the tools to look up data rather than guessing`

// Tool definitions for Claude
const tools: Anthropic.Tool[] = [
  {
    name: 'search_transactions',
    description: 'Search transactions by vendor name, description, date range, amount range, currency, payment method, or tags. Returns transaction details with vendor and payment method names.',
    input_schema: {
      type: 'object' as const,
      properties: {
        vendor_name: { type: 'string', description: 'Partial or full vendor name to search for (case-insensitive)' },
        description: { type: 'string', description: 'Search in transaction description (case-insensitive)' },
        date_from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        min_amount: { type: 'number', description: 'Minimum transaction amount' },
        max_amount: { type: 'number', description: 'Maximum transaction amount' },
        currency: { type: 'string', description: 'Filter by currency code (e.g. USD, THB)' },
        transaction_type: { type: 'string', enum: ['income', 'expense'], description: 'Filter by income or expense' },
        payment_method_name: { type: 'string', description: 'Filter by payment method name (case-insensitive)' },
        tag_name: { type: 'string', description: 'Filter by tag name (case-insensitive)' },
        limit: { type: 'number', description: 'Max results to return (default 20, max 50)' },
      },
      required: [],
    },
  },
  {
    name: 'get_spending_summary',
    description: 'Get spending/income summary for a date range, grouped by vendor, payment method, tag, or currency. Useful for "how much did I spend" questions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date_from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        group_by: { type: 'string', enum: ['vendor', 'payment_method', 'currency', 'tag', 'month'], description: 'How to group the summary' },
        transaction_type: { type: 'string', enum: ['income', 'expense'], description: 'Filter by type' },
        currency: { type: 'string', description: 'Filter by currency' },
      },
      required: ['date_from', 'date_to'],
    },
  },
  {
    name: 'list_vendors',
    description: 'List all vendors, optionally filtered by name. Shows transaction count per vendor.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name_search: { type: 'string', description: 'Partial name to search for (case-insensitive)' },
      },
      required: [],
    },
  },
  {
    name: 'list_payment_methods',
    description: 'List all payment methods with their types and preferred currencies.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'list_tags',
    description: 'List all tags with their transaction counts.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'search_email_transactions',
    description: 'Search email-imported transactions by vendor name, email subject, or sender address. Shows linked status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        vendor_name: { type: 'string', description: 'Vendor name from email (case-insensitive)' },
        email_subject: { type: 'string', description: 'Email subject search (case-insensitive)' },
        from_address: { type: 'string', description: 'Sender email address (case-insensitive)' },
        limit: { type: 'number', description: 'Max results (default 20, max 50)' },
      },
      required: [],
    },
  },
  {
    name: 'run_sql_query',
    description: 'Run a read-only SQL query against the database for complex questions that other tools cannot answer. Only SELECT statements are allowed. Available tables: transactions, vendors, payment_methods, tags, transaction_tags, exchange_rates, emails, email_transactions, statement_uploads. All user-owned tables have a user_id column that is automatically filtered.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'A SELECT SQL query. Must not contain INSERT, UPDATE, DELETE, DROP, ALTER, or other mutating statements. User ID filtering is applied automatically via RLS.' },
      },
      required: ['query'],
    },
  },
]

// Tool execution functions
async function executeSearchTransactions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: Record<string, unknown>
) {
  let query = supabase
    .from('transactions')
    .select(`
      id, amount, original_currency, transaction_type, transaction_date, description, created_at,
      vendors(name),
      payment_methods(name, type),
      source_email_transaction_id,
      source_statement_upload_id
    `)
    .order('transaction_date', { ascending: false })
    .limit(Math.min(Number(params.limit) || 20, 50))

  if (params.date_from) query = query.gte('transaction_date', params.date_from as string)
  if (params.date_to) query = query.lte('transaction_date', params.date_to as string)
  if (params.min_amount) query = query.gte('amount', params.min_amount as number)
  if (params.max_amount) query = query.lte('amount', params.max_amount as number)
  if (params.currency) query = query.eq('original_currency', params.currency as string)
  if (params.transaction_type) query = query.eq('transaction_type', params.transaction_type as string)

  const { data, error } = await query

  if (error) return { error: error.message }

  let results = data || []

  // Post-filter by vendor name if provided (Supabase doesn't support ilike on joined tables easily)
  if (params.vendor_name) {
    const vendorSearch = (params.vendor_name as string).toLowerCase()
    results = results.filter((t) => {
      const vendorName = (t.vendors as unknown as { name: string } | null)?.name
      return vendorName?.toLowerCase().includes(vendorSearch)
    })
  }

  // Post-filter by payment method name
  if (params.payment_method_name) {
    const pmSearch = (params.payment_method_name as string).toLowerCase()
    results = results.filter((t) => {
      const pmName = (t.payment_methods as unknown as { name: string; type: string } | null)?.name
      return pmName?.toLowerCase().includes(pmSearch)
    })
  }

  // Post-filter by description
  if (params.description) {
    const descSearch = (params.description as string).toLowerCase()
    results = results.filter((t) => t.description?.toLowerCase().includes(descSearch))
  }

  // If tag filter, do a separate query
  if (params.tag_name) {
    const tagSearch = (params.tag_name as string).toLowerCase()
    const { data: tagData } = await supabase
      .from('tags')
      .select('id, name')
      .ilike('name', `%${tagSearch}%`)

    if (tagData && tagData.length > 0) {
      const tagIds = tagData.map((t) => t.id)
      const { data: ttData } = await supabase
        .from('transaction_tags')
        .select('transaction_id')
        .in('tag_id', tagIds)

      const txIds = new Set((ttData || []).map((tt) => tt.transaction_id))
      results = results.filter((t) => txIds.has(t.id))
    } else {
      results = []
    }
  }

  return {
    count: results.length,
    transactions: results.map((t) => ({
      date: t.transaction_date,
      amount: t.amount,
      currency: t.original_currency,
      type: t.transaction_type,
      vendor: (t.vendors as unknown as { name: string } | null)?.name || null,
      payment_method: (t.payment_methods as unknown as { name: string; type: string } | null)?.name || null,
      description: t.description,
      source: t.source_email_transaction_id ? 'email' : t.source_statement_upload_id ? 'statement' : 'manual',
    })),
  }
}

async function executeGetSpendingSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: Record<string, unknown>
) {
  let query = supabase
    .from('transactions')
    .select(`
      amount, original_currency, transaction_type, transaction_date,
      vendor_id, vendors(name),
      payment_method_id, payment_methods(name)
    `)
    .gte('transaction_date', params.date_from as string)
    .lte('transaction_date', params.date_to as string)

  if (params.transaction_type) query = query.eq('transaction_type', params.transaction_type as string)
  if (params.currency) query = query.eq('original_currency', params.currency as string)

  const { data, error } = await query
  if (error) return { error: error.message }
  if (!data || data.length === 0) return { summary: [], total_transactions: 0 }

  const groupBy = (params.group_by as string) || 'vendor'

  type GroupEntry = { total: number; count: number; currency: string }
  const groups: Record<string, GroupEntry> = {}

  for (const t of data) {
    let key: string
    switch (groupBy) {
      case 'vendor':
        key = (t.vendors as unknown as { name: string } | null)?.name || '(no vendor)'
        break
      case 'payment_method':
        key = (t.payment_methods as unknown as { name: string } | null)?.name || '(no payment method)'
        break
      case 'currency':
        key = t.original_currency
        break
      case 'month':
        key = t.transaction_date.substring(0, 7) // YYYY-MM
        break
      case 'tag':
        key = 'all' // Tags require separate handling
        break
      default:
        key = 'all'
    }

    const groupKey = `${key}|${t.original_currency}`
    if (!groups[groupKey]) {
      groups[groupKey] = { total: 0, count: 0, currency: t.original_currency }
    }
    groups[groupKey].total += Number(t.amount)
    groups[groupKey].count += 1
  }

  const summary = Object.entries(groups)
    .map(([key, val]) => ({
      group: key.split('|')[0],
      currency: val.currency,
      total: Math.round(val.total * 100) / 100,
      transaction_count: val.count,
    }))
    .sort((a, b) => b.total - a.total)

  return { summary, total_transactions: data.length }
}

async function executeListVendors(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: Record<string, unknown>
) {
  let query = supabase.from('vendors').select('id, name').order('name')

  if (params.name_search) {
    query = query.ilike('name', `%${params.name_search}%`)
  }

  const { data, error } = await query
  if (error) return { error: error.message }

  // Get transaction counts per vendor
  const vendorIds = (data || []).map((v) => v.id)
  const { data: txCounts } = await supabase
    .from('transactions')
    .select('vendor_id')
    .in('vendor_id', vendorIds)

  const countMap: Record<string, number> = {}
  for (const tx of txCounts || []) {
    if (tx.vendor_id) {
      countMap[tx.vendor_id] = (countMap[tx.vendor_id] || 0) + 1
    }
  }

  return {
    vendors: (data || []).map((v) => ({
      name: v.name,
      transaction_count: countMap[v.id] || 0,
    })),
  }
}

async function executeListPaymentMethods(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('name, type, preferred_currency, billing_cycle_start_day')
    .order('sort_order')

  if (error) return { error: error.message }
  return { payment_methods: data }
}

async function executeListTags(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data: tags, error } = await supabase
    .from('tags')
    .select('id, name, color')
    .order('name')

  if (error) return { error: error.message }

  const tagIds = (tags || []).map((t) => t.id)
  const { data: ttData } = await supabase
    .from('transaction_tags')
    .select('tag_id')
    .in('tag_id', tagIds)

  const countMap: Record<string, number> = {}
  for (const tt of ttData || []) {
    countMap[tt.tag_id] = (countMap[tt.tag_id] || 0) + 1
  }

  return {
    tags: (tags || []).map((t) => ({
      name: t.name,
      color: t.color,
      transaction_count: countMap[t.id] || 0,
    })),
  }
}

async function executeSearchEmailTransactions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: Record<string, unknown>
) {
  let query = supabase
    .from('email_transactions')
    .select(`
      id, vendor_name, amount, currency, transaction_date, category,
      is_skipped, created_at,
      emails(subject, from_address),
      transactions(id, amount, description, vendors(name))
    `)
    .order('transaction_date', { ascending: false })
    .limit(Math.min(Number(params.limit) || 20, 50))

  if (params.vendor_name) {
    query = query.ilike('vendor_name', `%${params.vendor_name}%`)
  }

  const { data, error } = await query
  if (error) return { error: error.message }

  let results = data || []

  // Post-filter by email subject or from_address
  if (params.email_subject) {
    const search = (params.email_subject as string).toLowerCase()
    results = results.filter((et) => {
      const email = et.emails as unknown as { subject: string; from_address: string } | null
      return email?.subject?.toLowerCase().includes(search)
    })
  }
  if (params.from_address) {
    const search = (params.from_address as string).toLowerCase()
    results = results.filter((et) => {
      const email = et.emails as unknown as { subject: string; from_address: string } | null
      return email?.from_address?.toLowerCase().includes(search)
    })
  }

  return {
    count: results.length,
    email_transactions: results.map((et) => {
      const email = et.emails as unknown as { subject: string; from_address: string } | null
      const linkedTx = et.transactions as unknown as Array<{ id: string; amount: number; description: string; vendors: { name: string } | null }> | null
      return {
        vendor_name: et.vendor_name,
        amount: et.amount,
        currency: et.currency,
        date: et.transaction_date,
        category: et.category,
        is_skipped: et.is_skipped,
        email_subject: email?.subject,
        email_from: email?.from_address,
        linked_transactions: (linkedTx || []).map((tx) => ({
          amount: tx.amount,
          description: tx.description,
          vendor: tx.vendors?.name,
        })),
      }
    }),
  }
}

async function executeRunSqlQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: Record<string, unknown>
) {
  const query = (params.query as string).trim()

  // Safety check: only allow SELECT statements
  const normalized = query.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim().toUpperCase()
  if (!normalized.startsWith('SELECT') && !normalized.startsWith('WITH')) {
    return { error: 'Only SELECT queries are allowed.' }
  }

  const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE']
  for (const keyword of forbidden) {
    // Check for keyword as a separate word (not part of another word)
    if (new RegExp(`\\b${keyword}\\b`).test(normalized)) {
      return { error: `Query contains forbidden keyword: ${keyword}` }
    }
  }

  const { data, error } = await supabase.rpc('run_readonly_query', { query_text: query })

  if (error) {
    // If the RPC doesn't exist, fall back to explaining
    if (error.message.includes('function') && error.message.includes('does not exist')) {
      return {
        error: 'The run_readonly_query database function is not set up yet. Please use the other specific tools instead, or ask the user to set up the SQL query function.',
      }
    }
    return { error: error.message }
  }

  return { results: data, row_count: Array.isArray(data) ? data.length : 0 }
}

async function executeTool(
  supabase: Awaited<ReturnType<typeof createClient>>,
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  let result: unknown

  switch (toolName) {
    case 'search_transactions':
      result = await executeSearchTransactions(supabase, toolInput)
      break
    case 'get_spending_summary':
      result = await executeGetSpendingSummary(supabase, toolInput)
      break
    case 'list_vendors':
      result = await executeListVendors(supabase, toolInput)
      break
    case 'list_payment_methods':
      result = await executeListPaymentMethods(supabase)
      break
    case 'list_tags':
      result = await executeListTags(supabase)
      break
    case 'search_email_transactions':
      result = await executeSearchEmailTransactions(supabase, toolInput)
      break
    case 'run_sql_query':
      result = await executeRunSqlQuery(supabase, toolInput)
      break
    default:
      result = { error: `Unknown tool: ${toolName}` }
  }

  return JSON.stringify(result)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
  }

  const { messages } = await request.json()

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Messages required' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey })

  try {
    // Build conversation with tool use loop
    const apiMessages: Anthropic.MessageParam[] = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    let response = await client.messages.create({
      model: CHAT_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages: apiMessages,
    })

    // Tool use loop - keep calling tools until we get a final text response
    while (response.stop_reason === 'tool_use') {
      const assistantContent = response.content
      const toolUseBlocks = assistantContent.filter(
        (block): block is Anthropic.ContentBlockParam & { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
          block.type === 'tool_use'
      )

      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const toolUse of toolUseBlocks) {
        try {
          const result = await executeTool(supabase, toolUse.name, toolUse.input)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          })
        } catch (toolError) {
          console.error(`[Chat] Tool ${toolUse.name} failed:`, toolError)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error: `Tool execution failed: ${toolError instanceof Error ? toolError.message : 'Unknown error'}` }),
            is_error: true,
          })
        }
      }

      apiMessages.push({ role: 'assistant', content: assistantContent })
      apiMessages.push({ role: 'user', content: toolResults })

      response = await client.messages.create({
        model: CHAT_MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools,
        messages: apiMessages,
      })
    }

    // Extract final text response
    const textBlock = response.content.find((block) => block.type === 'text')
    const replyText = textBlock && textBlock.type === 'text' ? textBlock.text : 'I could not generate a response.'

    return NextResponse.json({
      reply: replyText,
      usage: {
        prompt_tokens: response.usage?.input_tokens ?? 0,
        completion_tokens: response.usage?.output_tokens ?? 0,
      },
    })
  } catch (error) {
    console.error('[Chat] API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
