import { z } from "zod";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const AppRoleSchema = z.enum([
  "admin",
  "user",
  "owner",
  "advertiser",
  "driver",
  "provider",
  "partner",
]);

export const VehicleTypeSchema = z.enum([
  "food_truck",
  "van",
  "taxi",
  "scooter",
  "voiture",
  "autre",
  "velo_cargo",
  "velo_remorque",
  "triporteur",
  "tutuk",
  "sac_a_dos_lcd",
  "sac_a_dos_affiche",
]);

export const VehicleStatusSchema = z.enum(["pending", "approved", "rejected", "paused"]);

export const VehicleConditionSchema = z.enum(["excellent", "bon", "moyen", "mauvais"]);

export const BriefStatusSchema = z.enum(["open", "closed", "fulfilled", "cancelled"]);

export const ProposalStatusSchema = z.enum(["pending", "accepted", "rejected", "withdrawn"]);

// ─── wallet_transactions ─────────────────────────────────────────────────────

export const WalletTransactionRowSchema = z.object({
  id: z.string().uuid(),
  wallet_id: z.string().uuid(),
  user_id: z.string().uuid(),
  kind: z.string(),
  amount_cents: z.number().int(),
  currency: z.string(),
  description: z.string().nullable(),
  campaign_request_id: z.string().uuid().nullable(),
  stripe_checkout_session_id: z.string().nullable(),
  stripe_payment_intent_id: z.string().nullable(),
  stripe_refund_id: z.string().nullable(),
  created_at: z.string(),
});

export type WalletTransactionRow = z.infer<typeof WalletTransactionRowSchema>;

// ─── wallets ─────────────────────────────────────────────────────────────────

export const WalletRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  balance_cents: z.number().int(),
  currency: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type WalletRow = z.infer<typeof WalletRowSchema>;

// ─── campaign_requests ───────────────────────────────────────────────────────

