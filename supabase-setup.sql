-- Run this in Supabase Dashboard > SQL Editor

-- User data table for syncing settings, meals, weight, etc.
create table if not exists user_data (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  key text not null,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  unique(user_id, key)
);

-- Enable Row Level Security
alter table user_data enable row level security;

-- Users can only read/write their own data
create policy "Users can read own data" on user_data
  for select using (auth.uid() = user_id);

create policy "Users can insert own data" on user_data
  for insert with check (auth.uid() = user_id);

create policy "Users can update own data" on user_data
  for update using (auth.uid() = user_id);

create policy "Users can delete own data" on user_data
  for delete using (auth.uid() = user_id);
