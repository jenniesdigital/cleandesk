-- CleanDesk Database Schema Setup
-- Run this script in the Supabase SQL Editor (https://supabase.com)

-- 1. PROFILES TABLE (User Onboarding & Preferences)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  role text[], -- Array of roles (e.g. ['Freelancer', 'Marketer'])
  calendar_allowed boolean default false,
  email_allowed boolean default true,
  reminder_preferences jsonb default '{"before_24h": true, "before_1h": true, "custom_hours": 0}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Profiles
alter table public.profiles enable row level security;

-- Policies for Profiles
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);


-- 2. PROJECTS TABLE
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null default auth.uid(),
  title text not null,
  description text,
  is_archived boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Projects
alter table public.projects enable row level security;

-- Policies for Projects
create policy "Users can manage their own projects" on public.projects
  for all using (auth.uid() = user_id);


-- 3. TASKS TABLE
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null default auth.uid(),
  project_id uuid references public.projects on delete set null,
  title text not null,
  description text,
  due_date date,
  due_time time without time zone,
  priority text check (priority in ('High', 'Medium', 'Low')) default 'Medium',
  status text check (status in ('To Do', 'In Progress', 'Completed')) default 'To Do',
  recurring_rule jsonb, -- e.g. {"type": "weekly", "days": ["Monday"]}
  google_calendar_event_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Tasks
alter table public.tasks enable row level security;

-- Policies for Tasks
create policy "Users can manage their own tasks" on public.tasks
  for all using (auth.uid() = user_id);


-- 4. NOTES TABLE
create table public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null default auth.uid(),
  project_id uuid references public.projects on delete cascade not null,
  title text default 'Untitled Note',
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Auto-update updated_at trigger for Notes
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_notes_updated_at before update on public.notes
for each row execute procedure public.update_updated_at_column();

-- Enable RLS on Notes
alter table public.notes enable row level security;

-- Policies for Notes
create policy "Users can manage their own notes" on public.notes
  for all using (auth.uid() = user_id);


-- 5. COMPLETIONS LOG TABLE (For Productivity Statistics)
create table public.completions_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null default auth.uid(),
  task_id uuid references public.tasks on delete cascade not null,
  completed_at date default current_date not null
);

-- Enable RLS on Completions Log
alter table public.completions_log enable row level security;

-- Policies for Completions Log
create policy "Users can manage their own completions log" on public.completions_log
  for all using (auth.uid() = user_id);


-- DELETE USER ACCOUNT FUNCTION
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.completions_log where user_id = auth.uid();
  delete from public.notes where user_id = auth.uid();
  delete from public.tasks where user_id = auth.uid();
  delete from public.projects where user_id = auth.uid();
  delete from public.user_tokens where user_id = auth.uid();
  delete from public.profiles where id = auth.uid();
end;
$$;


-- 6. USER TOKENS TABLE (For Google OAuth tokens)
create table public.user_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  provider text not null check (provider in ('google')),
  access_token text not null,
  refresh_token text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure one token set per provider per user
create unique index idx_user_tokens_provider on public.user_tokens (user_id, provider);

-- Enable RLS on User Tokens
alter table public.user_tokens enable row level security;

-- Policies for User Tokens
create policy "Users can manage their own tokens" on public.user_tokens
  for all using (auth.uid() = user_id);
