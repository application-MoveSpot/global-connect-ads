-- ─── incident_reports ────────────────────────────────────────────────────────
-- Signalements de sinistres / dégradations du support publicitaire (CGU §11)
-- Créé par le propriétaire ou le chauffeur depuis /owner/tracking.

create type public.incident_type as enum (
  'accident_sinistre',
  'degradation_vandalisme',
  'decollement_vinyle',
  'retrait_urgence',
  'autre'
);

create table public.incident_reports (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Auteur
  user_id             uuid not null references auth.users(id) on delete cascade,

  -- Véhicule et campagne concernés
  vehicle_id          uuid not null references public.vehicles(id) on delete cascade,
  campaign_request_id uuid references public.campaign_requests(id) on delete set null,

  -- Détails de l'incident
  incident_type       public.incident_type not null,
  description         text,

  -- Photo justificative (chemin dans le bucket "incident-reports")
  photo_path          text,

  -- Suivi admin
  status              text not null default 'open'
                        check (status in ('open', 'in_progress', 'closed')),
  admin_note          text,
  resolved_at         timestamptz
);

-- Index
create index on public.incident_reports (vehicle_id);
create index on public.incident_reports (user_id);
create index on public.incident_reports (status);
create index on public.incident_reports (created_at desc);

-- Auto-update updated_at
create or replace function public.set_incident_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_incident_reports_updated_at
  before update on public.incident_reports
  for each row execute function public.set_incident_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.incident_reports enable row level security;

-- Propriétaire / chauffeur : lire ses propres signalements
create policy "incident_reports_owner_select"
  on public.incident_reports for select
  using (auth.uid() = user_id);

-- Propriétaire / chauffeur : créer un signalement pour son propre véhicule
create policy "incident_reports_owner_insert"
  on public.incident_reports for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id
        and v.owner_id = auth.uid()
    )
  );

-- Admin : lecture totale
create policy "incident_reports_admin_select"
  on public.incident_reports for select
  using (
    exists (
      select 1 from public.admin_profiles ap
      where ap.id = auth.uid()
    )
  );

-- Admin : mise à jour (statut, note)
create policy "incident_reports_admin_update"
  on public.incident_reports for update
  using (
    exists (
      select 1 from public.admin_profiles ap
      where ap.id = auth.uid()
    )
  );
