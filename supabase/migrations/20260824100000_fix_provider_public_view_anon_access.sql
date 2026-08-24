-- Fix anonymous access to public provider listings and sitemap.
--
-- Migration 20260816100000 recreated public_provider_profiles with
-- security_invoker = on. Under that mode PostgreSQL validates the anon
-- role's column-level privileges against provider_profiles on every call,
-- including SSR server functions and the sitemap handler (which each create
-- a fresh client with no session). That privilege check fails in practice,
-- producing a permission-denied error that leaves the /prestataires pages
-- empty and omits all provider URLs from the sitemap.
--
-- Fix: recreate the view without security_invoker = on (defaults to off).
-- The view owner (postgres) is a superuser, so RLS on the underlying table
-- is bypassed; the view's WHERE clause and SELECT list are the only filters.
-- Anonymous visitors cannot access provider_profiles directly — the column-
-- level grants from 20260816100000 remain and are harmless (the anon RLS
-- policy limits direct reads to approved rows anyway), but all public-facing
-- queries go through this view.

DROP VIEW IF EXISTS public.public_provider_profiles;

CREATE VIEW public.public_provider_profiles AS
SELECT
  user_id,
  company,
  full_name,
  description,
  services,
  coverage_areas,
  portfolio_urls,
  pricing_info,
  logo_url,
  website,
  created_at,
  updated_at
FROM public.provider_profiles
WHERE status = 'approved';

GRANT SELECT ON public.public_provider_profiles TO anon, authenticated;
