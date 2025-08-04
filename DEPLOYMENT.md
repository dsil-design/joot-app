# Vercel Deployment Setup

## 🚨 CRITICAL FIX: Invalid URL Error

**If you're seeing `TypeError: Invalid URL` errors in production logs**, this means your environment variables are swapped.

**Quick Fix**:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Ensure the values are correctly assigned:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://uwjmgjqongcrsamprvjr.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (the JWT token)
3. **Delete and re-add** both variables if they were swapped
4. Trigger a new deployment

---

## Required Environment Variables

Add these environment variables in your Vercel project settings:

### 1. Go to Vercel Dashboard
- Navigate to your project
- Go to Settings > Environment Variables

### 2. Add Supabase Variables
Add these two environment variables for ALL environments (Production, Preview, Development):

**NEXT_PUBLIC_SUPABASE_URL**
- Value: Your Supabase project URL (from Supabase Dashboard > Settings > API)
- Example: `https://your-project-ref.supabase.co`

**NEXT_PUBLIC_SUPABASE_ANON_KEY**
- Value: Your Supabase anon/public key (from Supabase Dashboard > Settings > API)
- Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. Redeploy
After adding the environment variables, trigger a new deployment.

## How to Get Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings > API
4. Copy:
   - Project URL (for NEXT_PUBLIC_SUPABASE_URL)
   - anon public key (for NEXT_PUBLIC_SUPABASE_ANON_KEY)

## Verification

After deployment, the app should:
1. Load without server errors
2. Redirect to login page
3. Allow user registration and authentication

## Troubleshooting

### Missing Environment Variables
If environment variables are missing, the app will:
- Redirect to `/error` page with a clear error message
- Display instructions to configure Supabase credentials
- Prevent the app from crashing with unclear errors

### Common Issues
1. **Environment variables not set**: Add them in Vercel dashboard for all environments
2. **Wrong Supabase URL**: Ensure you're using the correct project URL from Supabase
3. **Invalid anon key**: Make sure you're using the anon/public key, not the service role key
4. **Deployment not triggered**: After adding env vars, manually trigger a new deployment

### Error Handling
The app includes comprehensive error handling:
- Missing env vars redirect to error page with instructions
- Authentication failures are handled gracefully
- Server errors display user-friendly messages with retry options

## Production Checklist

Before deploying to production:
- [ ] Supabase project created and configured
- [ ] Database schema applied (run `schema.sql` in Supabase SQL Editor)
- [ ] Environment variables added to Vercel
- [ ] Test deployment works correctly
- [ ] Authentication flow tested
- [ ] Error pages display correctly

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify environment variables are set correctly
3. Test Supabase connection in local development
4. Check browser console for client-side errors
