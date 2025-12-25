# Joot - Transaction Tracker

A personal transaction tracking application with USD/THB currency conversion.

## Features

- Transaction management (add, edit, view)
- USD/THB currency conversion with historical exchange rates from ECB
- Monthly financial dashboard
- Vendor and payment method tracking
- Tag-based categorization

## Tech Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Auth**: Supabase Auth
- **UI**: shadcn/ui components with Tailwind CSS
- **Language**: TypeScript

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   Visit [http://localhost:3000](http://localhost:3000)

## Available Scripts

```bash
npm run dev        # Start dev server (Turbopack)
npm run build      # Production build
npm run lint       # Run ESLint
npm run db:test    # Test Supabase connection
```

## Project Structure

```
src/
├── app/           # Next.js App Router pages
├── components/    # React components (ui/, page-specific/, forms/)
├── hooks/         # Custom React hooks
└── lib/           # Utilities & Supabase client

database/
├── migrations/    # SQL migration files
├── schema.sql     # Database schema (source of truth)
└── new-migration.sh
```

## Deployment

- **App**: Vercel (auto-deploy from main branch)
- **Database**: Supabase

## Development Notes

See `CLAUDE.md` for detailed development guidance.
