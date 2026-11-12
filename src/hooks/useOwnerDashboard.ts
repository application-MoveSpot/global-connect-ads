import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { respondToCampaignRequest } from "@/lib/campaigns/campaign-notifications.server";
import { pushNotification } from "@/hooks/useNotifications";
import { withRetry } from "@/lib/retry";
import { downloadCsv } from "@/lib/exportCsv";

export type OwnerVehicle = {
  id: string;
  name: string;
  type: string;
  format_publicitaire: string | null;
  price_per_day: number;
  status: string;
  admin_notes: string | null;
  photos: string[] | null;
  created_at: string;
  condition: string | null;
  km_per_day: number | null;
  surface_m2: number | null;
  zones: string[] | null;
  description: string | null;
};

export type OwnerRequest = {
  id: string;
  vehicle_id: string | null;
  spot_name: string;
  company: string;
  message: string;
  status: string;
  owner_response: string;
  admin_notes: string | null;
  start_date: string | null;
  end_date: string | null;
  total_price: number | null;
  created_at: string;
  route_zones: string[] | null;
  route_waypoints: string[] | null;
  route_pois: string[] | null;
  estimated_impressions_per_day: number | null;
  days_count: number | null;
  creative_files: string[] | null;
};

export type OwnerProfile = {
  id: string;
  full_name: string;
  stripe_connect_account_id: string | null;
  stripe_payouts_enabled: boolean | null;
  stripe_requirements_due: string[] | null;
};

export function useOwnerDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [vehicles, setVehicles] = useState<OwnerVehicle[]>([]);
  const [requests, setRequests] = useState<OwnerRequest[]>([]);
  const callRespondToCampaign = useServerFn(respondToCampaignRequest);

  const load = useCallback(async () => {
    const session = await getOrRefreshSession();
    if (!session) {
      navigate({ to: "/auth", search: { next: "/owner" } });
      return;
    }
    setUserId(session.user.id);
    const { data: prof, error: profErr } = await supabase
      .from("owner_profiles")
      .select("id, full_name, stripe_connect_account_id, stripe_payouts_enabled")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);
    if (!prof) {
      navigate({ to: "/owner/inscription" });
      return;
    }
    setProfile({ ...prof, stripe_requirements_due: null });
    const [{ data: v, error: vErr }, { data: r, error: rErr }] = await Promise.all([
      supabase
        .from("vehicles")
        .select("id, name, type, format_publicitaire, price_per_day, status, admin_notes, photos, created_at, condition, km_per_day, surface_m2, zones, description")
        .eq("owner_id", prof.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("campaign_requests")
        .select("id, spot_name, company, message, status, owner_response, admin_notes, start_date, end_date, total_price, created_at, route_zones, route_waypoints, route_pois, estimated_impressions_per_day, days_count, creative_files, vehicle_id")
        .order("created_at", { ascending: false }),
    ]);
    if (vErr) throw new Error(vErr.message);
    if (rErr) throw new Error(rErr.message);
    setVehicles((v as OwnerVehicle[]) ?? []);
    setRequests((r as OwnerRequest[]) ?? []);
    setLoading(false);
  }, [navigate]);

  const loadWithRetry = useCallback(
    async (isManualRetry = false) => {
      if (isManualRetry) setRetrying(true);
      setLoadError(null);
      try {
        await withRetry(load, { maxAttempts: 3 });
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : t("errors.network"));
        setLoading(false);
      } finally {
        if (isManualRetry) setRetrying(false);
      }
    },
    [load, t],
  );

  useEffect(() => {
    void loadWithRetry();
  }, [loadWithRetry]);

  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel(`owner-dashboard-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaign_requests" },
        (payload) => {
          if ((payload as { eventType?: string }).eventType === "INSERT") {
            const company = (payload.new as Record<string, unknown>).company as string | undefined;
            pushNotification(
              t("owner.new_campaign_notif"),
              company ? t("owner.notif_new_campaign_body", { company }) : undefined,
            );
          }
          void loadWithRetry();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "vehicles",
          filter: `owner_id=eq.${profile.id}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const newStatus = row.status as string | undefined;
          const vName = row.name as string | undefined;
          if (newStatus === "approved")
            pushNotification(
              t("owner.vehicle_approved_notif"),
              vName ? t("owner.notif_vehicle_approved_body", { name: vName }) : undefined,
            );
          else if (newStatus === "rejected")
            pushNotification(
              t("owner.vehicle_rejected_notif"),
              vName ? t("owner.notif_vehicle_rejected_body", { name: vName }) : undefined,
            );
          void loadWithRetry();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, loadWithRetry, t]);

  const respond = async (id: string, response: "accepted" | "rejected") => {
    await callRespondToCampaign({ data: { campaignId: id, response } });
    void loadWithRetry();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const exportVehiclesCsv = () => {
    const rows = vehicles.map((v) => ({
      id: v.id,
      nom: v.name,
      type: v.type,
      format: v.format_publicitaire,
      prix_par_jour_eur: v.price_per_day,
      statut: v.status,
      date_ajout: v.created_at,
    }));
    downloadCsv(rows, `movespot-vehicules-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportRequestsCsv = () => {
    const rows = requests.map((r) => ({
      id: r.id,
      advertiser: r.company,
      spot: r.spot_name,
      statut: r.status,
      prix_total_eur: r.total_price ?? "",
      jours: r.days_count ?? "",
      debut: r.start_date ?? "",
      fin: r.end_date ?? "",
      impressions_par_jour: r.estimated_impressions_per_day ?? "",
      date_reception: r.created_at,
    }));
    downloadCsv(rows, `movespot-demandes-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return {
    loading,
    loadError,
    retrying,
    userId,
    profile,
    vehicles,
    requests,
    loadWithRetry,
    respond,
    logout,
    exportVehiclesCsv,
    exportRequestsCsv,
  };
}
