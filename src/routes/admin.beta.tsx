import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Plus, Shield, ArrowLeft } from "lucide-react";

type BetaEntry = {
  id: string;
  email: string;
  note: string | null;
  created_at: string;
};

export const Route = createFileRoute("/admin/beta")({
  head: () => ({
    meta: [{ title: "Accès Beta — Admin MoveSpot" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminBetaPage,
});

function AdminBetaPage() {
  const [entries, setEntries] = useState<BetaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("beta_whitelist")
      .select("*")
      .order("created_at", { ascending: false });
    setEntries((data as BetaEntry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setAdding(true);
    const { error } = await supabase
      .from("beta_whitelist")
      .insert({ email: trimmed, note: note.trim() || null });
    if (error) {
      toast.error(error.code === "23505" ? "Email déjà dans la liste" : error.message);
    } else {
      toast.success(`${trimmed} ajouté`);
      setEmail("");
      setNote("");
      load();
    }
    setAdding(false);
  };

  const removeEmail = async (id: string, e: string) => {
    if (!window.confirm(`Retirer ${e} de la liste ?`)) return;
    const { error } = await supabase.from("beta_whitelist").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Retiré");
      load();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/admin" className="text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="font-display text-xl font-bold">Accès Beta</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-sm text-muted-foreground mb-6">
          <strong className="text-foreground">Liste vide = app ouverte à tous.</strong> Ajoutez
          des emails pour restreindre l'accès lors du lancement privé.
        </p>

        {/* Formulaire d'ajout */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-6 space-y-3">
          <h2 className="font-semibold text-sm">Ajouter un accès</h2>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => e.key === "Enter" && addEmail()}
            />
            <button
              onClick={addEmail}
              disabled={adding || !email.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optionnel — ex: Compte test, Client VIP…)"
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Liste */}
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
            Aucun email dans la liste — l'app est ouverte à tous.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              {entries.length} email{entries.length > 1 ? "s" : ""} autorisé
              {entries.length > 1 ? "s" : ""}
            </p>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{entry.email}</div>
                  {entry.note && (
                    <div className="text-xs text-muted-foreground">{entry.note}</div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <button
                  onClick={() => removeEmail(entry.id, entry.email)}
                  className="shrink-0 rounded-lg p-2 text-destructive hover:bg-destructive/10 transition"
                  aria-label={`Retirer ${entry.email}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
