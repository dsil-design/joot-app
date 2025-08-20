import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Check if environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Redirect to error page if environment variables are missing
    const url = request.nextUrl.clone()
    url.pathname = '/error'
    url.searchParams.set('message', 'Configuration error: Missing Supabase environment variables')
    return NextResponse.redirect(url)
  }

  try {

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
              supabaseResponse = NextResponse.next({
                request,
              })
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
              )
            } catch {
              // Cookie setting failed, continue without setting cookies
            }
          },
        },
      }
    )

    // Get current path
    const path = request.nextUrl.pathname

    // Define public routes that don't require authentication
    const publicRoutes = [
      '/',
      '/login',
      '/signup',
      '/auth',
      '/api',
      '/error',
      '/demo',
      '/docs',
    ]

    // Check if current path is public
    const isPublicRoute = publicRoutes.some(route => 
      path === route || path.startsWith(`${route}/`)
    )

    // If it's a public route, allow access
    if (isPublicRoute) {
      return supabaseResponse
    }

    // For protected routes, check authentication
    let user = null
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch {
      // If auth check fails, redirect to login for protected routes
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // If no user and trying to access protected route, redirect to login
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Check for admin routes that require admin role
    if (path.startsWith('/admin')) {
      try {
        const { data: isAdminData, error } = await supabase.rpc('is_admin')
        
        if (error || !isAdminData) {
          // Not an admin, redirect to unauthorized page or home
          const url = request.nextUrl.clone()
          url.pathname = '/'
          url.searchParams.set('error', 'unauthorized')
          return NextResponse.redirect(url)
        }
      } catch {
        // Error checking admin status, redirect to home
        const url = request.nextUrl.clone()
        url.pathname = '/'
        url.searchParams.set('error', 'auth_error')
        return NextResponse.redirect(url)
      }
    }

    return supabaseResponse
  } catch {
    // Middleware auth error - redirect to login for security
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'auth_failed')
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes (handled separately)
     * - static assets with extensions
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
