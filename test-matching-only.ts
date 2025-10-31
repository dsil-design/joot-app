import { createClient } from '@supabase/supabase-js'
import { findMatchingTransactions } from './src/lib/services/matching-service'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testMatching() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Get latest document with extraction data
  const { data: extraction } = await supabase
    .from('document_extractions')
    .select('*, document:documents(*)')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!extraction || !extraction.document) {
    console.log('No documents with extraction data found')
    return
  }

  const doc = extraction.document as any

  console.log('📄 Testing matching for:', doc.file_name)
  console.log('   Document ID:', doc.id)
  console.log('')

  console.log('📊 Extraction Data:')
  console.log('   Merchant:', extraction.merchant_name)
  console.log('   Amount:', extraction.amount)
  console.log('   Currency:', extraction.currency)
  console.log('   Date:', extraction.transaction_date)
  console.log('')

  // Run matching
  console.log('🔍 Running transaction matching...')
  console.log('=' .repeat(80))

  const matchResult = await findMatchingTransactions(
    {
      vendorName: extraction.merchant_name || null,
      amount: extraction.amount || null,
      currency: extraction.currency || null,
      transactionDate: extraction.transaction_date || null,
    },
    doc.user_id,
    50, // Min confidence
    5, // Max results
    supabase // Pass client
  )

  console.log('=' .repeat(80))
  console.log('')
  console.log('✅ Matching Results:')
  console.log('   Success:', matchResult.success)
  console.log('   Match count:', matchResult.matches.length)
  console.log('   Error:', matchResult.error || 'none')
  console.log('')

  if (matchResult.matches.length > 0) {
    console.log('🎯 Matches found:')
    matchResult.matches.forEach((match, idx) => {
      console.log(`   ${idx + 1}. ${match.transaction.description || match.transaction.vendor?.name}`)
      console.log(`      Amount: $${Math.abs(match.transaction.amount)}`)
      console.log(`      Date: ${match.transaction.transaction_date}`)
      console.log(`      Confidence: ${match.confidence}%`)
      console.log(`      Scores: vendor=${match.scores.vendorScore}, amount=${match.scores.amountScore}, date=${match.scores.dateScore}`)
      console.log('')
    })
  } else {
    console.log('❌ No matches found')
  }
}

testMatching()
