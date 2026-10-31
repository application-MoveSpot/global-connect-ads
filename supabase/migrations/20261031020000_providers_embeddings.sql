-- Enable pgvector extension (idempotent)
create extension if not exists vector with schema extensions;

-- Add embedding column to provider_profiles (source table)
alter table provider_profiles
  add column if not exists embedding vector(1536);

-- NOTE: public_provider_profiles view already exists and uses status = 'approved'.
-- Do NOT drop/recreate it here — the original view definition is correct.

-- RPC: cosine similarity search on providers
-- Returns providers whose embedding is within match_threshold of the query embedding.
-- An optional category filter narrows by service key.
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

-- HNSW index for cosine similarity (works with any number of rows)
create index if not exists provider_profiles_embedding_hnsw
  on provider_profiles
  using hnsw (embedding vector_cosine_ops);
