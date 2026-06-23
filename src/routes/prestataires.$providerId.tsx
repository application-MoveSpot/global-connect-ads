import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";
import { providerServiceLabel } from "@/lib/provider-services";

export const Route = createFileRoute("/prestataires/$providerId")({
  component: ProviderDetailPage,
});

type Provider = {
  user_id: string; company: string; full_name: string; email: string; phone: string | null;
  website: string | null; description: string; coverage_areas: string[]; portfolio_urls: string[];
  pricing_info: string | null; logo_url: string | null; services: string[];
};

function ProviderDetailPage() {
  const { providerId } = Route.useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [portfolioSigned, setPortfolioSigned] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [sent, setSent] = useState(false);

  const [vehicleType, setVehicleType] = useState("");
  const [format, setFormat] = useState("");
  const [quantity, setQuantity] = useState("");
  const [deadline, setDeadline] = useState("");
  const [zone, setZone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: sess }] = await Promise.all([
        supabase.from("provider_profiles")
          .select("user_id, company, full_name, email, phone, website, description, coverage_areas, portfolio_urls, pricing_info, logo_url, services")
          .eq("user_id", providerId).eq("status", "approved").maybeSingle(),
        supabase.auth.getSession(),
      ]);
      const prov = p as Provider | null;
      setProvider(prov);
      setAuthed(!!sess.session);
      if (prov && prov.portfolio_urls?.length) {
        const paths = prov.portfolio_urls.filter((u) => !/^https?:\/\//i.test(u));
        const fullUrls = prov.portfolio_urls.filter((u) => /^https?:\/\//i.test(u));
        let signed: string[] = [];
        if (paths.length) {
          const { data } = await supabase.storage.from("provider-portfolio").createSignedUrls(paths, 3600);
          signed = (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[];
        }
        setPortfolioSigned([...fullUrls, ...signed]);
      }
      setLoading(false);
    })();
  }, [providerId]);


  const submitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { navigate({ to: "/annonceur/inscription" }); return; }
    if (message.trim().length < 20) { setError("Décrivez votre besoin (au moins 20 caractères)."); return; }
    setSubmitting(true);
    const { error: insErr } = await supabase.from("service_quotes").insert({
      advertiser_id: sess.session.user.id,
      provider_id: providerId,
      service_type: "covering_vehicule",
      vehicle_type: vehicleType || null,
      format: format || null,
      quantity: quantity ? Number(quantity) : null,
      deadline: deadline || null,
      zone: zone || null,
      message,
    });
    setSubmitting(false);
    if (insErr) { setError(insErr.message); return; }
    setSent(true); setShowForm(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;
  if (!provider) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <p className="text-muted-foreground">Prestataire introuvable.</p>
      <Link to="/prestataires" className="text-primary hover:underline">← Annuaire</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/prestataires" className="text-sm text-muted-foreground hover:text-foreground">← Annuaire</Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-start gap-4 mb-6">
          {provider.logo_url ? (
            <img src={provider.logo_url} alt={provider.company} className="w-20 h-20 rounded-2xl object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-primary/15 text-primary text-2xl font-bold flex items-center justify-center">
              {provider.company.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl font-bold">{provider.company}</h1>
            <p className="text-sm text-muted-foreground">Contact : {provider.full_name}</p>
            {provider.website && <a href={provider.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{provider.website}</a>}
            {provider.services && provider.services.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {provider.services.map((s) => <span key={s} className="text-xs bg-primary/15 text-primary font-medium px-2 py-0.5 rounded-full">{providerServiceLabel(s)}</span>)}
              </div>
            )}
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 mb-4 space-y-3">
          <h2 className="font-semibold">À propos</h2>
          <p className="text-sm whitespace-pre-wrap">{provider.description}</p>
          {provider.coverage_areas.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Zones d'intervention</div>
              <div className="flex flex-wrap gap-1">
                {provider.coverage_areas.map((z) => (
                  <span key={z} className="text-xs bg-secondary px-2 py-0.5 rounded-full">{z}</span>
                ))}
              </div>
            </div>
          )}
          {provider.pricing_info && (
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Indications tarifaires</div>
              <p className="text-sm whitespace-pre-wrap">{provider.pricing_info}</p>
            </div>
          )}
        </section>

        {portfolioSigned.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-6 mb-4">
            <h2 className="font-semibold mb-3">Portfolio</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {portfolioSigned.map((u) => (
                <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-lg overflow-hidden border border-border bg-secondary hover:opacity-90">
                  <img src={u} alt="Portfolio" className="w-full h-full object-cover" loading="lazy" />
                </a>
              ))}
            </div>
          </section>
        )}


        {sent ? (
          <div className="rounded-2xl border border-signal/40 bg-signal/10 p-6 text-sm">
            ✓ Demande envoyée à {provider.company}. Vous serez notifié dès la réponse. <Link to="/annonceur" className="text-primary font-semibold hover:underline">Voir mes demandes</Link>
          </div>
        ) : showForm ? (
          <form onSubmit={submitQuote} className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Demander un devis</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Type de véhicule" value={vehicleType} onChange={setVehicleType} placeholder="Ex. Food truck, van" />
              <Input label="Format" value={format} onChange={setFormat} placeholder="Total / demi-covering, stickers…" />
              <Input label="Quantité" type="number" value={quantity} onChange={setQuantity} placeholder="Nombre de véhicules" />
              <Input label="Échéance souhaitée" type="date" value={deadline} onChange={setDeadline} />
              <div className="sm:col-span-2"><Input label="Zone (lieu de pose)" value={zone} onChange={setZone} /></div>
            </div>
            <Field label="Détail du besoin">
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} required maxLength={2000} rows={5}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder="Visuel disponible, contraintes, références…" />
            </Field>
            {error && <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">{error}</div>}
            <div className="flex gap-2">
              <button disabled={submitting} className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 font-semibold hover:bg-primary/90 disabled:opacity-50">
                {submitting ? "Envoi…" : "Envoyer la demande"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-border px-6 py-2.5 hover:bg-secondary">Annuler</button>
            </div>
          </form>
        ) : (
          <button onClick={() => { if (!authed) navigate({ to: "/annonceur/inscription" }); else setShowForm(true); }}
            className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90">
            Demander un devis
          </button>
        )}
      </main>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <Field label={label}>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </Field>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium mb-1">{label}</label>{children}</div>;
}
