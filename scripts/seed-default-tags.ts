import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function seedDefaultTags() {
  try {
    console.log('Fetching all users...')

    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError) {
      throw usersError
    }

    console.log(`Found ${users.users.length} users`)

    for (const user of users.users) {
      const email = user.email
      if (!email) continue

      console.log(`\nProcessing user: ${email}`)

      // Check if user already has tags
      const { data: existingTags, error: checkError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)

      if (checkError) {
        console.error(`Error checking tags for ${email}:`, checkError)
        continue
      }

      if (existingTags && existingTags.length > 0) {
        console.log(`  ✓ User already has ${existingTags.length} tag(s), skipping`)
        continue
      }

      // Determine which tags to seed based on email
      let tagsToCreate: Array<{ name: string; color: string }> = []

      if (email === 'dennis@dsil.design') {
        tagsToCreate = [
          { name: 'Reimburseable', color: '#dbeafe' },      // blue-100
          { name: 'Business Expense', color: '#fef3c7' },   // amber-100
          { name: 'Florida Villa', color: '#dcfce7' }        // green-100
        ]
      } else if (email === 'hello@dsil.design' || email.includes('demo')) {
        tagsToCreate = [
          { name: 'Personal', color: '#dbeafe' },           // blue-100
          { name: 'Work Travel', color: '#dcfce7' },        // green-100
          { name: 'Client Meeting', color: '#fef3c7' }      // amber-100
        ]
      } else {
        tagsToCreate = [
          { name: 'Personal', color: '#dbeafe' },           // blue-100
          { name: 'Business', color: '#dcfce7' },           // green-100
          { name: 'Tax Deductible', color: '#fef3c7' },     // amber-100
          { name: 'Recurring', color: '#ffe2e2' }           // red-100
        ]
      }

      console.log(`  Creating ${tagsToCreate.length} default tags...`)

      // Insert tags
      const tagsWithUserId = tagsToCreate.map(tag => ({
        ...tag,
        user_id: user.id
      }))

      const { data: insertedTags, error: insertError } = await supabase
        .from('tags')
        .insert(tagsWithUserId)
        .select()

      if (insertError) {
        console.error(`  ✗ Error creating tags for ${email}:`, insertError)
        continue
      }

      console.log(`  ✓ Successfully created ${insertedTags?.length || 0} tags`)
      insertedTags?.forEach(tag => {
        console.log(`    - ${tag.name} (${tag.color})`)
      })
    }

    console.log('\n✅ Default tags seeding complete!')

  } catch (error) {
    console.error('❌ Failed to seed default tags:', error)
    process.exit(1)
  }
}

seedDefaultTags()
