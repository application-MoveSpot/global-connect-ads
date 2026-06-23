import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";
import { listDueOwnerPayouts, generatePayoutBatch, markBatchPaid, listPayoutBatches } from "@/lib/owner-payouts.functions";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const Route = createFileRoute("/admin/reversements")({
  component: AdminPayoutsPage,
});

type Owner = {
  owner_profile_id: string;
  owner_user_id: string;
  full_name: string;
  iban: string | null;
  bic: string | null;
  account_holder: string | null;
  total_cents: number;
  campaigns: { id: string; name: string; amount_cents: number; end_date: string | null }[];
};

type Batch = {
  id: string;
  sepa_batch_id: string;
  amount_cents: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  holder_snapshot: string | null;
};

function fmt(cents: number) { return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }); }

function AdminPayoutsPage() {
  const navigate = useNavigate();
  const fetchDue = useServerFn(listDueOwnerPayouts);
  const generate = useServerFn(generatePayoutBatch);
  const markPaid = useServerFn(markBatchPaid);
  const fetchBatches = useServerFn(listPayoutBatches);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastBatch, setLastBatch] = useState<{ batchId: string; csv: string; sepaXml: string; count: number; totalCents: number } | null>(null);

  const load = async () => {
    setError(null);
    try {
      const [d, b] = await Promise.all([fetchDue(), fetchBatches()]);
      setOwners(d.owners as Owner[]);
      setBatches(b as Batch[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/auth" }); return; }
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === owners.length) setSelected(new Set());
    else setSelected(new Set(owners.filter((o) => o.iban).map((o) => o.owner_profile_id)));
  };

  const onGenerate = async () => {
    setBusy(true); setError(null);
    try {
      const r = await generate({ data: { ownerIds: Array.from(selected) } });
      setLastBatch(r);
      setSelected(new Set());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally { setBusy(false); }
  };

  const download = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onMarkPaid = async (batchId: string) => {
    if (!window.confirm("Confirmer que le lot a bien été exécuté côté CA ? Les campagnes seront marquées « reversées ».")) return;
    setBusy(true); setError(null);
    try {
      await markPaid({ data: { batchId } });
      setLastBatch(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally { setBusy(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;

  const selectedTotal = owners.filter((o) => selected.has(o.owner_profile_id)).reduce((s, o) => s + o.total_cents, 0);
  const processingBatches = batches.filter((b) => b.status === "processing");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <div className="flex gap-3 text-sm">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground">Admin</Link>
            <Link to="/admin/virements" className="text-muted-foreground hover:text-foreground">Virements entrants</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Reversements propriétaires</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sélectionne les propriétaires à payer, génère le fichier SEPA (1 clic dans le portail CA) ou CSV, importe-le, puis marque le lot comme exécuté.
          </p>
        </div>

        {error && <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">{error}</div>}

        {/* Processing batches */}
        {processingBatches.length > 0 && (
          <section className="rounded-xl border border-amber-300 bg-amber-50/40 dark:bg-amber-950/10 p-4">
            <h2 className="font-display text-lg font-semibold mb-2">Lots en cours d'exécution</h2>
            <p className="text-xs text-muted-foreground mb-3">Lots générés mais pas encore confirmés comme exécutés côté CA.</p>
            <div className="space-y-2">
              {Array.from(new Set(processingBatches.map((b) => b.sepa_batch_id))).map((batchId) => {
                const items = processingBatches.filter((b) => b.sepa_batch_id === batchId);
                const total = items.reduce((s, b) => s + b.amount_cents, 0);
                return (
                  <div key={batchId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm">
                    <div>
                      <div className="font-mono text-xs">{batchId.slice(0, 8)}…</div>
                      <div className="text-xs text-muted-foreground">{items.length} bénéficiaire(s) · créé le {new Date(items[0].created_at).toLocaleDateString("fr-FR")}</div>
                    </div>
                    <div className="font-semibold">{fmt(total)}</div>
                    <Button size="sm" onClick={() => onMarkPaid(batchId)} disabled={busy}>Marquer comme exécuté</Button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Last generated batch download */}
        {lastBatch && (
          <section className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <h2 className="font-display text-lg font-semibold">Lot généré ({lastBatch.count} bénéficiaire(s) · {fmt(lastBatch.totalCents)})</h2>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => download(`movespot-payout-${lastBatch.batchId.slice(0,8)}.xml`, lastBatch.sepaXml, "application/xml")}>
                <Download className="h-4 w-4 mr-2" /> Télécharger SEPA XML (recommandé)
              </Button>
              <Button variant="outline" onClick={() => download(`movespot-payout-${lastBatch.batchId.slice(0,8)}.csv`, lastBatch.csv, "text/csv")}>
                <Download className="h-4 w-4 mr-2" /> Télécharger CSV (saisie manuelle)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Importe le fichier dans ton portail Crédit Agricole (rubrique « Virements de masse » ou « Import SEPA »). Une fois exécuté, reviens ici et clique sur « Marquer comme exécuté » dans la section en cours d'exécution.
            </p>
          </section>
        )}

        {/* Owners due */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl font-semibold">À reverser maintenant ({owners.length})</h2>
            <div className="flex items-center gap-3">
              {selected.size > 0 && <span className="text-sm font-semibold">{selected.size} sélectionné(s) · {fmt(selectedTotal)}</span>}
              <Button onClick={onGenerate} disabled={selected.size === 0 || busy}>
                {busy ? "Génération…" : "Générer le lot"}
              </Button>
            </div>
          </div>
          {owners.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center text-muted-foreground text-sm">
              Aucun reversement en attente.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" checked={selected.size > 0 && selected.size === owners.filter((o) => o.iban).length} onChange={toggleAll} />
                    </th>
                    <th className="text-left px-4 py-3">Propriétaire</th>
                    <th className="text-left px-4 py-3">IBAN</th>
                    <th className="text-left px-4 py-3">Campagnes</th>
                    <th className="text-right px-4 py-3">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((o) => (
                    <tr key={o.owner_profile_id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(o.owner_profile_id)}
                          onChange={() => toggle(o.owner_profile_id)}
                          disabled={!o.iban}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{o.full_name}</div>
                        <div className="text-xs text-muted-foreground">{o.account_holder ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">
                        {o.iban ? `${o.iban.slice(0,4)} •••• ${o.iban.slice(-4)}` : <span className="text-destructive">IBAN manquant</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{o.campaigns.length} campagne(s)</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmt(o.total_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent paid history */}
        <section>
          <h2 className="font-display text-xl font-semibold mb-3">Historique récent</h2>
          {batches.filter((b) => b.status === "paid").length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/30 p-6 text-center text-muted-foreground text-sm">
              Aucun reversement exécuté.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Bénéficiaire</th>
                    <th className="text-right px-4 py-3">Montant</th>
                    <th className="text-left px-4 py-3">Lot</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.filter((b) => b.status === "paid").slice(0, 30).map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <td className="px-4 py-3 text-muted-foreground text-xs">{b.paid_at ? new Date(b.paid_at).toLocaleString("fr-FR") : "—"}</td>
                      <td className="px-4 py-3">{b.holder_snapshot ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmt(b.amount_cents)}</td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{b.sepa_batch_id?.slice(0, 8)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
