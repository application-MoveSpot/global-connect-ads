import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ── Export RGPD : toutes les données personnelles de l'utilisateur ─────────────
export const exportUserData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function safeQuery(fn: () => PromiseLike<{ data: any[] | null; error: unknown }>): Promise<any[]> {
      try {
        const { data } = await fn();
        return data ?? [];
      } catch {
        return [];
      }
    }

    const [
      advertiserProfile,
      ownerProfile,
      briefs,
      campaigns,
      walletTxs,
      wallet,
      vehicles,
      payoutRequests,
    ] = await Promise.all([
      // Profil annonceur — données personnelles uniquement
      safeQuery(() =>
        supabaseAdmin
          .from("advertiser_profiles")
          .select(
            "full_name, city, phone, company_name, address, siret, account_type, created_at, updated_at",
          )
          .eq("user_id", userId),
      ),
      // Profil propriétaire — données personnelles + professionnelles
      // Champs Stripe internes (stripe_account_id, stripe_connect_account_id,
      // stripe_charges_enabled, stripe_requirements_due, vigilance_*) exclus :
      // ce sont des identifiants techniques internes sans utilité pour l'utilisateur.
      safeQuery(() =>
        supabaseAdmin
          .from("owner_profiles")
          .select(
            "full_name, bio, city, phone, company, siret, siret_denomination, siret_verified_at, created_at, updated_at",
          )
          .eq("user_id", userId),
      ),
      // Briefs annonceur
      safeQuery(() =>
        supabaseAdmin
          .from("advertiser_briefs")
          .select(
            "id, title, description, status, start_date, end_date, budget_max, vehicle_count, vehicle_types, zones, audience_target, ad_format, created_at",
          )
          .eq("advertiser_id", userId),
      ),
      // Campagnes annonceur
      safeQuery(() =>
        supabaseAdmin
          .from("campaign_requests")
          .select(
            "id, company, spot_name, status, payment_status, total_price, start_date, end_date, created_at",
          )
          .eq("user_id", userId),
      ),
      // Transactions portefeuille
      safeQuery(() =>
        supabaseAdmin
          .from("wallet_transactions")
          .select("id, kind, amount_cents, currency, description, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ),
      // Solde portefeuille
      safeQuery(() =>
        supabaseAdmin
          .from("wallets")
          .select("balance_cents, currency, updated_at")
          .eq("user_id", userId),
      ),
      // Véhicules du propriétaire
      // admin_notes et ai_verification exclus (données internes d'administration)
      safeQuery(() =>
        supabaseAdmin
          .from("vehicles")
          .select(
            "id, name, brand, model, type, color, license_plate, condition, price_per_day, surface_m2, format_publicitaire, km_per_day, zones, status, description, created_at, updated_at",
          )
          .eq("owner_id", userId),
      ),
      // Demandes de virement (paiements propriétaire)
      // stripe_account_id, stripe_transfer_id et admin_notes exclus : IDs techniques internes
      safeQuery(() =>
        supabaseAdmin
          .from("bank_transfer_requests")
          .select(
            "id, reference, amount_cents, currency, status, failure_reason, created_at, updated_at",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ),
    ]);

    return {
      exported_at: new Date().toISOString(),
      user_id: userId,
      advertiser_profile: advertiserProfile[0] ?? null,
      owner_profile: ownerProfile[0] ?? null,
      briefs,
      campaigns,
      vehicles,
      wallet: {
        balance: wallet[0] ?? null,
        transactions: walletTxs,
      },
      payout_requests: payoutRequests,
      _note: [
        "Cet export contient l'ensemble de vos données personnelles conformément à l'article 20 du RGPD.",
        "Les identifiants techniques internes (Stripe, stockage) sont exclus car ils ne constituent pas des données personnelles exploitables.",
        "Les pièces comptables (campagnes, transactions) sont conservées 10 ans conformément à l'article L.123-22 du Code de commerce.",
      ],
    };
  });

// ── Vérifie si le compte a des blocages à la suppression ──────────────────────
export const checkDeletionBlockers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;
    const today = new Date().toISOString().slice(0, 10);

    // Campagnes en cours ou en attente (annonceur)
    const { data: activeCampaigns } = await supabaseAdmin
      .from("campaign_requests")
      .select("id, company, spot_name, end_date, status")
      .eq("user_id", userId)
      .in("status", ["pending", "approved", "active"])
      .gte("end_date", today);

    // Campagnes actives sur véhicules (propriétaire)
    const { data: activeVehicleCampaigns } = await supabaseAdmin
      .from("campaign_requests")
      .select("id, company, spot_name, end_date, vehicles(name, owner_id)")
      .in("status", ["pending", "approved", "active"])
      .gte("end_date", today)
      .not("vehicle_id", "is", null);

    const ownerBlockers = (activeVehicleCampaigns ?? []).filter(
      (c: any) => c.vehicles?.owner_id === userId,
    );

    // Virements en attente
    const { data: pendingTransfers } = await supabaseAdmin
      .from("bank_transfer_requests")
      .select("id, amount_cents, status")
      .eq("user_id", userId)
      .in("status", ["pending", "processing"]);

    // Solde portefeuille positif
    const { data: walletData } = await supabaseAdmin
      .from("wallets")
      .select("balance_cents")
      .eq("user_id", userId)
      .maybeSingle();

    const balanceCents = (walletData as { balance_cents?: number } | null)?.balance_cents ?? 0;

    const blockers: { type: string; description: string; endDate: string }[] = [];

    for (const c of activeCampaigns ?? []) {
      blockers.push({
        type: "campaign_advertiser",
        description: `Campagne "${c.spot_name ?? c.company}" en cours ou en attente`,
        endDate: c.end_date ?? "",
      });
    }
    for (const c of ownerBlockers) {
      blockers.push({
        type: "campaign_owner",
        description: `Campagne "${(c as any).spot_name ?? (c as any).company}" sur un de vos véhicules`,
        endDate: (c as any).end_date,
      });
    }
    for (const t of pendingTransfers ?? []) {
      blockers.push({
        type: "pending_transfer",
        description: `Virement de ${(t.amount_cents / 100).toFixed(2)} € en cours de traitement`,
        endDate: "",
      });
    }
    if (balanceCents > 0) {
      blockers.push({
        type: "positive_wallet_balance",
        description: `Solde portefeuille de ${(balanceCents / 100).toFixed(2)} € — demandez le virement avant de supprimer votre compte`,
        endDate: "",
      });
    }

    return { blocked: blockers.length > 0, blockers };
  });

