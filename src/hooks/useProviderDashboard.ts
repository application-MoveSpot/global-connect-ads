import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";

export type ProviderProfile = {
  user_id: string;
  company: string;
  full_name: string;
  status: string;
  admin_notes: string | null;
  siret: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  services: string[] | null;
  coverage_areas: string[] | null;
  pricing_info: string | null;
  logo_url: string | null;
  stripe_subscription_status: string | null;
  stripe_subscription_period_end: string | null;
  pose_location_types: string[];
};

export type ProviderQuote = {
  id: string;
  advertiser_id: string;
  service_type: string;
  vehicle_type: string | null;
  vehicle_id: string | null;
  format: string | null;
  quantity: number | null;
  deadline: string | null;
  zone: string | null;
  message: string;
  status: string;
  quoted_price_cents: number | null;
  quoted_message: string | null;
  impossible_reason: string | null;
  impossible_photos: string[];
  impossible_at: string | null;
  created_at: string;
  ai_brief_id: string | null;
};

export type ProviderVehicleId = {
  license_plate: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  name: string;
  type: string;
  photos: string[] | null;
};

export function useProviderDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [quotes, setQuotes] = useState<ProviderQuote[]>([]);
  const [vehicleMap, setVehicleMap] = useState<Record<string, ProviderVehicleId>>({});

  const load = useCallback(async () => {
    const session = await getOrRefreshSession();
    if (!session) {
      navigate({ to: "/provider/connexion" });
      return;
    }
    const { data: p } = await supabase
      .from("provider_profiles")
      .select(
        "user_id, company, full_name, status, admin_notes, siret, email, phone, website, description, services, coverage_areas, pricing_info, logo_url, stripe_subscription_status, stripe_subscription_period_end, pose_location_types",
      )
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (!p) {
      navigate({ to: "/provider/inscription" });
      return;
    }
    setProfile(p as ProviderProfile);
    const { data: qs } = await supabase
      .from("service_quotes")
      .select("*")
      .eq("provider_id", session.user.id)
      .order("created_at", { ascending: false });
    const quoteList = (qs as unknown as ProviderQuote[]) ?? [];
    setQuotes(quoteList);

    const vehicleIds = [
      ...new Set(quoteList.map((q) => q.vehicle_id).filter((id): id is string => !!id)),
    ];
    if (vehicleIds.length > 0) {
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, license_plate, brand, model, color, name, type, photos")
        .in("id", vehicleIds);
      const map: Record<string, ProviderVehicleId> = {};
      for (const v of vehicles ?? []) map[(v as { id: string }).id] = v as ProviderVehicleId;
      setVehicleMap(map);
    }

    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitImpossibleReport = async (quoteId: string, reason: string, files: File[]) => {
    const session = await getOrRefreshSession();
    const uid = session?.user.id;
    if (!uid) return;

    const photoUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = `${uid}/${quoteId}/photo-${i + 1}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage
        .from("pose-impossible")
        .upload(path, file, { upsert: true });
      if (!error) {
        const { data: signed } = await supabase.storage
          .from("pose-impossible")
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        if (signed) photoUrls.push(signed.signedUrl);
      }
    }

    await supabase
      .from("service_quotes")
      .update({
        status: "impossible_pending",
        impossible_reason: reason,
        impossible_photos: photoUrls,
        impossible_at: new Date().toISOString(),
      })
      .eq("id", quoteId);

    await load();
  };

  return { loading, profile, quotes, vehicleMap, load, submitImpossibleReport };
}
