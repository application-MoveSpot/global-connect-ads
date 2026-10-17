import { useState } from "react";

interface AiAssistantPanelProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  context: string;
  onContextChange: (v: string) => void;
  onGenerate: () => void;
  loading: boolean;
  error?: string;
  sessionExpired?: boolean;
  sessionExpiredHref?: string;
  onReconnectClick?: () => void;
  placeholder: string;
  filledMessage?: string;
  onDismissFilled?: () => void;
  /** "card" = elaborate header with title/description (brief form style).
   *  "inline" = simple toggle link (inscription forms style). */
  variant?: "card" | "inline";
  title?: string;
  description?: string;
  generateLabel?: string;
  generateLoadingLabel?: string;
  inputLabel?: string;
  disclaimer?: string;
  /** Optional user-supplied API key (Google AI / Gemini). Stored by the caller. */
  userApiKey?: string;
  onUserApiKeyChange?: (key: string) => void;
}

export function AiAssistantPanel({
  open,
  onOpenChange,
  context,
  onContextChange,
  onGenerate,
  loading,
  error,
  sessionExpired,
  sessionExpiredHref = "/",
  onReconnectClick,
  placeholder,
  filledMessage,
  onDismissFilled,
  variant = "inline",
  title = "Rédiger avec l'IA",
  description,
  generateLabel = "Générer",
  generateLoadingLabel = "Génération…",
  inputLabel,
  disclaimer,
  userApiKey,
  onUserApiKeyChange,
}: AiAssistantPanelProps) {
  const [keyInputOpen, setKeyInputOpen] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  if (variant === "card") {
    return (
      <>
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 overflow-hidden">
          <button
            type="button"
            onClick={() => onOpenChange(!open)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-violet-500/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">✨</span>
              <div>
                <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                  {title}
                </p>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
              </div>
            </div>
            <span className="text-muted-foreground text-sm">{open ? "▲" : "▼"}</span>
          </button>

          {open && (
            <div className="px-5 pb-5 border-t border-violet-500/20 pt-4 space-y-3">
              {inputLabel && <label className="block text-sm font-medium">{inputLabel}</label>}
              <textarea
                value={context}
                onChange={(e) => onContextChange(e.target.value)}
                rows={3}
                maxLength={600}
                placeholder={placeholder}
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm resize-none"
              />
              {sessionExpired && (
                <p className="text-xs text-destructive">
                  Session expirée —{" "}
                  {onReconnectClick ? (
                    <button
                      type="button"
                      onClick={onReconnectClick}
                      className="underline hover:no-underline"
                    >
                      reconnectez-vous
                    </button>
                  ) : (
                    <a href={sessionExpiredHref} className="underline hover:no-underline">
                      reconnectez-vous
                    </a>
                  )}{" "}
                  puis réessayez.
                </p>
              )}
              {error && !sessionExpired && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={loading || context.trim().length < 10}
                  onClick={onGenerate}
                  className="inline-flex items-center gap-2 rounded-full bg-violet-600 text-white px-5 py-2 text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
                >
                  {loading ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {generateLoadingLabel}
                    </>
                  ) : (
                    generateLabel
                  )}
                </button>
                <span className="text-xs text-muted-foreground">
                  {context.length}/600 caractères
                </span>
              </div>
              {disclaimer && <p className="text-xs text-muted-foreground">{disclaimer}</p>}

              {/* Optional user API key connector */}
              {onUserApiKeyChange && (
                <div className="pt-2 border-t border-violet-500/10">
                  {!keyInputOpen ? (
                    <button
                      type="button"
                      onClick={() => { setKeyDraft(""); setKeyInputOpen(true); }}
                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition"
                    >
                      <span>🔑</span>
                      {userApiKey
                        ? `Clé API personnelle connectée (${userApiKey.slice(0, 8)}…) — modifier`
                        : "Utiliser ma propre clé IA (Google · OpenAI · Mistral)"}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground font-medium">
                        🔑 Clé API IA personnelle (stockée dans votre navigateur)
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={keyDraft}
                          onChange={(e) => setKeyDraft(e.target.value)}
                          placeholder="AIzaSy… (Google) · sk-… (OpenAI) · (Mistral)"
                          className="flex-1 min-w-0 rounded border border-border bg-background px-2 py-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => { onUserApiKeyChange(keyDraft.trim()); setKeyInputOpen(false); }}
                          className="rounded bg-violet-600 text-white px-2.5 py-1 text-xs font-medium hover:bg-violet-700"
                        >
                          OK
                        </button>
                        {userApiKey && (
                          <button
                            type="button"
                            onClick={() => { onUserApiKeyChange(""); setKeyDraft(""); setKeyInputOpen(false); }}
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >
                            Supprimer
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setKeyInputOpen(false)}
                          className="text-xs text-muted-foreground"
                        >
                          Annuler
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Clés gratuites :{" "}
                        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a>
                        {" · "}
                        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI</a>
                        {" · "}
                        <a href="https://console.mistral.ai/api-keys" target="_blank" rel="noopener noreferrer" className="underline">Mistral</a>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {filledMessage && onDismissFilled && (
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 px-4 py-3 flex items-center justify-between gap-3 text-xs">
            <span className="text-violet-700 dark:text-violet-300 font-medium">
              {filledMessage}
            </span>
            <button
              type="button"
              onClick={onDismissFilled}
              className="text-muted-foreground hover:text-foreground leading-none shrink-0"
            >
              ✕
            </button>
          </div>
        )}
      </>
    );
  }

  // variant === "inline"
  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex items-center gap-2 text-xs font-medium text-violet-700 dark:text-violet-300 hover:opacity-80 transition"
      >
        <span>✨</span>
        {open ? `Masquer l'assistant IA` : title}
        <span className="text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-violet-500/30 bg-violet-500/5 p-3 space-y-2">
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          <textarea
            rows={2}
            maxLength={600}
            value={context}
            onChange={(e) => onContextChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg bg-background border border-violet-500/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 placeholder:text-muted-foreground/60"
          />
          {sessionExpired && (
            <p className="text-xs text-destructive">
              Session expirée —{" "}
              {onReconnectClick ? (
                <button
                  type="button"
                  onClick={onReconnectClick}
                  className="underline"
                >
                  reconnectez-vous
                </button>
              ) : (
                <a href={sessionExpiredHref} className="underline">
                  reconnectez-vous
                </a>
              )}{" "}
              puis réessayez.
            </p>
          )}
          {error && !sessionExpired && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-muted-foreground">{context.length}/600</span>
            <button
              type="button"
              onClick={onGenerate}
              disabled={loading || context.trim().length < 10}
              className="rounded-lg bg-violet-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-violet-700 transition disabled:opacity-60"
            >
              {loading ? generateLoadingLabel : generateLabel}
            </button>
          </div>
        </div>
      )}
      {filledMessage && onDismissFilled && (
        <div className="mt-2 rounded-xl border border-violet-500/30 bg-violet-500/5 px-3 py-2 flex items-center justify-between gap-3 text-xs">
          <span className="text-violet-700 dark:text-violet-300 font-medium">{filledMessage}</span>
          <button
            type="button"
            onClick={onDismissFilled}
            className="text-muted-foreground hover:text-foreground transition flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