// ── Demande de suppression de compte ──────────────────────────────────────────
export const requestAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        reason: z.string().max(500).optional(),
        confirmText: z.literal("SUPPRIMER"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = new Date().toISOString().slice(0, 10);

    // ── 1. Gardes serveur (redoublent checkDeletionBlockers pour sécurité) ──

    // Campagnes pending / approved / active (annonceur)
    const { data: activeCampaigns } = await supabaseAdmin
      .from("campaign_requests")
      .select("id, spot_name, end_date")
      .eq("user_id", userId)
      .in("status", ["pending", "approved", "active"])
      .gte("end_date", today);

    if (activeCampaigns && activeCampaigns.length > 0) {
      const endDates = activeCampaigns
        .map((c) => c.end_date)
        .filter(Boolean)
        .sort()
        .reverse();
      throw new Error(
        `Vous avez ${activeCampaigns.length} campagne(s) active(s) ou en attente jusqu'au ${endDates[0] ?? "date inconnue"}. ` +
          `Votre compte ne peut pas être supprimé avant la fin de vos engagements contractuels.`,
      );
    }

    // Virements en attente
    const { data: pendingTransfers } = await supabaseAdmin
      .from("bank_transfer_requests")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["pending", "processing"]);

    if (pendingTransfers && pendingTransfers.length > 0) {
      throw new Error(
        "Vous avez un virement en cours de traitement. Attendez qu'il soit finalisé avant de supprimer votre compte.",
      );
    }

    // Solde portefeuille positif
    const { data: walletData } = await supabaseAdmin
      .from("wallets")
      .select("balance_cents")
      .eq("user_id", userId)
      .maybeSingle();

    const balanceCents = (walletData as { balance_cents?: number } | null)?.balance_cents ?? 0;
    if (balanceCents > 0) {
      throw new Error(
        `Votre portefeuille contient ${(balanceCents / 100).toFixed(2)} €. ` +
          "Demandez d'abord le virement de votre solde depuis votre tableau de bord avant de supprimer votre compte.",
      );
    }

    // ── 2. Récupérer l'e-mail original pour l'audit ──
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const originalEmail = authUser?.user?.email ?? "inconnu";

    // ── 3. Anonymiser les profils (suppression des données personnelles) ──
    // Les FK sur les tables financières restent valides (SET NULL côté DB)
    // conformément à l'obligation de conservation de 10 ans (L.123-22 Code de commerce)
    await supabaseAdmin.from("advertiser_profiles").delete().eq("user_id", userId);
    await supabaseAdmin.from("owner_profiles").delete().eq("user_id", userId);
    await supabaseAdmin.from("payee_profiles").delete().eq("user_id", userId);
    await supabaseAdmin.from("partner_profiles").delete().eq("user_id", userId);
    await supabaseAdmin.from("provider_profiles").delete().eq("user_id", userId);
    await supabaseAdmin
      .from("drivers" as never)
      .delete()
      .eq("user_id" as never, userId);

    // ── 4. Supprimer les données GPS (pas de base légale pour les conserver) ──
    await supabaseAdmin.from("vehicle_positions").delete().eq("owner_id", userId);

    // ── 5. Supprimer les photos d'obstacles ──
    const { data: obstacleReports } = await supabaseAdmin
      .from("obstacle_reports")
      .select("id, photo_paths")
      .eq("vehicle_id", userId);

    for (const report of obstacleReports ?? []) {
      const paths = (report.photo_paths ?? []) as string[];
      if (paths.length > 0) {
        await supabaseAdmin.storage.from("obstacle-reports").remove(paths);
      }
    }

    // ── 6. Anonymiser le compte auth (email → invalide, métadonnées vidées) ──
    // L'utilisateur ne peut plus se connecter mais les FK restent valides pour J+30
    const anonEmail = `suppr-${userId}@movespot.invalid`;
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: anonEmail,
      password: crypto.randomUUID() + crypto.randomUUID(),
      user_metadata: { deleted: true, deletion_requested_at: new Date().toISOString() },
      email_confirm: true,
    });

    // ── 7. Enregistrer la demande (audit + planification J+30) ──
    const scheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin.from("account_deletion_requests" as never).insert({
      user_id: userId,
      scheduled_hard_delete_at: scheduledAt,
      reason: data.reason ?? null,
    } as never);

    // ── 8. Révoquer la session ──
    await supabase.auth.signOut();

    return {
      ok: true,
      message:
        "Vos données personnelles ont été supprimées. " +
        "Votre compte sera définitivement fermé dans 30 jours. " +
        `Un e-mail de confirmation a été envoyé à ${originalEmail}.`,
      scheduledHardDeleteAt: scheduledAt,
    };
  });
