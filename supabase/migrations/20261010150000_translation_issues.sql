-- Table for tracking translation/language issues detected client-side
create table if not exists public.translation_issues (
  id           uuid primary key default gen_random_uuid(),
  route        text not null,
  text_snippet text not null,
  element_path text,
  detected_lang text not null default 'en',
  expected_lang text not null default 'fr',
  occurrences  int  not null default 1,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references auth.users(id),
  resolution_note text
);

-- One row per (route, text_snippet) pair – update occurrences on conflict
create unique index if not exists translation_issues_route_snippet_idx
  on public.translation_issues (route, text_snippet);

-- Admins can do everything; anonymous/authenticated users can only insert
alter table public.translation_issues enable row level security;

create policy "anyone can insert translation issues"
  on public.translation_issues for insert
  with check (true);

create policy "admins can read and update translation issues"
  on public.translation_issues for all
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );
