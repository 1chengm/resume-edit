-- 表结构
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone default now()
);

create table if not exists public.resumes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  title text not null default '未命名简历',
  template text not null default 'Modern',
  color_theme text not null default '#2b8cee',
  share_uuid uuid,
  share_permission text check (share_permission in ('public','private','password')),
  share_password_hash text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.resume_content (
  resume_id uuid primary key references public.resumes(id) on delete cascade,
  content_json jsonb not null default '{}'
);

create table if not exists public.ai_analysis_history (
  id uuid default gen_random_uuid() primary key,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  type text check (type in ('resume','jd')),
  model text,
  input_hash text,
  output_json jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.resume_stats (
  id uuid default gen_random_uuid() primary key,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  type text check (type in ('pdf_download','share_view')),
  count int not null default 0,
  created_at timestamp with time zone default now()
);

create index if not exists resumes_user_idx on public.resumes(user_id);
create index if not exists resumes_share_uuid_idx on public.resumes(share_uuid);
create index if not exists resume_content_resume_idx on public.resume_content(resume_id);
create index if not exists history_resume_idx on public.ai_analysis_history(resume_id);
create index if not exists stats_resume_idx on public.resume_stats(resume_id);

-- RLS 策略
alter table public.resumes enable row level security;
alter table public.resume_content enable row level security;
alter table public.ai_analysis_history enable row level security;
alter table public.resume_stats enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "resume_owner_select" on public.resumes;
create policy "resume_owner_select" on public.resumes for select using ((select auth.uid()) = user_id);
drop policy if exists "resume_owner_modify" on public.resumes;
create policy "resume_owner_modify" on public.resumes for all using ((select auth.uid()) = user_id);
drop policy if exists "resume_owner_insert" on public.resumes;
create policy "resume_owner_insert" on public.resumes for insert with check ((select auth.uid()) = user_id);

drop policy if exists "resume_share_public_select" on public.resumes;
create policy "resume_share_public_select" on public.resumes for select using (share_permission = 'public');

drop policy if exists "resume_content_owner_select" on public.resume_content;
create policy "resume_content_owner_select" on public.resume_content for select using (
  exists(select 1 from public.resumes r where r.id = resume_id and r.user_id = (select auth.uid()))
);
drop policy if exists "resume_content_owner_modify" on public.resume_content;
create policy "resume_content_owner_modify" on public.resume_content for all using (
  exists(select 1 from public.resumes r where r.id = resume_id and r.user_id = (select auth.uid()))
);

drop policy if exists "resume_content_share_public_select" on public.resume_content;
create policy "resume_content_share_public_select" on public.resume_content for select using (
  exists(select 1 from public.resumes r where r.id = resume_id and r.share_permission = 'public')
);

drop policy if exists "history_owner_select" on public.ai_analysis_history;
create policy "history_owner_select" on public.ai_analysis_history for select using (
  exists(select 1 from public.resumes r where r.id = resume_id and r.user_id = (select auth.uid()))
);
drop policy if exists "history_owner_insert" on public.ai_analysis_history;
create policy "history_owner_insert" on public.ai_analysis_history for insert with check (
  exists(select 1 from public.resumes r where r.id = resume_id and r.user_id = (select auth.uid()))
);

drop policy if exists "stats_owner_modify" on public.resume_stats;
create policy "stats_owner_modify" on public.resume_stats for all using (
  exists(select 1 from public.resumes r where r.id = resume_id and r.user_id = (select auth.uid()))
);
drop policy if exists "stats_owner_insert" on public.resume_stats;
create policy "stats_owner_insert" on public.resume_stats for insert with check (
  exists(select 1 from public.resumes r where r.id = resume_id and r.user_id = (select auth.uid()))
);

drop policy if exists "profiles_owner_select" on public.profiles;
create policy "profiles_owner_select" on public.profiles for select using ((select auth.uid()) = user_id);
drop policy if exists "profiles_owner_modify" on public.profiles;
create policy "profiles_owner_modify" on public.profiles for all using ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists set_resumes_updated_at on public.resumes;
create trigger set_resumes_updated_at before update on public.resumes
for each row execute function public.set_updated_at();
create table if not exists public.resume_content_versions (
  id uuid default gen_random_uuid() primary key,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  content_json jsonb not null,
  created_at timestamp with time zone default now()
);
alter table public.resume_content_versions enable row level security;
drop policy if exists "resume_versions_owner_select" on public.resume_content_versions;
create policy "resume_versions_owner_select" on public.resume_content_versions for select using (
  exists(select 1 from public.resumes r where r.id = resume_id and r.user_id = (select auth.uid()))
);
drop policy if exists "resume_versions_owner_insert" on public.resume_content_versions;
create policy "resume_versions_owner_insert" on public.resume_content_versions for insert with check (
  exists(select 1 from public.resumes r where r.id = resume_id and r.user_id = (select auth.uid()))
);