'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    const errorMessage = encodeURIComponent(error.message || 'Invalid login credentials')
    redirect(`/error?message=${errorMessage}`)
  }

  // Check if user is admin and redirect accordingly
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    // Try to get user profile - if it fails, user might not be in users table yet
    const { data: userProfile } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', user.id)
      .single()

    revalidatePath('/', 'layout')

    // Check if user is admin by email as fallback if profile doesn't exist yet
    const isAdminByEmail = user.email === 'admin@dsil.design'
    const isAdminByRole = userProfile?.role === 'admin'

    // Redirect admin users to admin dashboard, regular users to home
    if (isAdminByRole || isAdminByEmail) {
      redirect('/admin/dashboard')
    } else {
      redirect('/home')
    }
  } else {
    revalidatePath('/', 'layout')
    redirect('/home')
  }
}

export async function signup(formData: FormData) {
  let supabase
  try {
    supabase = await createClient()
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    const errorMessage = encodeURIComponent('Failed to initialize authentication service. Please check configuration.')
    redirect(`/error?message=${errorMessage}`)
  }

  // Validate inputs
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const firstName = formData.get('first_name') as string
  const lastName = formData.get('last_name') as string

  if (!email || !password) {
    const errorMessage = encodeURIComponent('Email and password are required')
    redirect(`/error?message=${errorMessage}`)
  }

  // Validate password length (Supabase requires at least 6 characters)
  if (password.length < 6) {
    const errorMessage = encodeURIComponent('Password must be at least 6 characters long')
    redirect(`/error?message=${errorMessage}`)
  }

  const data = {
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/confirm`
    }
  }

  const { data: signUpData, error } = await supabase.auth.signUp(data)

  if (error) {
    const errorMessage = encodeURIComponent(error.message || 'Failed to create account')
    redirect(`/error?message=${errorMessage}`)
  }

  // Check if email confirmation is required
  if (signUpData?.user?.identities?.length === 0) {
    // User exists but email not confirmed
    const message = encodeURIComponent('An account with this email already exists. Please check your email for confirmation.')
    redirect(`/signup/verify-email?message=${message}`)
  }

  // Check if we need email confirmation
  const needsEmailConfirmation = signUpData?.user && !signUpData.session

  if (needsEmailConfirmation) {
    // Redirect to a page informing user to check their email
    redirect('/signup/verify-email')
  }

  // If we have a session, user is logged in (email confirmation disabled)
  if (signUpData?.session && signUpData?.user) {
    // Check if new user is admin and redirect accordingly
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', signUpData.user.id)
      .single()

    revalidatePath('/', 'layout')
    
    // Check if user is admin by email as fallback
    const isAdminByEmail = signUpData.user.email === 'admin@dsil.design'
    const isAdminByRole = userProfile?.role === 'admin'
    
    // Redirect admin users to admin dashboard, regular users to home
    if (isAdminByRole || isAdminByEmail) {
      redirect('/admin/dashboard')
    } else {
      redirect('/home')
    }
  }

  // Default to verify email page
  redirect('/signup/verify-email')
}
