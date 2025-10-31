import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function fixMatchUserId() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('=== Fixing user_id in transaction_document_matches ===\n')

  // Update the match record with the correct user_id
  const { error } = await supabase
    .from('transaction_document_matches')
    .update({ user_id: 'a1c3caff-a5de-4898-be7d-ab4b76247ae6' })
    .eq('id', 'a25bbc5e-a3ff-4971-ac1d-d75b72334c0d')

  if (error) {
    console.log('Error updating match:', error)
    return
  }

  console.log('✅ Match user_id updated successfully!')
  console.log('')

  // Verify the update
  const { data } = await supabase
    .from('transaction_document_matches')
    .select('id, user_id, approved')
    .eq('id', 'a25bbc5e-a3ff-4971-ac1d-d75b72334c0d')
    .single()

  console.log('Updated match:')
  console.log('  ID:', data?.id)
  console.log('  User ID:', data?.user_id)
  console.log('  Approved:', data?.approved)
}

fixMatchUserId()
