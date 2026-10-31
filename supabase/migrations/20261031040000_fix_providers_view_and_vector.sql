-- Ce fichier corrigeait des erreurs dans 20261031020000 qui sont maintenant
-- directement corrigées dans ce fichier source. Cette migration est un no-op
-- idempotent pour éviter toute erreur si appliquée sur un projet déjà à jour.

-- Garantit que la vue existe avec la condition correcte (status = 'approved')
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
where pp.status = 'approved';

-- Garantit que la fonction match_providers existe avec la bonne condition
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
    pp.status = 'approved'
    and pp.embedding is not null
    and (filter_category is null or pp.services @> array[filter_category])
    and 1 - (pp.embedding <=> query_embedding) > match_threshold
  order by pp.embedding <=> query_embedding
  limit match_count;
$$;
