# Admin Interface Setup

## Current Implementation (Development/Testing)

The admin interface is currently **available to all authenticated users** for testing purposes. Simply:

1. **Log in with any user account**
2. **Click your avatar** in the top-right corner
3. **Select "Admin Dashboard"** from the dropdown menu

## Accessing the Admin Interface

The admin interface is accessible at `/admin/exchange-rates` and includes:

- **System Health**: Real-time monitoring of sync status and data quality
- **Data Quality Dashboard**: Metrics, source breakdowns, and gap detection  
- **Manual Sync Controls**: Trigger fiat, crypto, or backfill operations
- **Exchange Rate Explorer**: Interactive lookup for any currency pair/date
- **Sync History**: Audit trail of all synchronization operations

## Production Setup (Future Implementation)

For production deployment, you should implement proper role-based access control:

### Option 1: Database-based Roles

```sql
-- Add role column to users table
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';

-- Create admin users
UPDATE users SET role = 'admin' WHERE email IN ('admin@yourcompany.com');
```

Then update the auth checks:

```typescript
// Check user role from database
const { data: userProfile } = await supabase
  .from('users')
  .select('role')
  .eq('id', user.id)
  .single();

const isAdmin = userProfile?.role === 'admin';
```

### Option 2: Environment-based Admin List

```bash
# .env.local
ADMIN_EMAILS=admin@yourcompany.com,manager@yourcompany.com
```

### Option 3: External Auth Provider Roles

Configure roles in your auth provider (e.g., Supabase Auth, Auth0) and check user metadata.

## Security Notes

- API endpoints currently allow development access without authentication
- All admin operations are logged for audit purposes
- In production, add proper authentication middleware
- Consider implementing permission levels (read-only vs full admin)
- Rate limit admin API endpoints to prevent abuse

## Files to Update for Production

1. `src/app/home/page.tsx` - Admin check logic
2. `src/app/admin/exchange-rates/page.tsx` - Page access control
3. `src/app/api/admin/trigger-sync/route.ts` - API authentication
4. Add proper database schema for roles
5. Implement proper session/JWT validation