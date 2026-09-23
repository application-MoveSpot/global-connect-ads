/** Récupère les frais poseur actifs depuis installer_fee_config. */
export async function getInstallerFees(): Promise<{ poseFee: number; deposeFee: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabaseAdmin as any)
    .from("installer_fee_config")
    .select("pose_fee_cents, depose_fee_cents")
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = data as { pose_fee_cents: number; depose_fee_cents: number } | null;
  return {
    poseFee: row?.pose_fee_cents ?? 2000,
    deposeFee: row?.depose_fee_cents ?? 2000,
  };
}
