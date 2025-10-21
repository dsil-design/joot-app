import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function addSortOrderColumn() {
  console.log('Adding sort_order column to payment_methods table...')

  try {
    // First, check if column exists by trying to select it
    const { error: checkError } = await supabase
      .from('payment_methods')
      .select('sort_order')
      .limit(1)

    if (!checkError) {
      console.log('✓ Column sort_order already exists!')
      return
    }

    console.log('Column does not exist, need to add it manually...')
    console.log('\nPlease run this SQL in your Supabase SQL Editor:')
    console.log('\n' + '='.repeat(80))
    console.log(`
-- Add sort_order column to payment_methods table
ALTER TABLE public.payment_methods
ADD COLUMN sort_order INTEGER;

-- Set initial sort order based on name (alphabetically)
WITH ordered_methods AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY name) as rn
  FROM public.payment_methods
)
UPDATE public.payment_methods pm
SET sort_order = om.rn
FROM ordered_methods om
WHERE pm.id = om.id;

-- Make sort_order NOT NULL after setting initial values
ALTER TABLE public.payment_methods
ALTER COLUMN sort_order SET NOT NULL;

-- Add index for better query performance
CREATE INDEX idx_payment_methods_sort_order ON public.payment_methods(user_id, sort_order);
    `)
    console.log('='.repeat(80))
    console.log('\nSteps:')
    console.log('1. Go to https://supabase.com/dashboard/project/uwjmgjqongcrsamprvjr/sql/new')
    console.log('2. Copy and paste the SQL above')
    console.log('3. Click "Run" to execute the migration')
    console.log('4. Come back and try reordering again!')

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

addSortOrderColumn()
