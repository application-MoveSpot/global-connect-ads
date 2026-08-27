create table if not exists analytics_events (
  id          uuid primary key default gen_random_uuid(),
  event       text not null,
  user_id     uuid references auth.users(id) on delete set null,
  session_id  text,
  properties  jsonb,
  created_at  timestamptz not null default now()
);

alter table analytics_events enable row level security;

-- Clients may insert their own events; no client-side SELECT
create policy "insert own events" on analytics_events
  for insert with check (user_id = auth.uid() or user_id is null);

create index analytics_events_event_idx     on analytics_events (event);
create index analytics_events_user_id_idx   on analytics_events (user_id);
create index analytics_events_created_at_idx on analytics_events (created_at desc);
