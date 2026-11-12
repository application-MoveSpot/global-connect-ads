import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { payCampaignWithWallet, getMyWallet } from "@/lib/payments/wallet.functions";
import { updateAdvertiserRegion } from "@/lib/advertiser/advertiser.functions";
import { track } from "@/lib/analytics/track";
import { firePixelEvent } from "@/lib/analytics/pixels";
import { withRetry } from "@/lib/retry";
import { toast } from "sonner";

export type AdvertiserReq = {
  id: string;
  spot_name: string;
  spot_location: string | null;
  spot_price: number | null;
  message: string;
  status: string;
  owner_response: string;
  admin_notes: string | null;
  created_at: string;
  route_zones: string[] | null;
  route_waypoints: string[] | null;
  route_pois: string[] | null;
  estimated_impressions_per_day: number | null;
  days_count: number | null;
  creative_files: string[] | null;
  total_price: number | null;
  payment_status: string;
  installation_status: string | null;
  subscription_status: string | null;
};

export type AdvertiserProfile = {
  full_name: string;
  company: string | null;
  account_type: string | null;
  target_region: string | null;
};

export function useAdvertiserDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [profile, setProfile] = useState<AdvertiserProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<AdvertiserReq[]>([]);
  const [balanceCents, setBalanceCents] = useState<number>(0);
  const [paying, setPaying] = useState<string | null>(null);
  const [savingRegion, setSavingRegion] = useState(false);
  const payFn = useServerFn(payCampaignWithWallet);
  const walletFn = useServerFn(getMyWallet);
  const updateRegionFn = useServerFn(updateAdvertiserRegion);

  const reload = useCallback(
    async (uid: string) => {
      const [{ data: reqs, error: reqErr }, w] = await Promise.all([
        supabase
          .from("campaign_requests")
          .select(
            "id, spot_name, spot_location, spot_price, message, status, owner_response, admin_notes, created_at, route_zones, route_waypoints, route_pois, estimated_impressions_per_day, days_count, creative_files, total_price, payment_status, installation_status, subscription_status",
          )
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        walletFn(),
      ]);
      if (reqErr) throw new Error(reqErr.message);
      setRequests((reqs as unknown as AdvertiserReq[]) ?? []);
      setBalanceCents(w?.balance_cents ?? 0);
    },
    [walletFn],
  );

  const init = useCallback(async () => {
    const session = await getOrRefreshSession();
    if (!session) {
      navigate({ to: "/auth", search: { next: "/advertiser" } });
      return;
    }
    const { data: prof, error: profErr } = await supabase
      .from("advertiser_profiles")
      .select("full_name, company, account_type, target_region")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);
    if (!prof) {
      navigate({ to: "/advertiser/inscription" });
      return;
    }
    setProfile(prof as unknown as AdvertiserProfile);
    setUserId(session.user.id);
    await reload(session.user.id);
    setLoading(false);
  }, [navigate, reload]);

  const loadWithRetry = useCallback(
    async (isManualRetry = false) => {
      if (isManualRetry) setRetrying(true);
      setLoadError(null);
      try {
        await withRetry(init, { maxAttempts: 3 });
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : t("errors.network"));
        setLoading(false);
      } finally {
        if (isManualRetry) setRetrying(false);
      }
    },
    [init, t],
  );

  useEffect(() => {
    void loadWithRetry();
  }, [loadWithRetry]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`advertiser-realtime-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaign_requests",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void reload(userId);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, reload]);

  const handlePay = async (r: AdvertiserReq) => {
    const cents = Math.round(Number(r.total_price ?? 0) * 100);
    if (cents > balanceCents) {
      toast.error(
        t("advertiser.insufficient_balance", {
          missing: ((cents - balanceCents) / 100).toFixed(2),
        }),
      );
      navigate({ to: "/advertiser/portefeuille" });
      return;
    }
    setPaying(r.id);
    try {
      await payFn({ data: { campaignRequestId: r.id } });
      void track("campaign_paid", { campaign_request_id: r.id, total_price: r.total_price });
      firePixelEvent("Purchase", {
        value: (r.total_price ?? 0) / 100,
        currency: "EUR",
        content_name: "campaign",
      });
      toast.success(t("advertiser.payment_success"));
      const session = await getOrRefreshSession();
      if (session) await reload(session.user.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("advertiser.payment_failed"));
    } finally {
      setPaying(null);
    }
  };

  const handleRegionChange = async (region: string) => {
    setSavingRegion(true);
    try {
      const val = region === "" ? null : region;
      await updateRegionFn({ data: { target_region: val as never } });
      setProfile((p) => (p ? { ...p, target_region: val } : p));
      toast.success(t("advertiser.region_saved"));
    } catch {
      toast.error(t("advertiser.region_save_error"));
    } finally {
      setSavingRegion(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return {
    loading,
    loadError,
    retrying,
    profile,
    userId,
    requests,
    balanceCents,
    paying,
    savingRegion,
    loadWithRetry,
    reload,
    handlePay,
    handleRegionChange,
    logout,
  };
}
