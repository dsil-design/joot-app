import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Server-side admin authentication helper for API routes
 * Returns the authenticated user if they have admin role, otherwise returns error response
 */
export async function requireAdminAuth(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    };
  }

  // Create Supabase client for server-side auth
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // No-op for API routes
      },
    },
  });

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        user: null,
        response: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      };
    }

    // Check if user has admin role
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');

    if (adminError) {
      console.error('Error checking admin status:', adminError);
      return {
        user: null,
        response: NextResponse.json(
          { error: 'Authorization check failed' },
          { status: 500 }
        )
      };
    }

    if (!isAdmin) {
      return {
        user: null,
        response: NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        )
      };
    }

    // Return user if admin check passes
    return {
      user,
      response: null
    };

  } catch (error) {
    console.error('Admin auth error:', error);
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Authentication error' },
        { status: 500 }
      )
    };
  }
}