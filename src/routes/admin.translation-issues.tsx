import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Globe, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { LogoLink } from "@/components/app/LogoLink";
import {
  listTranslationIssues,
  resolveTranslationIssue,
} from "@/lib/i18n/translation-issue.functions";

export const Route = createFileRoute("/admin/translation-issues")({
  head: () => ({
    meta: [
      { title: "Problèmes de traduction — MoveSpot Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: TranslationIssuesPage,
});

type Issue = {
  id: string;
  route: string;
  text_snippet: string;
  element_path: string | null;
  detected_lang: string;
  expected_lang: string;
  occurrences: number;
  created_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
};

function TranslationIssuesPage() {
  const qc = useQueryClient();
  const doList = useServerFn(listTranslationIssues);
  const doResolve = useServerFn(resolveTranslationIssue);

  const [showResolved, setShowResolved] = useState(false);
  const [noteFor, setNoteFor] = useState<Record<string, string>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["translation-issues"],
    queryFn: () => doList({ data: undefined }),
    staleTime: 30_000,
  });

  const resolveMut = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => doResolve({ data: { id, note } }),
    onSuccess: () => {
      toast.success("Marqué comme résolu");
      qc.invalidateQueries({ queryKey: ["translation-issues"] });
    },
    onError: () => toast.error("Erreur lors de la résolution"),
  });

  const issues: Issue[] = (data?.issues ?? []) as Issue[];
  const visible = issues.filter((i) => (showResolved ? true : !i.resolved_at));
  const pendingCount = issues.filter((i) => !i.resolved_at).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border light-band">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <LogoLink />
            <h1 className="font-display text-2xl font-bold mt-1 flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Problèmes de traduction
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
              Admin
            </Link>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Actualiser
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Problèmes en attente" value={pendingCount} accent="orange" />
          <StatCard label="Résolus" value={issues.length - pendingCount} accent="green" />
          <StatCard
            label="Routes affectées"
            value={new Set(issues.filter((i) => !i.resolved_at).map((i) => i.route)).size}
            accent="blue"
          />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Afficher les problèmes résolus
          </label>
          <span className="text-xs text-muted-foreground">
            {visible.length} affiché{visible.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-5 animate-pulse h-28"
              />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-3 text-emerald-500" />
            <p className="font-medium">Aucun problème de traduction détecté</p>
            <p className="text-sm mt-1">L'IA surveille les pages visitées automatiquement.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                note={noteFor[issue.id] ?? ""}
                onNoteChange={(v) => setNoteFor((prev) => ({ ...prev, [issue.id]: v }))}
                onResolve={() => resolveMut.mutate({ id: issue.id, note: noteFor[issue.id] })}
                resolving={resolveMut.isPending}
              />
            ))}
          </div>
        )}

        {/* Explanation */}
        <div className="rounded-xl border border-border bg-muted/30 p-5 text-sm space-y-2">
          <p className="font-semibold">Comment fonctionne la détection ?</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
            <li>Chaque page visitée est analysée 1,5 s après son chargement.</li>
            <li>
              L'analyseur cherche des mots anglais typiques d'interfaces non traduites (ex.
              "Subtitle", "Tip", "My …").
            </li>
            <li>Chaque route n'est analysée qu'une fois par session pour éviter le bruit.</li>
            <li>
              Pour corriger : ouvrir le fichier <code>.tsx</code> de la route concernée et remplacer
              le texte anglais par une clé <code>t("…")</code> dans <code>src/locales/fr.json</code>
              .
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}

function IssueCard({
  issue,
  note,
  onNoteChange,
  onResolve,
  resolving,
}: {
  issue: Issue;
  note: string;
  onNoteChange: (v: string) => void;
  onResolve: () => void;
  resolving: boolean;
}) {
  const resolved = !!issue.resolved_at;

  return (
    <div
      className={`rounded-xl border bg-card p-5 transition ${
        resolved ? "opacity-60 border-border" : "border-orange-400/40 bg-orange-500/5"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            {resolved ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />
            )}
            <code className="text-xs font-mono bg-secondary px-2 py-0.5 rounded">
              {issue.route}
            </code>
          </div>
          <p className="text-sm font-medium mt-1 ml-6">« {issue.text_snippet} »</p>
          {issue.element_path && (
            <p className="text-xs text-muted-foreground ml-6 font-mono">{issue.element_path}</p>
          )}
        </div>
        <div className="text-xs text-muted-foreground text-right shrink-0">
          <span className="inline-block bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-0.5 rounded font-mono mb-1">
            {issue.detected_lang.toUpperCase()} → {issue.expected_lang.toUpperCase()}
          </span>
          <p>{new Date(issue.created_at).toLocaleDateString("fr-FR")}</p>
          {issue.occurrences > 1 && <p>{issue.occurrences}× signalé</p>}
        </div>
      </div>

      {resolved ? (
        issue.resolution_note && (
          <p className="text-xs text-muted-foreground ml-6">Note : {issue.resolution_note}</p>
        )
      ) : (
        <div className="flex gap-2 mt-2 ml-6">
          <input
            type="text"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Note (ex : corrigé dans PR #83)"
            className="flex-1 text-xs rounded-lg bg-input border border-border px-3 py-1.5"
          />
          <button
            onClick={onResolve}
            disabled={resolving}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
          >
            Marquer résolu
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "orange" | "green" | "blue";
}) {
  const colors = {
    orange: "text-orange-500",
    green: "text-emerald-500",
    blue: "text-blue-500",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className={`text-2xl font-bold tabular-nums ${colors[accent]}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