export const CampaignRequestRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  vehicle_id: z.string().uuid().nullable(),
  spot_id: z.string(),
  spot_name: z.string(),
  spot_location: z.string().nullable(),
  company: z.string(),
  email: z.string(),
  message: z.string(),
  status: z.string(),
  payment_status: z.string(),
  payout_status: z.string(),
  installation_status: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  days_count: z.number().int().nullable(),
  spot_price: z.number().nullable(),
  total_price: z.number().nullable(),
  paid_amount_cents: z.number().int().nullable(),
  paid_at: z.string().nullable(),
  owner_amount_cents: z.number().int().nullable(),
  platform_fee_cents: z.number().int().nullable(),
  owner_response: z.string(),
  owner_transferred_at: z.string().nullable(),
  payout_transferred_at: z.string().nullable(),
  stripe_checkout_session_id: z.string().nullable(),
  stripe_payment_intent_id: z.string().nullable(),
  stripe_transfer_id: z.string().nullable(),
  creative_files: z.array(z.string()),
  installation_notes: z.string().nullable(),
  installation_photos: z.unknown().nullable(),
  installation_reviewed_at: z.string().nullable(),
  admin_notes: z.string().nullable(),
  pose_fee_cents: z.number().int().default(0),
  depose_fee_cents: z.number().int().default(0),
  depose_status: z.string().nullable(),
  depose_photos: z.unknown().nullable(),
  depose_notes: z.string().nullable(),
  depose_reviewed_at: z.string().nullable(),
  pose_installer_user_id: z.string().uuid().nullable(),
  depose_installer_user_id: z.string().uuid().nullable(),
  pose_payout_status: z.string().nullable(),
  depose_payout_status: z.string().nullable(),
  pose_stripe_transfer_id: z.string().nullable(),
  depose_stripe_transfer_id: z.string().nullable(),
  daily_start_time: z.string().nullable(),
  daily_end_time: z.string().nullable(),
  estimated_impressions_per_day: z.number().nullable(),
  zone_area_km2: z.number().nullable(),
  zone_polygon: z.unknown(),
  route_waypoints: z.array(z.string()).nullable(),
  route_pois: z.array(z.string()).nullable(),
  route_zones: z.array(z.string()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CampaignRequestRow = z.infer<typeof CampaignRequestRowSchema>;

// ─── bank_transfer_requests ──────────────────────────────────────────────────

export const BankTransferRequestRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  campaign_request_id: z.string().uuid().nullable(),
  reference: z.string(),
  amount_cents: z.number().int(),
  currency: z.string(),
  status: z.string(),
  receipt_path: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  admin_notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type BankTransferRequestRow = z.infer<typeof BankTransferRequestRowSchema>;

// ─── owner_profiles ──────────────────────────────────────────────────────────

export const OwnerProfileRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  full_name: z.string(),
  company: z.string().nullable(),
  phone: z.string().nullable(),
  city: z.string().nullable(),
  bio: z.string().nullable(),
  siret: z.string().nullable(),
  siret_denomination: z.string().nullable(),
  siret_verified_at: z.string().nullable(),
  stripe_account_id: z.string().nullable(),
  stripe_connect_account_id: z.string().nullable(),
  stripe_charges_enabled: z.boolean(),
  stripe_details_submitted: z.boolean(),
  stripe_payouts_enabled: z.boolean(),
  stripe_onboarding_completed_at: z.string().nullable(),
  vigilance_statut: z.string(),
  vigilance_gains_cumules_centimes: z.number().int(),
  vigilance_seuil_atteint_at: z.string().nullable(),
  vigilance_date_verification: z.string().nullable(),
  vigilance_attestation_url: z.string().nullable(),
  vigilance_notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type OwnerProfileRow = z.infer<typeof OwnerProfileRowSchema>;

// ─── vehicles ────────────────────────────────────────────────────────────────

export const VehicleRowSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  driver_id: z.string().uuid().nullable(),
  name: z.string(),
  type: VehicleTypeSchema,
  status: VehicleStatusSchema,
  condition: VehicleConditionSchema.nullable(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  color: z.string().nullable(),
  license_plate: z.string().nullable(),
  description: z.string().nullable(),
  photos: z.array(z.string()).nullable(),
  price_per_day: z.number(),
  km_per_day: z.number().nullable(),
  surface_m2: z.number().nullable(),
  format_publicitaire: z.string().nullable(),
  zones: z.array(z.string()).nullable(),
  admin_notes: z.string().nullable(),
  ai_verification: z.unknown().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type VehicleRow = z.infer<typeof VehicleRowSchema>;

// ─── advertiser_profiles ─────────────────────────────────────────────────────

export const AdvertiserProfileRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  full_name: z.string(),
  account_type: z.string(),
  company: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  siret: z.string().nullable(),
  siret_denomination: z.string().nullable(),
  siret_verified_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type AdvertiserProfileRow = z.infer<typeof AdvertiserProfileRowSchema>;

// ─── advertiser_briefs ───────────────────────────────────────────────────────

export const AdvertiserBriefRowSchema = z.object({
  id: z.string().uuid(),
  advertiser_id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  status: BriefStatusSchema,
  vehicle_types: z.array(VehicleTypeSchema),
  start_date: z.string(),
  end_date: z.string(),
  days_count: z.number().int().nullable(),
  budget_max: z.number().nullable(),
  poseur_fee: z.number().nullable(),
  ad_format: z.string().nullable(),
  audience_target: z.string().nullable(),
  zones: z.array(z.string()),
  zone_polygon: z.unknown(),
  zone_area_km2: z.number().nullable(),
  creative_files: z.array(z.string()),
  created_at: z.string(),
  updated_at: z.string(),
});

export type AdvertiserBriefRow = z.infer<typeof AdvertiserBriefRowSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Safely parse a Supabase row, returning null on failure instead of throwing.
 * Use this when you want a runtime guard without crashing the UI on schema drift.
 */
export function safeParseRow<T>(schema: z.ZodType<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[db/schemas] Row validation failed", result.error.flatten());
    }
    return null;
  }
  return result.data;
}

/**
 * Safely parse an array of Supabase rows, filtering out any rows that fail validation.
 */
export function safeParseRows<T>(schema: z.ZodType<T>, data: unknown[]): T[] {
  return data.flatMap((row) => {
    const parsed = safeParseRow(schema, row);
    return parsed !== null ? [parsed] : [];
  });
}
