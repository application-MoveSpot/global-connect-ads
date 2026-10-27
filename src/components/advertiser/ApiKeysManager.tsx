import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateApiKey, listApiKeys, revokeApiKey } from "@/lib/api/api-keys.functions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus, Trash2, Copy, Check, ExternalLink } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function ApiKeysManager() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listApiKeys);
  const generateFn = useServerFn(generateApiKey);
  const revokeFn = useServerFn(revokeApiKey);

  const { data, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => listFn(),
  });

  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [genError, setGenError] = useState("");

  const generate = useMutation({
    mutationFn: async () => {
      setGenError("");
      const res = await generateFn({ data: { name: newKeyName || "Clé API" } });
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: (res) => {
      setRevealedKey(res.key);
      setNewKeyName("");
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (err: Error) => setGenError(err.message),
  });

  const revoke = useMutation({
    mutationFn: async (keyId: string) => {
      const res = await revokeFn({ data: { keyId } });
      if ("error" in res) throw new Error(res.error);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  const keys = data?.keys ?? [];
  const activeCount = keys.filter((k) => !k.revoked_at).length;

  async function copyKey() {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 mt-6 space-y-5">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-lg">Clés API MoveSpot</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Utilisez ces clés pour connecter des assistants IA (Grok, ChatGPT, Claude…) à votre compte MoveSpot.{" "}
        <a
          href="/api/v1/openapi"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground inline-flex items-center gap-1"
        >
          Voir la spec OpenAPI <ExternalLink className="h-3 w-3" />
        </a>
      </p>

      {/* Revealed key banner */}
      {revealedKey && (
        <div className="rounded-xl border border-amber-400/50 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Copiez cette clé maintenant — elle ne sera plus affichée
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm font-mono break-all select-all">
              {revealedKey}
            </code>
            <button
              onClick={copyKey}
              className="shrink-0 rounded-lg border border-border bg-background px-3 py-2 hover:bg-secondary transition"
              aria-label="Copier"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <button
            onClick={() => setRevealedKey(null)}
            className="text-xs text-amber-700 dark:text-amber-400 underline"
          >
            J'ai copié ma clé
          </button>
        </div>
      )}

      {/* Existing keys */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground animate-pulse">Chargement…</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune clé API pour l'instant.</p>
      ) : (
        <ul className="divide-y divide-border">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{k.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{k.key_prefix}…</p>
                <p className="text-xs text-muted-foreground">
                  Créée le {formatDate(k.created_at)}
                  {k.last_used_at ? ` · Utilisée le ${formatDate(k.last_used_at)}` : " · Jamais utilisée"}
                </p>
              </div>
              {k.revoked_at ? (
                <span className="text-xs text-destructive font-medium">Révoquée</span>
              ) : (
                <button
                  onClick={() => {
                    if (confirm(`Révoquer la clé « ${k.name} » ? Cette action est irréversible.`)) {
                      revoke.mutate(k.id);
                    }
                  }}
                  disabled={revoke.isPending}
                  className="rounded-lg border border-destructive/40 p-1.5 text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
                  aria-label="Révoquer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Generate new key */}
      {activeCount < 5 && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nom de la clé (ex : ChatGPT)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            maxLength={80}
            className="flex-1 rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60 shrink-0"
          >
            <Plus className="h-4 w-4" />
            {generate.isPending ? "Génération…" : "Générer"}
          </button>
        </div>
      )}
      {activeCount >= 5 && (
        <p className="text-xs text-muted-foreground">Maximum 5 clés actives atteint. Révoquez une clé pour en créer une nouvelle.</p>
      )}
      {genError && (
        <p className="text-sm text-destructive">{genError}</p>
      )}
    </div>
  );
}
