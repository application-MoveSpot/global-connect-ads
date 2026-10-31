import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Key, Trash2, CheckCircle, XCircle, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  listProviderKeys,
  saveProviderKey,
  deleteProviderKey,
  type ProviderKey,
  type ProviderName,
} from "@/lib/api/provider-keys.functions";

type KeyStatus = "idle" | "testing" | "valid" | "rate_limited" | "invalid_key" | "error";

type ProviderConfig = {
  id: ProviderName;
  label: string;
  placeholder: string;
  docsUrl: string;
  color: string;
};

const PROVIDERS: ProviderConfig[] = [
  {
    id: "openai",
    label: "OpenAI",
    placeholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    placeholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/account/keys",
    color: "text-violet-600 dark:text-violet-400",
  },
  {
    id: "xai",
    label: "xAI (Grok)",
    placeholder: "xai-...",
    docsUrl: "https://console.x.ai/",
    color: "text-sky-600 dark:text-sky-400",
  },
  {
    id: "google",
    label: "Google AI",
    placeholder: "AIza...",
    docsUrl: "https://aistudio.google.com/app/apikey",
    color: "text-amber-600 dark:text-amber-400",
  },
];

function StatusBadge({ status }: { status: KeyStatus }) {
  switch (status) {
    case "testing":
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Test en cours…
        </Badge>
      );
    case "valid":
    case "rate_limited":
      return (
        <Badge className="gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-0">
          <CheckCircle className="h-3 w-3" />
          {status === "rate_limited" ? "Valide (quota atteint)" : "Valide"}
        </Badge>
      );
    case "invalid_key":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Clé invalide
        </Badge>
      );
    case "error":
      return (
        <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300">
          <AlertCircle className="h-3 w-3" />
          Erreur réseau
        </Badge>
      );
    default:
      return null;
  }
}

function SavedKeyRow({
  keyEntry,
  onDelete,
  isDeleting,
}: {
  keyEntry: ProviderKey;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
        <span className="font-mono text-xs text-muted-foreground truncate">
          {keyEntry.key_prefix}••••••••
        </span>
        {keyEntry.last_tested_at && (
          <span className="hidden sm:inline text-[10px] text-muted-foreground/60">
            testé {new Date(keyEntry.last_tested_at).toLocaleDateString("fr-FR")}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {confirmDelete ? (
          <>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs px-2"
              disabled={isDeleting}
              onClick={() => onDelete(keyEntry.id)}
            >
              {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Supprimer"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2"
              onClick={() => setConfirmDelete(false)}
            >
              Annuler
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function ProviderPanel({
  provider,
  savedKey,
  onSaved,
  onDelete,
  isDeletingId,
}: {
  provider: ProviderConfig;
  savedKey?: ProviderKey;
  onSaved: (key: ProviderKey) => void;
  onDelete: (id: string) => void;
  isDeletingId: string | null;
}) {
  const [inputKey, setInputKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<KeyStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");

  async function handleTest() {
    const trimmed = inputKey.trim();
    if (!trimmed) return;

    setStatus("testing");
    setStatusMsg("");

    try {
      const { data, error } = await supabase.functions.invoke("test-provider-key", {
        body: { provider: provider.id, key: trimmed },
      });

      if (error) throw new Error(error.message);

      const result = data as {
        ok: boolean;
        keyHash: string;
        keyPrefix: string;
        status: KeyStatus;
        error?: string;
      };

      setStatus(result.status);
      setStatusMsg(result.error ?? "");

      if (result.ok) {
        const saved = await saveProviderKey({
          data: {
            provider: provider.id,
            keyHash: result.keyHash,
            keyPrefix: result.keyPrefix,
            lastTestedAt: new Date().toISOString(),
          },
        });
        onSaved(saved.key);
        setInputKey("");
        toast.success(`Clé ${provider.label} enregistrée`);
      } else if (result.status === "invalid_key") {
        toast.error("Clé invalide — vérifiez votre clé API");
      } else {
        toast.error(result.error ?? "Erreur lors du test");
      }
    } catch (err) {
      setStatus("error");
      setStatusMsg(err instanceof Error ? err.message : "Erreur réseau");
      toast.error("Erreur lors du test de la clé");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <a
          href={provider.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-xs underline underline-offset-2 ${provider.color} hover:opacity-80`}
        >
          Obtenir une clé →
        </a>
      </div>

      {savedKey && (
        <SavedKeyRow
          keyEntry={savedKey}
          onDelete={onDelete}
          isDeleting={isDeletingId === savedKey.id}
        />
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={showKey ? "text" : "password"}
            placeholder={savedKey ? `Remplacer : ${provider.placeholder}` : provider.placeholder}
            value={inputKey}
            onChange={(e) => {
              setInputKey(e.target.value);
              setStatus("idle");
            }}
            className="pr-9 font-mono text-sm"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button
          onClick={handleTest}
          disabled={!inputKey.trim() || status === "testing"}
          size="sm"
          className="shrink-0"
        >
          {status === "testing" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Tester & Sauvegarder"
          )}
        </Button>
      </div>

      {status !== "idle" && status !== "testing" && (
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          {statusMsg && <span className="text-xs text-muted-foreground">{statusMsg}</span>}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground/70">
        La clé est testée puis chiffrée (SHA-256) côté serveur. Elle n'est jamais stockée en clair.
      </p>
    </div>
  );
}

export function ExternalApiKeysManager() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProviderName>("openai");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["provider-keys"],
    queryFn: () => listProviderKeys(),
  });

  const keys = data?.keys ?? [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setIsDeletingId(id);
      return deleteProviderKey({ data: { id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-keys"] });
      toast.success("Clé supprimée");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
    onSettled: () => setIsDeletingId(null),
  });

  function handleSaved() {
    queryClient.invalidateQueries({ queryKey: ["provider-keys"] });
  }

  const activeProvider = PROVIDERS.find((p) => p.id === activeTab)!;
  const savedKeyForTab = keys.find((k) => k.provider_name === activeTab && k.is_active);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Key className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Clés API providers IA</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Connectez vos propres clés API pour personnaliser les fonctionnalités IA de la plateforme.
      </p>

      {/* Provider tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        {PROVIDERS.map((p) => {
          const hasSaved = keys.some((k) => k.provider_name === p.id && k.is_active);
          return (
            <button
              key={p.id}
              onClick={() => setActiveTab(p.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                activeTab === p.id
                  ? "bg-card shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {hasSaved && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              )}
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Panel content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ProviderPanel
          key={activeTab}
          provider={activeProvider}
          savedKey={savedKeyForTab}
          onSaved={handleSaved}
          onDelete={(id) => deleteMutation.mutate(id)}
          isDeletingId={isDeletingId}
        />
      )}
    </div>
  );
}
