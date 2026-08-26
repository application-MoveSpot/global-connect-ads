import { useState, useCallback, useRef } from "react";
import { withRetry } from "@/lib/retry";

type State<T> = { data: T | null; loading: boolean; error: string | null };

/**
 * Wraps an async loader with automatic exponential-backoff retry.
 * Returns { data, loading, error, run } where `run()` triggers a fresh load.
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  { maxAttempts = 3 }: { maxAttempts?: number } = {},
) {
  const [state, setState] = useState<State<T>>({ data: null, loading: false, error: null });
  // Keep a stable reference to the latest loader so callers can pass inline fns.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await withRetry(() => loaderRef.current(), { maxAttempts });
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur réseau. Veuillez réessayer.";
      setState((s) => ({ ...s, loading: false, error: msg }));
      return null;
    }
  }, [maxAttempts]);

  return { ...state, run };
}
