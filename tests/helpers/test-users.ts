export async function createAdminUser() {
  return {
    id: 'admin-test-user-123',
    email: 'admin@test.com',
    role: 'admin',
    user_metadata: {
      name: 'Test Admin'
    },
    raw_user_meta_data: {
      is_admin: 'true'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export async function createRegularUser() {
  return {
    id: 'regular-test-user-456',
    email: 'user@test.com',
    role: 'user',
    user_metadata: {
      name: 'Test User'
    },
    raw_user_meta_data: {
      is_admin: 'false'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}