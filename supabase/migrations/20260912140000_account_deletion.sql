-- Audit des suppressions de compte (RGPD art. 17)
-- Permet de :
--   1. Planifier la suppression physique du compte auth à J+30
--   2. Auditer les demandes de suppression
--   3. Permettre l'annulation dans les 30 jours
create table if not exists public.account_deletion_requests (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null,          -- auth.users.id (l'utilisateur peut ne plus exister après hard-delete)
  requested_at     timestamptz not null default now(),
  scheduled_hard_delete_at timestamptz not null,  -- J+30
  cancelled_at     timestamptz,             -- si l'utilisateur annule dans les 30 jours
  executed_at      timestamptz,             -- quand l'admin / cron a réellement supprimé le compte auth
  reason           text,                    -- raison optionnelle fournie par l'utilisateur
  blocker_details  text                     -- si refusé, détail du blocage (audit)
);

-- Seul l'admin peut lire cette table
alter table public.account_deletion_requests enable row level security;

create policy "admin_only" on public.account_deletion_requests
  for all using (
    exists (select 1 from public.admin_profiles where user_id = auth.uid())
  );

-- Index pour le cron de hard-delete
create index if not exists idx_account_deletion_pending
  on public.account_deletion_requests (scheduled_hard_delete_at)
  where cancelled_at is null and executed_at is null;
