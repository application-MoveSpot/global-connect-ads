-- Enable pgvector extension (idempotent)
create extension if not exists vector with schema extensions;

-- Add embedding column to provider_profiles (source table)
alter table provider_profiles
  add column if not exists embedding extensions.vector(1536);

-- Recreate public_provider_profiles view to expose similarity score (not the raw embedding)
-- The view already exists — we drop and recreate to ensure it stays in sync
drop view if exists public_provider_profiles;

create view public_provider_profiles as
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

-- RPC: cosine similarity search on providers
-- Returns providers whose embedding is within match_threshold of the query embedding.
-- An optional category filter narrows by service key.
create or replace function match_providers(
  query_embedding extensions.vector(1536),
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

-- IVFFlat index for fast approximate search (build after at least 100 rows exist)
-- Using lists=10 for small datasets (increase to 100+ in production)
create index if not exists providers_embedding_idx
  on provider_profiles
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 10)
  where embedding is not null;
