import { Page } from '@playwright/test';

export async function mockSupabaseAuth(page: Page, user: any) {
  // Mock Supabase auth session
  await page.addInitScript((mockUser) => {
    // Mock localStorage auth token
    window.localStorage.setItem('supabase.auth.token', JSON.stringify({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Date.now() + 3600000,
      user: mockUser
    }));
    
    // Mock Supabase client
    (window as any).mockSupabaseClient = {
      auth: {
        getUser: () => Promise.resolve({ data: { user: mockUser }, error: null }),
        getSession: () => Promise.resolve({ 
          data: { 
            session: {
              access_token: 'mock-access-token',
              user: mockUser
            }
          }, 
          error: null 
        }),
        onAuthStateChange: (callback: any) => {
          callback('SIGNED_IN', { user: mockUser });
          return { data: { subscription: { unsubscribe: () => {} } } };
        }
      },
      from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null })
      })
    };
  }, user);
}