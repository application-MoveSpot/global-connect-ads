export type AdminMFAStatus = {
  level: "aal2" | "aal1" | "none";
  needsEnrollment: boolean;
};

/** Pure helper: maps Supabase AAL levels to an AdminMFAStatus. */
export function computeAdminMFAStatus(
  currentLevel: string,
  nextLevel: string,
): AdminMFAStatus {
  // nextLevel === 'aal1' means no TOTP factor is enrolled
  const needsEnrollment = nextLevel === "aal1";
  const level = (currentLevel as "aal2" | "aal1" | "none") ?? "aal1";
  return { level, needsEnrollment };
}
