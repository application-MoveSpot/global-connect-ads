create table public.ai_brief_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  service_type text not null,
  vehicle_type text,
  answers jsonb not null default '{}'::jsonb,
  generated_text_brief text,
  mockup_url text,
  mockup_prompt text,
  regeneration_count integer not null default 0,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_brief_data TO authenticated;
GRANT ALL ON public.ai_brief_data TO service_role;

alter table public.ai_brief_data enable row level security;

alter table public.service_quotes
  add column if not exists ai_brief_id uuid;

create policy "Users manage their own AI briefs"
on public.ai_brief_data for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Providers can read briefs linked to their quotes"
on public.ai_brief_data for select to authenticated
using (exists (
  select 1 from public.service_quotes sq
  where sq.ai_brief_id = id and sq.provider_id = auth.uid()
));

alter table public.service_quotes
  add constraint service_quotes_ai_brief_id_fkey
  foreign key (ai_brief_id) references public.ai_brief_data(id);