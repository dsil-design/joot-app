# Joot - Transaction Tracker

[![CI/CD Pipeline](https://github.com/dsil-design/joot-app/actions/workflows/cicd.yml/badge.svg)](https://github.com/dsil-design/joot-app/actions/workflows/cicd.yml)

A comprehensive Next.js 15 transaction tracking application with USD/THB currency conversion capabilities. Built with TypeScript, React 19, Supabase, and shadcn/ui components.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment.

### Workflow Overview

The CI/CD pipeline includes the following jobs:

1. **Type Checking**: Validates TypeScript types across the entire codebase
2. **Linting**: Ensures code quality and consistent formatting using ESLint
3. **Build Verification**: Tests that the application builds successfully
4. **Unit Tests**: Runs the complete unit test suite

### Required Secrets

For the workflows to function properly, the following GitHub secrets must be configured:

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

**Optional Variables:**
- `SUPABASE_PROJECT_REF` - Supabase project reference (for advanced workflows)
- `SUPABASE_ACCESS_TOKEN` - Supabase CLI access token
- `SUPABASE_DB_PASSWORD` - Database password for direct access
- `AWS_ACCESS_KEY_ID` - AWS credentials for backup storage
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `VERCEL_TOKEN` - Vercel API token for deployment management

### Triggering Workflows

**Automatic Triggers:**
The CI/CD pipeline automatically runs on pushes to the main branch when changes affect:
- Source code (`src/**`)
- Database schema (`supabase/**`)
- Dependencies (`package.json`, `package-lock.json`)
- Configuration files (`next.config.ts`, `tsconfig.json`)

**Manual Triggers:**
You can manually trigger workflows via GitHub Actions UI or CLI:

```bash
# Trigger CI/CD pipeline
gh workflow run cicd.yml --repo dsil-design/joot-app --field environment=production

# Trigger rollback (requires confirmation)
gh workflow run rollback.yml --repo dsil-design/joot-app \
  --field reason="Fixing critical bug" \
  --field confirm_rollback=true
```

### Common Failure Causes

1. **Missing Environment Variables**: Ensure all required secrets are configured in GitHub repository settings
2. **TypeScript Errors**: Fix any type checking errors before pushing
3. **Linting Failures**: Run `npm run lint` locally to fix code style issues
4. **Build Failures**: Run `npm run build` locally to identify build issues
5. **Test Failures**: Run `npm run test:unit` locally to fix failing tests

### Development Workflow

1. Create a feature branch from `main`
2. Make your changes and test locally
3. Push to your feature branch (this won't trigger CI/CD)
4. Create a pull request to merge into `main`
5. CI/CD will automatically run when the PR is merged

### Emergency Procedures

If you need to quickly rollback a deployment:

1. Go to the [GitHub Actions page](https://github.com/dsil-design/joot-app/actions)
2. Click on "Manual Rollback" workflow
3. Click "Run workflow" and provide a reason
4. **Important**: Check "confirm_rollback" to proceed

For urgent issues, contact the development team immediately.
