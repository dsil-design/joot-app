import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function fixKyleHarrisApproval() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('=== Fixing Kyle Harris Document Approval ===\n')

  // Find the match
  const { data: match } = await supabase
    .from('transaction_document_matches')
    .select('*')
    .eq('id', 'a25bbc5e-a3ff-4971-ac1d-d75b72334c0d')
    .single()

  if (!match) {
    console.log('Match not found')
    return
  }

  console.log('Current match status:')
  console.log(`  - Approved: ${match.approved}`)
  console.log(`  - Confidence: ${match.confidence_score}`)
  console.log(`  - Match Type: ${match.match_type}`)
  console.log('')

  // Update the match to approved
  const { error } = await supabase
    .from('transaction_document_matches')
    .update({
      approved: true,
      approved_at: new Date().toISOString(),
      approved_by: match.user_id,
      match_type: 'manual',
    })
    .eq('id', 'a25bbc5e-a3ff-4971-ac1d-d75b72334c0d')

  if (error) {
    console.log('Error updating match:', error)
    return
  }

  console.log('✅ Match updated successfully!')
  console.log('')

  // Verify the update
  const { data: updated } = await supabase
    .from('transaction_document_matches')
    .select('*')
    .eq('id', 'a25bbc5e-a3ff-4971-ac1d-d75b72334c0d')
    .single()

  console.log('Updated match status:')
  console.log(`  - Approved: ${updated?.approved}`)
  console.log(`  - Approved At: ${updated?.approved_at}`)
  console.log(`  - Approved By: ${updated?.approved_by}`)
  console.log(`  - Match Type: ${updated?.match_type}`)
}

fixKyleHarrisApproval()
