-- ─── Fix: incident_reports RLS ───────────────────────────────────────────────
--
-- Bug: la politique d'insertion/lecture propriétaire comparait v.owner_id à
-- auth.uid(), mais vehicles.owner_id est une FK vers owner_profiles.id et non
-- vers auth.users.id. La vérification ne fonctionnait donc jamais pour les
-- propriétaires (seuls les chauffeurs, via driver_id = auth.uid(), auraient pu
-- passer, et ce cas n'était même pas couvert).
--
-- Correction :
--   • Propriétaire : jointure via owner_profiles (op.user_id = auth.uid())
--   • Chauffeur assigné : v.driver_id = auth.uid()

-- Supprimer les anciennes politiques incorrectes
drop policy if exists "incident_reports_owner_insert" on public.incident_reports;
drop policy if exists "incident_reports_owner_select" on public.incident_reports;

-- Lecture : auteur direct, propriétaire via owner_profiles, ou chauffeur assigné
create policy "incident_reports_owner_select"
  on public.incident_reports for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.vehicles v
      join public.owner_profiles op on op.id = v.owner_id
      where v.id = vehicle_id
        and op.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.vehicles v
      where v.id = vehicle_id
        and v.driver_id = auth.uid()
    )
  );

-- Insertion : auteur = utilisateur connecté ET (propriétaire via owner_profiles OU chauffeur assigné)
create policy "incident_reports_owner_insert"
  on public.incident_reports for insert
  with check (
    auth.uid() = user_id
    and (
      exists (
        select 1
        from public.vehicles v
        join public.owner_profiles op on op.id = v.owner_id
        where v.id = vehicle_id
          and op.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.vehicles v
        where v.id = vehicle_id
          and v.driver_id = auth.uid()
      )
    )
  );
