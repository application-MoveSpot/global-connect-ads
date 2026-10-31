-- Correctif : recrée la vue public_provider_profiles si elle a été supprimée
-- lors de la migration 20261031020000 (drop view sans recréation réussie).
-- Utilise CREATE OR REPLACE pour être idempotent.

-- 1. Recréer la vue sans DROP préalable
create or replace view public_provider_profiles as
select
  pp.user_id,
  pp.company,
  pp.full_name,
  pp.description,
  pp.coverage_areas,
  pp.pricing_info,
  pp.logo_url,
  pp.website,
  pp.services,
  pp.created_at
from provider_profiles pp
where pp.is_active = true;

-- 2. Recrée la fonction match_providers avec le type vector correct (sans préfixe extensions.)
create or replace function match_providers(
  query_embedding vector(1536),
  match_threshold float default 0.3,
  match_count int default 20,
  filter_category text default null
)
returns table (
  user_id uuid,
  company text,
  full_name text,
  description text,
  coverage_areas text[],
  pricing_info text,
  logo_url text,
  website text,
  services text[],
  similarity float
)
language sql stable
as $$
  select
    pp.user_id,
    pp.company,
    pp.full_name,
    pp.description,
    pp.coverage_areas,
    pp.pricing_info,
    pp.logo_url,
    pp.website,
    pp.services,
    1 - (pp.embedding <=> query_embedding) as similarity
  from provider_profiles pp
  where
    pp.is_active = true
    and pp.embedding is not null
    and (filter_category is null or pp.services @> array[filter_category])
    and 1 - (pp.embedding <=> query_embedding) > match_threshold
  order by pp.embedding <=> query_embedding
  limit match_count;
$$;
