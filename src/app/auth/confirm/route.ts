import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { redirect } from 'next/navigation'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/home'

  if (!token_hash || !type) {
    const errorMessage = encodeURIComponent('Invalid confirmation link. Please try signing up again.')
    redirect(`/error?message=${errorMessage}`)
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.verifyOtp({
    type: type as any,
    token_hash,
  })

  if (error) {
    const errorMessage = encodeURIComponent(error.message || 'Failed to confirm email. The link may have expired.')
    redirect(`/error?message=${errorMessage}`)
  }

  // Successfully confirmed - redirect to home or specified page
  redirect(next)
}
