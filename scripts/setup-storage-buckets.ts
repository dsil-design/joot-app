/**
 * Setup Script: Create Supabase Storage Buckets
 *
 * Creates 3 storage buckets for document management:
 * 1. documents (private) - Original uploaded files
 * 2. thumbnails (public) - Compressed preview images
 * 3. vendor-logos (public) - Cached vendor logos
 *
 * Run: npx tsx scripts/setup-storage-buckets.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupStorageBuckets() {
  console.log('🪣 Setting up Supabase Storage buckets...\n')

  const buckets = [
    {
      id: 'documents',
      name: 'documents',
      public: false,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'message/rfc822' // .eml email files
      ]
    },
    {
      id: 'thumbnails',
      name: 'thumbnails',
      public: true,
      fileSizeLimit: 1 * 1024 * 1024, // 1MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/jpg',
        'image/png'
      ]
    },
    {
      id: 'vendor-logos',
      name: 'vendor-logos',
      public: true,
      fileSizeLimit: 512 * 1024, // 512KB
      allowedMimeTypes: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/svg+xml',
        'image/webp'
      ]
    }
  ]

  for (const bucket of buckets) {
    console.log(`📂 Creating bucket: ${bucket.name}`)
    console.log(`   Public: ${bucket.public}`)
    console.log(`   Max size: ${Math.round(bucket.fileSizeLimit / 1024 / 1024 * 100) / 100}MB`)
    console.log(`   Allowed types: ${bucket.allowedMimeTypes.join(', ')}`)

    // Try to create the bucket
    const { data: createData, error: createError } = await supabase.storage.createBucket(bucket.id, {
      public: bucket.public,
      fileSizeLimit: bucket.fileSizeLimit,
      allowedMimeTypes: bucket.allowedMimeTypes
    })

    if (createError) {
      // Bucket might already exist, try to update it
      if (createError.message.includes('already exists')) {
        console.log(`   ⚠️  Bucket already exists, updating settings...`)

        const { data: updateData, error: updateError } = await supabase.storage.updateBucket(bucket.id, {
          public: bucket.public,
          fileSizeLimit: bucket.fileSizeLimit,
          allowedMimeTypes: bucket.allowedMimeTypes
        })

        if (updateError) {
          console.log(`   ❌ Error updating bucket: ${updateError.message}`)
        } else {
          console.log(`   ✅ Bucket updated successfully`)
        }
      } else {
        console.log(`   ❌ Error creating bucket: ${createError.message}`)
      }
    } else {
      console.log(`   ✅ Bucket created successfully`)
    }

    console.log('')
  }

  // Verify all buckets exist
  console.log('🔍 Verifying buckets...\n')
  const { data: allBuckets, error: listError } = await supabase.storage.listBuckets()

  if (listError) {
    console.error('❌ Error listing buckets:', listError.message)
    return
  }

  const expectedBuckets = ['documents', 'thumbnails', 'vendor-logos']
  const foundBuckets = allBuckets?.filter(b => expectedBuckets.includes(b.id)) || []

  console.log('📋 Buckets found:')
  foundBuckets.forEach(bucket => {
    console.log(`   ✓ ${bucket.id} (${bucket.public ? 'public' : 'private'})`)
  })

  if (foundBuckets.length === expectedBuckets.length) {
    console.log('\n✅ All storage buckets set up successfully!')
  } else {
    console.log('\n⚠️  Some buckets may be missing. Check the errors above.')
  }
}

setupStorageBuckets()
  .then(() => {
    console.log('\n🎉 Storage setup complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error)
    process.exit(1)
  })
