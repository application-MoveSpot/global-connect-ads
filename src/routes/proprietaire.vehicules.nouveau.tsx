import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";

export const Route = createFileRoute("/proprietaire/vehicules/nouveau")({
  component: NewVehiclePage,
});

const TYPES = [
  { v: "food_truck", l: "Food truck" },
  { v: "van", l: "Van utilitaire" },
  { v: "taxi", l: "Taxi / VTC" },
  { v: "scooter", l: "Scooter livraison" },
  { v: "velo_cargo", l: "Vélo cargo" },
  { v: "velo_remorque", l: "Vélo remorque" },
  { v: "triporteur", l: "Triporteur" },
  { v: "tutuk", l: "Tutuk" },
  { v: "voiture", l: "Voiture" },
  { v: "sac_a_dos_lcd", l: "Sac à dos publicitaire LCD (walker)" },
  { v: "autre", l: "Autre" },
];

const BACKPACK_FORMATS = [
  { v: "small", l: "Small (~15,6\")", desc: "Format tablette, idéal mobilité" },
  { v: "medium", l: "Medium (~21,5\")", desc: "Bon compromis visibilité / poids" },
  { v: "large", l: "Large (~27-32\")", desc: "Impact maximal, plein dos" },
];

function NewVehiclePage() {
  const navigate = useNavigate();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [type, setType] = useState("food_truck");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId || !userId) return;
    setError("");
    setLoading(true);

    // Upload photos
    const photoUrls: string[] = [];
    for (const file of files.slice(0, 5)) {
      const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("vehicle-photos").upload(path, file);
      if (upErr) { setError(`Upload : ${upErr.message}`); setLoading(false); return; }
      const { data: pub } = supabase.storage.from("vehicle-photos").getPublicUrl(path);
      photoUrls.push(pub.publicUrl);
    }

    const { error: insErr } = await supabase.from("vehicles").insert({
      owner_id: ownerId,
      type: type as "food_truck" | "van" | "taxi" | "scooter" | "velo_cargo" | "velo_remorque" | "triporteur" | "tutuk" | "voiture" | "autre",
      name,
      description: description || null,
      format_publicitaire: null,
      surface_m2: surface ? Number(surface) : null,
      km_per_day: km ? Number(km) : null,
      zones: zones ? zones.split(",").map((z) => z.trim()).filter(Boolean) : [],
      price_per_day: Number(price),
      photos: photoUrls,
    });
    if (insErr) { setError(insErr.message); setLoading(false); return; }
    navigate({ to: "/proprietaire" });
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
          <p className="text-sm text-muted-foreground mb-6">Votre véhicule sera vérifié par notre équipe avant d'apparaître sur la marketplace.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Type de véhicule *</label>
              <select value={type} onChange={(e) => setType(e.target.value)} required
                className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
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
            <Field label="Prix par jour (€) *" value={price} onChange={setPrice} type="number" required />

            <div>
              <label className="block text-sm font-medium mb-1.5">Photos (max 5)</label>
              <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" />
              {files.length > 0 && <div className="text-xs text-muted-foreground mt-2">{files.length} fichier(s) sélectionné(s)</div>}
            </div>

            {error && <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-3 text-sm text-destructive">{error}</div>}

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
