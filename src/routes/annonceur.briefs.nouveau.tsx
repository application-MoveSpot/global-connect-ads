import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";
import { findForbiddenKeyword } from "@/lib/forbidden-keywords";
import { ZonePolygonDraw, polygonToEwkt, type ZonePolygon } from "@/components/ZonePolygonDraw";
import { estimateZoneBudget } from "@/lib/zone-budget";

export const Route = createFileRoute("/annonceur/briefs/nouveau")({
  head: () => ({
    meta: [
      { title: "Nouveau brief — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: NewBriefPage,
});

const VEHICLE_TYPES: { v: string; l: string }[] = [
  { v: "food_truck", l: "Food truck" },
  { v: "van", l: "Van utilitaire" },
  { v: "taxi", l: "Taxi / VTC" },
  { v: "scooter", l: "Scooter livraison" },
  { v: "velo_cargo", l: "Vélo cargo" },
  { v: "velo_remorque", l: "Vélo remorque" },
  { v: "triporteur", l: "Triporteur" },
  { v: "tutuk", l: "Tutuk" },
  { v: "voiture", l: "Voiture" },
  { v: "sac_a_dos_lcd", l: "Sac à dos LCD (Walker)" },
  { v: "sac_a_dos_affiche", l: "Sac à dos affiche (Walker)" },
  { v: "autre", l: "Autre" },
];

function NewBriefPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [zones, setZones] = useState("");
  const [zonePolygon, setZonePolygon] = useState<ZonePolygon | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [audience, setAudience] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/annonceur/inscription" }); return; }
      const { data: prof } = await supabase
        .from("advertiser_profiles")
        .select("user_id")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      if (!prof) { navigate({ to: "/annonceur/inscription" }); return; }
      setUserId(sess.session.user.id);
    })();
  }, [navigate]);

  const estimatedDays =
    startDate && endDate && endDate >= startDate
      ? Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1
      : 0;

  const toggleType = (v: string) => {
    setVehicleTypes((cur) => cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!userId) return;
    if (vehicleTypes.length === 0) { setError("Sélectionnez au moins un type de véhicule."); return; }
    if (!startDate || !endDate) { setError("Dates obligatoires."); return; }
    if (endDate < startDate) { setError("La date de fin doit être après la date de début."); return; }
    const forbidden = findForbiddenKeyword(`${title} ${description} ${audience}`);
    if (forbidden) {
      setError(`Contenu interdit détecté : « ${forbidden} ». Charte MoveSpot : pas de campagne religieuse, politique/électorale, sexiste, pornographique, violente, ni d'anniversaire personnel.`);
      return;
    }
    setLoading(true);

    // Upload creatives
    const uploadedPaths: string[] = [];
    for (const f of files) {
      const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/briefs/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage
        .from("campaign-creatives")
        .upload(path, f, { upsert: false, contentType: f.type });
      if (upErr) { setError(`Upload échoué : ${f.name}`); setLoading(false); return; }
      uploadedPaths.push(path);
    }

    const zoneList = zones.split(/\r?\n|,/).map((z) => z.trim()).filter(Boolean).slice(0, 30);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

    const { data, error: insErr } = await supabase.from("advertiser_briefs").insert([{
      advertiser_id: userId,
      title,
      description,
      vehicle_types: vehicleTypes as never,
      zones: zoneList,
      start_date: startDate,
      end_date: endDate,
      days_count: days,
      budget_max: budget ? Number(budget) : null,
      audience_target: audience || null,
      creative_files: uploadedPaths,
      zone_polygon: zonePolygon ? (polygonToEwkt(zonePolygon.coordinates) as never) : null,
      zone_area_km2: zonePolygon?.areaKm2 ?? null,
    }]).select("id").single();

    setLoading(false);
    if (insErr) { setError(insErr.message); return; }
    navigate({ to: "/annonceur/briefs/$briefId", params: { briefId: data!.id } });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/annonceur" className="text-sm text-muted-foreground hover:text-foreground">← Retour</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold mb-2">Publier un brief</h1>
        <p className="text-sm text-muted-foreground mb-8">Décrivez votre besoin. Les propriétaires éligibles pourront vous proposer leurs véhicules.</p>

        <form onSubmit={submit} className="space-y-6">
          <Field label="Titre du brief">
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120}
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5" placeholder="Ex. Campagne street food Paris 11e" />
          </Field>

          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={2000} rows={4}
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5"
              placeholder="Marque, message clé, ton, contraintes, audience cible…" />
          </Field>

          <Field label="Types de véhicules recherchés">
            <div className="flex flex-wrap gap-2">
              {VEHICLE_TYPES.map((t) => (
                <button type="button" key={t.v} onClick={() => toggleType(t.v)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${vehicleTypes.includes(t.v) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"}`}>
                  {t.l}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Zones / quartiers cibles (une par ligne ou séparées par virgule)">
            <textarea value={zones} onChange={(e) => setZones(e.target.value)} rows={3}
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5"
              placeholder="Paris 11e&#10;Bastille&#10;République" />
          </Field>

          <Field label="Zone de ciblage sur la carte (optionnel)">
            <ZonePolygonDraw onChange={setZonePolygon} />
            {zonePolygon && estimatedDays > 0 && (() => {
              const est = estimateZoneBudget(
                zonePolygon.areaKm2,
                estimatedDays,
                1,
                zonePolygon.coordinates as [number, number][],
              );
              return (
                <div className="mt-3 rounded-xl border border-border bg-secondary/20 p-4 text-sm">
                  <p className="font-medium">Budget estimé pour cette zone</p>
                  <p className="mt-1 text-muted-foreground">
                    {zonePolygon.areaKm2.toFixed(2)} km² × {estimatedDays} jour(s) ≈{" "}
                    <strong className="text-foreground">
                      {est.total.toLocaleString("fr-FR")} €
                    </strong>{" "}
                    ({est.perDay} €/jour · {est.ratePerKm2PerDay} €/km²/jour)
                  </p>
                  {est.denseMetro && (
                    <p className="mt-2 text-xs text-foreground">
                      🏙️ Zone dense détectée ({est.denseMetro}) : coefficient ×{est.multiplier} appliqué
                      pour forte visibilité.
                    </p>
                  )}
                </div>
              );
            })()}
          </Field>


          <div className="grid grid-cols-2 gap-4">
            <Field label="Date de début">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5" />
            </Field>
            <Field label="Date de fin">
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Budget max (€, optionnel)">
              <input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5" />
            </Field>
            <Field label="Audience cible (optionnel)">
              <input value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={200}
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5" placeholder="Ex. 25-40 ans urbains" />
            </Field>
          </div>

          <Field label="Visuels publicitaires (optionnel)">
            <input type="file" multiple accept="image/*,application/pdf,video/*"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="w-full text-sm" />
            {files.length > 0 && <p className="text-xs text-muted-foreground mt-1">{files.length} fichier(s) sélectionné(s)</p>}
          </Field>

          <div className="rounded-xl border border-border bg-secondary/20 p-4 text-xs text-muted-foreground">
            <strong className="text-foreground">📜 Propriété intellectuelle :</strong> en soumettant un visuel publicitaire, vous garantissez en détenir tous les droits (créations, marques, droit à l'image, musiques) et vous engagez à respecter la législation française et européenne.
          </div>

          {error && <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">{error}</div>}

          <button type="submit" disabled={loading}
            className="w-full rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 disabled:opacity-50">
            {loading ? "Publication…" : "Publier le brief"}
          </button>
        </form>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}
