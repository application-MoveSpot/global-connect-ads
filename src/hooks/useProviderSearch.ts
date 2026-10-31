import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Provider = {
  user_id: string;
  company: string;
  full_name: string;
  description: string;
  coverage_areas: string[];
  pricing_info: string | null;
  logo_url: string | null;
  website: string | null;
  services: string[];
  similarity?: number;
};

type SearchMode = "keyword" | "semantic";

const DEBOUNCE_MS = 600;
const MIN_SEMANTIC_CHARS = 3;

export function useProviderSearch(q: string, serviceFilter: string) {
  const [results, setResults] = useState<Provider[]>([]);
  const [allProviders, setAllProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [mode, setMode] = useState<SearchMode>("keyword");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load all providers once on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("public_provider_profiles")
        .select(
          "user_id, company, full_name, description, coverage_areas, pricing_info, logo_url, website, services",
        )
        .order("created_at", { ascending: false });
      setAllProviders((data as Provider[]) ?? []);
      setLoading(false);
    })();
  }, []);

  // Search effect — debounced
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = q.trim();

    // No query — keyword filter only
    if (trimmed.length < MIN_SEMANTIC_CHARS) {
      setMode("keyword");
      const filtered = allProviders.filter((p) => {
        if (serviceFilter && !p.services?.includes(serviceFilter)) return false;
        if (!trimmed) return true;
        const s = trimmed.toLowerCase();
        return (
          p.company.toLowerCase().includes(s) ||
          p.description.toLowerCase().includes(s) ||
          p.coverage_areas.some((z) => z.toLowerCase().includes(s))
        );
      });
      setResults(filtered.map((p) => ({ ...p, similarity: undefined })));
      return;
    }

    // Semantic search after debounce
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setMode("semantic");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // 1. Generate embedding via Edge Function
        const { data: fnData, error: fnError } = await supabase.functions.invoke("embed-query", {
          body: { text: trimmed },
        });

        if (controller.signal.aborted) return;

        if (fnError || !fnData?.embedding) {
          // Fall back to keyword search on error
          console.warn("embed-query failed, falling back to keyword search:", fnError);
          setMode("keyword");
          const s = trimmed.toLowerCase();
          const filtered = allProviders.filter((p) => {
            if (serviceFilter && !p.services?.includes(serviceFilter)) return false;
            return (
              p.company.toLowerCase().includes(s) ||
              p.description.toLowerCase().includes(s) ||
              p.coverage_areas.some((z) => z.toLowerCase().includes(s))
            );
          });
          setResults(filtered.map((p) => ({ ...p, similarity: undefined })));
          return;
        }

        // 2. RPC call with cosine similarity
        // match_providers n'est pas encore dans les types Supabase générés — cast as any
        const { data: matches, error: rpcError } = await (supabase as any).rpc("match_providers", {
          query_embedding: fnData.embedding,
          match_threshold: 0.25,
          match_count: 30,
          filter_category: serviceFilter || null,
        });

        if (controller.signal.aborted) return;

        if (rpcError) {
          console.warn("match_providers RPC failed:", rpcError);
          // Graceful degradation
          setResults([]);
          return;
        }

        setResults((matches as Provider[]) ?? []);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.warn("semantic search error:", err);
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, serviceFilter, allProviders]);

  return { results, loading, searching, mode };
}
