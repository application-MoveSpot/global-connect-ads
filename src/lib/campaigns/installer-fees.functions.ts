import { createServerFn } from "@tanstack/react-start";

/** Expose les frais poseur actifs au client (lecture seule, pas d'auth requise). */
export const getInstallerFeeConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { getInstallerFees } = await import("@/lib/campaigns/installer-fees.server");
  return getInstallerFees();
});
