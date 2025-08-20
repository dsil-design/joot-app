# Vercel Deployment Guide

This guide explains how to deploy the Joot app to Vercel and troubleshoot common issues.

## Prerequisites

1. **Vercel Account**: Create an account at [vercel.com](https://vercel.com)
2. **Supabase Project**: Ensure your Supabase project is set up and accessible
3. **Environment Variables**: Have your Supabase credentials ready

## Deployment Steps

### 1. Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the repository containing your Joot app

### 2. Configure Environment Variables

In your Vercel project settings, add these environment variables:

#### Required Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Optional Variables

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For server-side operations
```

#### How to Get Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL (for NEXT_PUBLIC_SUPABASE_URL)
   - anon public key (for NEXT_PUBLIC_SUPABASE_ANON_KEY)

### 3. Build Configuration

Vercel should automatically detect this as a Next.js project. The build settings should be:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

### 4. Deploy

Click "Deploy" and wait for the build to complete.

## Environment Variable Validation

Run the validation script locally to ensure your environment variables are correct:

```bash
npm run validate:env
```

This will check that all required environment variables are present and properly formatted.

## 🚨 Critical Fix: Invalid URL Error

**If you're seeing `TypeError: Invalid URL` errors in production logs**, this means your environment variables are swapped.

### Quick Fix:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Ensure the values are correctly assigned:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://uwjmgjqongcrsamprvjr.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (the JWT token)
3. **Delete and re-add** both variables if they were swapped
4. Trigger a new deployment

## Common Issues and Solutions

### 1. MIDDLEWARE_INVOCATION_FAILED Error

**Symptoms**: 500 error with middleware invocation failed

**Causes**: 
- Missing environment variables on Vercel
- Middleware syntax errors
- Edge Runtime compatibility issues

**Solutions**:
1. Verify environment variables are set in Vercel project settings
2. Check that variable names match exactly (case-sensitive)
3. Ensure Supabase URLs are accessible from Vercel's edge network

### 2. Authentication Not Working

**Symptoms**: Users can't log in or are redirected incorrectly

**Causes**:
- Incorrect Supabase URL or API key
- Site URL not configured in Supabase
- Cookie/session issues

**Solutions**:
1. Add your Vercel domain to Supabase Auth settings:
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your Vercel URL: `https://your-app.vercel.app`
2. Verify environment variables match your Supabase project
3. Check that cookies are being set correctly

### 3. Build Failures

**Symptoms**: Build fails during deployment

**Causes**:
- TypeScript errors
- ESLint errors
- Missing dependencies

**Solutions**:
1. Run `npm run build` locally to identify issues
2. Fix any TypeScript or ESLint errors
3. Ensure all dependencies are listed in package.json

### 4. Static Assets Not Loading

**Symptoms**: Images, CSS, or other assets return 404

**Causes**:
- Incorrect asset paths
- Middleware intercepting asset requests

**Solutions**:
1. Check middleware matcher patterns exclude static assets
2. Verify asset paths are correct and case-sensitive
3. Use Next.js Image component for images

## Middleware Configuration

The middleware has been configured with:

1. **Edge Runtime Compatibility**: Optimized for Vercel's edge network
2. **Comprehensive Error Handling**: Prevents crashes from breaking the app
3. **Environment Variable Validation**: Graceful fallback if variables are missing
4. **Route Protection**: Proper handling of public vs protected routes
5. **Static Asset Exclusion**: Prevents middleware from intercepting static files

## Testing the Deployment

After deployment, test these scenarios:

1. **Public Routes**: Visit `/`, `/login`, `/signup` - should load without authentication
2. **Protected Routes**: Visit `/dashboard` - should redirect to login if not authenticated
3. **Authentication Flow**: Complete login/signup process
4. **Asset Loading**: Verify images, CSS, and JavaScript load correctly
5. **Mobile/Desktop**: Test on different devices and screen sizes

## Error Handling

The app includes comprehensive error handling:

### Missing Environment Variables
If environment variables are missing, the app will:
- Redirect to `/error` page with a clear error message
- Display instructions to configure Supabase credentials
- Prevent the app from crashing with unclear errors

### Common Error Types
1. **Environment variables not set**: Add them in Vercel dashboard for all environments
2. **Wrong Supabase URL**: Ensure you're using the correct project URL from Supabase
3. **Invalid anon key**: Make sure you're using the anon/public key, not the service role key
4. **Deployment not triggered**: After adding env vars, manually trigger a new deployment

### Error Pages
- Missing env vars redirect to error page with instructions
- Authentication failures are handled gracefully
- Server errors display user-friendly messages with retry options

## Production Checklist

Before deploying to production:

- [ ] Supabase project created and configured
- [ ] Database schema applied (run migrations in Supabase)
- [ ] Environment variables added to Vercel for all environments
- [ ] Test deployment works correctly
- [ ] Authentication flow tested
- [ ] Error pages display correctly
- [ ] Site URL configured in Supabase Auth settings

## Debugging

### Vercel Function Logs
1. Go to Vercel Dashboard → Your Project → Functions tab
2. Look for middleware function logs
3. Check for error messages or failed invocations

### Local Development
```bash
npm run dev
```
Test locally first to ensure everything works before deploying.

### Environment Validation
```bash
npm run validate:env
```
Verify environment variables are configured correctly.

## Verification

After deployment, the app should:
1. Load without server errors
2. Redirect to login page for protected routes
3. Allow user registration and authentication
4. Display proper error messages for missing configuration

## Support

If you encounter issues:

1. Check Vercel deployment logs
2. Verify Supabase project configuration
3. Test authentication flow locally
4. Review environment variable setup
5. Check middleware configuration

For persistent issues, review the Next.js and Supabase documentation for Edge Runtime compatibility.
