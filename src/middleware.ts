import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Middleware automatically runs on Edge Runtime in Next.js 15

export async function middleware(request: NextRequest) {
  try {
    // Check if required environment variables are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      // Missing Supabase environment variables - allow request to continue
      return NextResponse.next()
    }

    let supabaseResponse = NextResponse.next({
      request,
    })

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

    return supabaseResponse
  } catch {
    // In case of any error, allow the request to continue
    // This prevents the app from completely breaking
    return NextResponse.next()
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
