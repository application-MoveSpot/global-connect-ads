import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { useServerFn } from "@tanstack/react-start";
import { estimateVehicle } from "@/lib/fleet/vehicle-estimate.functions";

export const Route = createFileRoute("/proprietaire/vehicules/nouveau")({
  head: () => ({
    meta: [
      { title: "Ajouter un véhicule — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: NewVehiclePage,
});

const TYPES_VEHICULES = [
  { v: "food_truck", l: "Food truck" },
  { v: "van", l: "Van utilitaire" },
  { v: "taxi", l: "Taxi / VTC" },
  { v: "scooter", l: "Scooter livraison" },
  { v: "velo_cargo", l: "Vélo cargo" },
  { v: "velo_remorque", l: "Vélo remorque" },
  { v: "triporteur", l: "Triporteur" },
  { v: "tutuk", l: "Tutuk" },
  { v: "voiture", l: "Voiture" },
];
const TYPES_AUTRES = [
  { v: "sac_a_dos_lcd", l: "Sac à dos publicitaire LCD (Walker)" },
  { v: "sac_a_dos_affiche", l: "Sac à dos publicitaire affiche (Walker)" },
  { v: "autre", l: "Autre" },
];

const BACKPACK_FORMATS = [
  { v: "small", l: "Small (~15,6\")", desc: "Format compact, idéal mobilité" },
  { v: "medium", l: "Medium (~21,5\")", desc: "Bon compromis visibilité / poids" },
  { v: "large", l: "Large (~27-32\")", desc: "Impact maximal, plein dos" },
];

const CONDITIONS = [
  { v: "excellent", l: "Excellent", desc: "Carrosserie impeccable, comme neuf" },
  { v: "bon", l: "Bon", desc: "Quelques traces d'usage, propre et soigné" },
  { v: "moyen", l: "Moyen", desc: "Usure visible mais correct" },
  { v: "mauvais", l: "Mauvais", desc: "⛔ Non accepté sur MoveSpot" },
];

const isBackpack = (t: string) => t === "sac_a_dos_lcd" || t === "sac_a_dos_affiche";

function NewVehiclePage() {
  const navigate = useNavigate();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [type, setType] = useState("food_truck");
  const [autreDescription, setAutreDescription] = useState("");
  const [condition, setCondition] = useState<"excellent" | "bon" | "moyen" | "mauvais">("bon");
  const [backpackFormat, setBackpackFormat] = useState("medium");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [surface, setSurface] = useState("");
  const [km, setKm] = useState("");
  const [zones, setZones] = useState("");
  const [price, setPrice] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<null | {
    suggested_price_min: number;
    suggested_price_max: number;
    estimated_impressions_per_day: number;
    photo_match: "ok" | "doubtful" | "mismatch" | "unverified";
    photo_notes: string;
    condition_alert: string | null;
    ai_generated_detected: boolean;
    ai_generated_notes: string;
    recommendation: string;
    uploaded_urls: string[];
  }>(null);
  const callEstimate = useServerFn(estimateVehicle);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/proprietaire/inscription" }); return; }
      setUserId(sess.session.user.id);
      const { data: prof } = await supabase
        .from("owner_profiles")
        .select("id")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      if (!prof) { navigate({ to: "/proprietaire/inscription" }); return; }
      setOwnerId(prof.id);
    })();
  }, [navigate]);

  const uploadPhotos = async (): Promise<string[]> => {
    if (!userId) return [];
    const paths: string[] = [];
    for (const file of files.slice(0, 5)) {
      const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("vehicle-photos").upload(path, file);
      if (upErr) throw new Error(`Upload : ${upErr.message}`);
      paths.push(path);
    }
    return paths;
  };

  const pathsToSignedUrls = async (paths: string[]): Promise<string[]> => {
    const needSign = paths.filter((p) => !p.startsWith("http"));
    if (needSign.length === 0) return paths;
    const { data } = await supabase.storage.from("vehicle-photos").createSignedUrls(needSign, 3600);
    let idx = 0;
    return paths.map((p) => (p.startsWith("http") ? p : (data?.[idx++]?.signedUrl ?? "")));
  };

  const runEstimate = async () => {
    setError("");
    if (condition === "mauvais") {
      setError("Les véhicules en mauvais état ne sont pas acceptés sur MoveSpot.");
      return;
    }
    if (files.length === 0) {
      setError("Ajoutez au moins une photo pour l'estimation et la vérification.");
      return;
    }
    setEstimating(true);
    try {
      const paths = estimate?.uploaded_urls ?? (await uploadPhotos());
      const signedUrls = await pathsToSignedUrls(paths);
      const res = await callEstimate({
        data: {
          type,
          condition,
          surface_m2: surface ? Number(surface) : null,
          km_per_day: km ? Number(km) : null,
          zones: zones ? zones.split(",").map((z) => z.trim()).filter(Boolean) : [],
          price_per_day: price ? Number(price) : null,
          photo_urls: signedUrls,
        },
      });
      setEstimate({ ...res, uploaded_urls: paths });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur estimation");
    } finally {
      setEstimating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId || !userId) return;
    setError("");
    if (condition === "mauvais") {
      setError("Les véhicules en mauvais état ne sont pas acceptés.");
      return;
    }
    if (type === "autre" && !autreDescription.trim()) {
      setError("Veuillez préciser le type de véhicule dans le champ dédié.");
      return;
    }
    if (estimate?.ai_generated_detected) {
      setError("⛔ Photo refusée : notre IA a détecté une image générée ou retouchée par IA. Merci de fournir une photo authentique du véhicule.");
      return;
    }
    if (estimate && estimate.suggested_price_max > 0 && Number(price) > estimate.suggested_price_max * 0.7) {
      const maxAcceptable = Math.floor(estimate.suggested_price_max * 0.7);
      const minAcceptable = Math.floor(estimate.suggested_price_min * 0.7);
      setError(`⛔ Prix trop élevé : la fourchette IA ${estimate.suggested_price_min}–${estimate.suggested_price_max} €/j est le prix payé par l'annonceur. Votre rémunération de propriétaire correspond à 70 % de ce montant, soit ${minAcceptable}–${maxAcceptable} €/jour. Saisissez au maximum ${maxAcceptable} €/jour (bouton « Utiliser ${maxAcceptable} €/j » dans l'encart Estimation IA).`);
      return;
    }

    setLoading(true);
    try {
      const photoUrls = estimate?.uploaded_urls ?? (await uploadPhotos());
      const { error: insErr } = await supabase.from("vehicles").insert({
        owner_id: ownerId,
        type: type as "food_truck" | "van" | "taxi" | "scooter" | "velo_cargo" | "velo_remorque" | "triporteur" | "tutuk" | "voiture" | "sac_a_dos_lcd" | "sac_a_dos_affiche" | "autre",
        condition,
        name,
        description: type === "autre" && autreDescription.trim()
          ? `[Véhicule : ${autreDescription.trim()}]${description ? `\n\n${description}` : ""}`
          : description || null,
        format_publicitaire: type === "sac_a_dos_lcd"
          ? `Écran LCD ${backpackFormat}`
          : type === "sac_a_dos_affiche"
          ? `Affiche ${backpackFormat}`
          : null,
        surface_m2: surface ? Number(surface) : null,
        km_per_day: km ? Number(km) : null,
        zones: zones ? zones.split(",").map((z) => z.trim()).filter(Boolean) : [],
        price_per_day: Number(price),
        photos: photoUrls,
        ai_verification: estimate ? {
          photo_match: estimate.photo_match,
          photo_notes: estimate.photo_notes,
          condition_alert: estimate.condition_alert,
          ai_generated_detected: estimate.ai_generated_detected,
          ai_generated_notes: estimate.ai_generated_notes,
          suggested_price_min: estimate.suggested_price_min,
          suggested_price_max: estimate.suggested_price_max,
          estimated_impressions_per_day: estimate.estimated_impressions_per_day,
          checked_at: new Date().toISOString(),
        } : null,
      });
      if (insErr) { setError(insErr.message); setLoading(false); return; }
      navigate({ to: "/proprietaire" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <LogoLink />
        </div>
        <Link to="/proprietaire" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Retour au tableau de bord</Link>
        <div className="rounded-2xl border border-border bg-card p-8 mt-4">
          <h1 className="font-display text-3xl font-bold mb-2">Ajouter un véhicule</h1>
          <p className="text-sm text-muted-foreground mb-6">Votre véhicule sera vérifié par MoveSpot avant d'apparaître sur la marketplace.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Type de véhicule *</label>
              <select value={type} onChange={(e) => setType(e.target.value)} required
                className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <optgroup label="Véhicules">
                  {TYPES_VEHICULES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                </optgroup>
                <optgroup label="Autre">
                  {TYPES_AUTRES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                </optgroup>
              </select>
            </div>
            {type === "autre" && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Précisez le type de véhicule *</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={autreDescription}
                  onChange={(e) => setAutreDescription(e.target.value)}
                  placeholder="Ex. Rickshaw, bateau fluvial, camion brasserie…"
                  className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground mt-1.5">Cette précision est visible par les annonceurs et aide MoveSpot à valider votre véhicule.</p>
              </div>
            )}
            {isBackpack(type) && (
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {type === "sac_a_dos_lcd" ? "Format de l'écran *" : "Format de l'affiche *"}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {BACKPACK_FORMATS.map((f) => (
                    <button type="button" key={f.v} onClick={() => setBackpackFormat(f.v)}
                      className={`rounded-lg border px-3 py-2.5 text-left transition ${
                        backpackFormat === f.v
                          ? "border-primary bg-primary/10"
                          : "border-border bg-input hover:border-primary/40"
                      }`}>
                      <div className="text-sm font-semibold">{f.l}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{f.desc}</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {type === "sac_a_dos_lcd"
                    ? "Walker équipé d'un écran LCD diffusant les visuels publicitaires en déplacement (street marketing)."
                    : "Walker équipé d'un panneau rigide imprimé (affiche papier ou PVC) — solution simple, sans batterie."}
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5">État du véhicule *</label>
              <div className="grid grid-cols-2 gap-2">
                {CONDITIONS.map((c) => (
                  <button type="button" key={c.v} onClick={() => { setCondition(c.v as "excellent" | "bon" | "moyen" | "mauvais"); setEstimate(null); }}
                    className={`rounded-lg border px-3 py-2.5 text-left transition ${
                      condition === c.v
                        ? c.v === "mauvais"
                          ? "border-destructive bg-destructive/10"
                          : "border-primary bg-primary/10"
                        : "border-border bg-input hover:border-primary/40"
                    }`}>
                    <div className="text-sm font-semibold">{c.l}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{c.desc}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                ⚠️ L'état déclaré est vérifié sur photo par notre IA et confirmé par MoveSpot. Toute fausse déclaration entraîne un refus.
              </p>
            </div>

            <Field label="Nom / surnom du véhicule *" value={name} onChange={setName} required placeholder="Ex. Le Bistrot Roulant" />
            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500}
                placeholder="Décrivez votre véhicule, son état, ses spécificités…"
                className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <p className="text-xs text-muted-foreground mt-1.5">Pas besoin de préciser les formats publicitaires : ce sont les annonceurs qui choisissent ce qu'ils veulent habiller.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Surface (m²)" value={surface} onChange={setSurface} type="number" />
              <Field label="Km / jour" value={km} onChange={setKm} type="number" />
            </div>
            <Field label="Zones desservies" value={zones} onChange={setZones} placeholder="Paris 11e, Bastille, République (séparés par virgules)" />
            <div>
              <Field label="Prix par jour (€) *" value={price} onChange={setPrice} type="number" required />

              <p className="text-xs text-muted-foreground mt-1.5">
                Indiquez <strong className="text-foreground">votre rémunération nette de propriétaire</strong>, pas le prix
                payé par l'annonceur. L'estimation IA affiche le prix de marché annonceur ; votre prix correspond à 70 % de
                celui-ci (MoveSpot conserve 30 % de commission).
                {estimate && estimate.suggested_price_max > 0 && (
                  <>
                    {" "}Fourchette conseillée pour vous :{" "}
                    <strong className="text-foreground">
                      {Math.floor(estimate.suggested_price_min * 0.7)}–{Math.floor(estimate.suggested_price_max * 0.7)} €/j
                    </strong>.
                  </>
                )}
              </p>
            </div>


            <div>
              <label className="block text-sm font-medium mb-1.5">Photos (max 5) *</label>
              <input type="file" accept="image/*" multiple onChange={(e) => { setFiles(Array.from(e.target.files ?? [])); setEstimate(null); }}
                className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" />
              {files.length > 0 && <div className="text-xs text-muted-foreground mt-2">{files.length} fichier(s) sélectionné(s)</div>}
              <p className="text-xs text-muted-foreground mt-1.5">Les photos doivent refléter la réalité du véhicule — l'état réel est vérifié automatiquement.</p>
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <div className="text-sm font-semibold">Estimation IA</div>
                  <div className="text-xs text-muted-foreground">Vérifie la photo et propose un prix réaliste.</div>
                </div>
                <button type="button" onClick={runEstimate} disabled={estimating || condition === "mauvais"}
                  className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60 whitespace-nowrap">
                  {estimating ? "Analyse..." : "Lancer l'estimation"}
                </button>
              </div>
              {estimate && (
                <div className="space-y-2 text-sm mt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-card p-2.5">
                      <div className="text-[11px] text-muted-foreground uppercase">Prix marché annonceur</div>
                      <div className="font-semibold">{estimate.suggested_price_min}–{estimate.suggested_price_max} €/j</div>
                    </div>
                    <div className="rounded-lg bg-card p-2.5">
                      <div className="text-[11px] text-muted-foreground uppercase">Impressions est.</div>
                      <div className="font-semibold">{estimate.estimated_impressions_per_day.toLocaleString("fr-FR")} /j</div>
                    </div>
                  </div>

                  <div className={`rounded-lg p-2.5 text-xs ${
                    estimate.photo_match === "ok" ? "bg-signal/10 text-signal" :
                    estimate.photo_match === "doubtful" ? "bg-yellow-500/10 text-yellow-600" :
                    estimate.photo_match === "mismatch" ? "bg-destructive/10 text-destructive" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    <strong>Vérification photo : </strong>
                    {estimate.photo_match === "ok" && "✓ cohérente avec la déclaration."}
                    {estimate.photo_match === "doubtful" && "⚠️ cohérence incertaine."}
                    {estimate.photo_match === "mismatch" && "✗ ne correspond pas à la déclaration."}
                    {estimate.photo_match === "unverified" && "Non vérifiée."}
                    {estimate.photo_notes && <span className="block mt-1 opacity-80">{estimate.photo_notes}</span>}
                  </div>
                  {estimate.condition_alert && (
                    <div className="rounded-lg bg-destructive/10 text-destructive p-2.5 text-xs">⚠️ {estimate.condition_alert}</div>
                  )}
                  {estimate.ai_generated_detected && (
                    <div className="rounded-lg bg-destructive/15 border border-destructive/40 text-destructive p-2.5 text-xs">
                      🚫 <strong>Photo refusée — image générée ou retouchée par IA détectée.</strong>
                      {estimate.ai_generated_notes && <span className="block mt-1">{estimate.ai_generated_notes}</span>}
                      <span className="block mt-1">Merci de téléverser une photo authentique du véhicule.</span>
                    </div>
                  )}
                  {estimate.suggested_price_max > 0 && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-xs">
                      <div>
                        <strong>Votre rémunération propriétaire (70 %) :</strong>{" "}
                        {Math.floor(estimate.suggested_price_min * 0.7)}–{Math.floor(estimate.suggested_price_max * 0.7)} €/j
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        MoveSpot conserve 30 % de commission d'intermédiation. Saisissez un prix dans cette fourchette.
                      </div>
                      <button
                        type="button"
                        onClick={() => { setPrice(String(Math.floor(estimate.suggested_price_max * 0.7))); setError(""); }}
                        className="mt-2 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 font-medium hover:bg-primary/90 transition"
                      >
                        Utiliser {Math.floor(estimate.suggested_price_max * 0.7)} €/j
                      </button>
                    </div>
                  )}
                  {estimate.recommendation && (
                    <div className="text-xs text-muted-foreground italic">💡 {estimate.recommendation}</div>
                  )}

                </div>
              )}
            </div>

            {error && <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">{error}</div>}

            <div className="rounded-xl border border-border bg-secondary/20 p-4 text-xs text-muted-foreground">
              <strong className="text-foreground">📜 Propriété intellectuelle :</strong> en publiant ce véhicule et ses photos, vous certifiez en détenir les droits et vous engagez à respecter la législation française et européenne sur la propriété intellectuelle (droits d'auteur, marques, droit à l'image). Les visuels publicitaires diffusés par les annonceurs sont sous leur seule responsabilité.
            </div>

            <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60">
              {loading ? "Envoi..." : "Soumettre pour validation"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input type={type} required={required} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}
