import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { useVehiclePhotoUrls } from "@/hooks/useVehiclePhotoUrls";

type Spot = {
  id: string;
  vehicleId?: string;
  name: string;
  location: string;
  impressions: string;
  kmPerDay?: number | null;
  price: number;
  format: string | null;
  vehicleType?: string | null;
  available: boolean;
  photos?: string[] | null;
};

function SpotPhoto({ photos }: { photos: string[] | null | undefined }) {
  const resolved = useVehiclePhotoUrls(photos);
  const { t } = useTranslation();
  if (!resolved.length) {
    return (
      <div className="w-full h-40 rounded-xl bg-secondary/60 flex items-center justify-center mb-4">
        <span className="text-3xl">🚐</span>
      </div>
    );
  }
  return (
    <div className="w-full h-40 rounded-xl overflow-hidden mb-4 bg-black">
      <img src={resolved[0]} alt={t("ad_spots.vehicle_alt")} style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
    </div>
  );
}

export function AdSpots({ onSelect }: { onSelect: (spot: Spot) => void }) {
  const { t } = useTranslation();
  const { fmtAmount } = useCurrency();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  const TYPE_LABELS: Record<string, string> = {
    camion_led: t("vehicle_types.camion_led"),
    food_truck: t("vehicle_types.food_truck"),
    van: t("vehicle_types.van"),
    taxi: t("vehicle_types.taxi"),
    scooter: t("vehicle_types.scooter"),
    velo_cargo: t("vehicle_types.velo_cargo"),
    velo_remorque: t("vehicle_types.velo_remorque"),
    triporteur: t("vehicle_types.triporteur"),
    tutuk: t("vehicle_types.tutuk"),
    voiture: t("vehicle_types.voiture"),
    autre: t("vehicle_types.autre"),
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id, name, type, format_publicitaire, price_per_day, zones, km_per_day, photos")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      const mapped: Spot[] = (data ?? []).map((v) => ({
        id: v.id,
        vehicleId: v.id,
        name: `${TYPE_LABELS[v.type] ?? t("ad_spots.vehicle_fallback")} · ${v.name}`,
        location: (v.zones && v.zones.length > 0) ? v.zones.join(" · ") : t("ad_spots.zone_tbc"),
        impressions: v.km_per_day ? t("ad_spots.impressions", { count: (v.km_per_day * 1000).toLocaleString() }) : "—",
        kmPerDay: v.km_per_day ?? null,
        price: Number(v.price_per_day),
        format: v.format_publicitaire,
        vehicleType: v.type,
        available: true,
        photos: v.photos ?? null,
      }));
      setSpots(mapped);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <h2 className="font-display text-4xl font-bold">{t("ad_spots.title")}</h2>
          <p className="text-muted-foreground mt-2">{t("ad_spots.subtitle")}</p>
        </div>
        <Link to="/devenir-partenaire" className="rounded-full border border-border bg-card px-5 py-2 text-sm font-medium hover:bg-secondary transition">
          {t("ad_spots.link_owner")}
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">{t("common.loading")}</div>
      ) : spots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="text-4xl mb-3">🚐</div>
          <h3 className="font-display text-2xl font-bold mb-2">{t("ad_spots.empty_title")}</h3>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">{t("ad_spots.empty_desc")}</p>
          <Link to="/devenir-partenaire" className="inline-block rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition shadow-glow">
            {t("ad_spots.empty_cta")}
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {spots.map((spot) => (
            <div
              key={spot.id}
              className="group rounded-2xl border border-border bg-gradient-card p-6 hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-elevated"
            >
              <SpotPhoto photos={spot.photos} />
              <div className="flex items-start justify-between mb-4">
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-signal/15 text-signal">{t("ad_spots.available_badge")}</span>
                <span className="text-xs text-muted-foreground">{spot.format}</span>
              </div>
              <h3 className="font-display text-xl font-semibold mb-1">{spot.name}</h3>
              <p className="text-sm text-muted-foreground mb-5">{spot.location}</p>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{t("ad_spots.audience_label")}</div>
                  <div className="font-display font-semibold text-sm">{spot.impressions}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">{t("ad_spots.from_label")}</div>
                  <div className="font-display text-2xl font-bold text-primary">{fmtAmount(spot.price)}<span className="text-sm text-muted-foreground font-normal">/j</span></div>
                </div>
              </div>
              <button
                onClick={() => onSelect(spot)}
                className="mt-5 w-full rounded-lg bg-primary text-primary-foreground py-2.5 font-medium hover:bg-primary/90 transition"
              >
                {t("ad_spots.btn_book")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type { Spot };
