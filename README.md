# CleanDesk

An AI-powered intelligent workspace — turn mental clutter into organized action.

- Dump unstructured thoughts and let Gemini AI auto-organize them into projects and tasks
- Manage tasks, projects, and notes in a calm, distraction-free workspace
- Google Calendar sync for task events
- Email reminders via Resend
- Supabase auth + PostgreSQL database with Row Level Security

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + custom CSS
- **Database:** Supabase (PostgreSQL) with localStorage fallback
- **Auth:** Supabase Auth (Google OAuth)
- **AI:** Google Gemini 2.0 Flash
- **Email:** Resend
- **Calendar:** Google Calendar API

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `GEMINI_API_KEY` — Google Gemini API key
- `RESEND_API_KEY` — Resend API key
- `NEXT_PUBLIC_APP_URL` — Deployment URL

## Database

Run `supabase-schema.sql` in your Supabase SQL Editor to create the schema (profiles, projects, tasks, notes, completions_log with RLS policies).

## Deployment

Deploy to Vercel with environment variables configured. Set up Vercel Cron Jobs for the `/api/cron/reminders` endpoint.
