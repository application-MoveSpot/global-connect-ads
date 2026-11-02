import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Skill, VehicleSkillRow, DriverSkillRow } from "./types";

// ─── Catalog ─────────────────────────────────────────────────────────────────

// Tout le monde peut lire le catalogue — pas besoin d'être connecté.
// On utilise le client public (anon key) côté middleware pour cette route.
export const listSkills = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Skill[]> => {
    const { data, error } = await context.supabase
      .from("skills")
      .select("*")
      .order("category")
      .order("label");
    if (error) throw new Error(error.message);
    return data as Skill[];
  });

// ─── Vehicle skills ───────────────────────────────────────────────────────────

export const getVehicleSkills = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ vehicleId: z.string().uuid() }))
  .handler(async ({ data, context }): Promise<VehicleSkillRow[]> => {
    const { data: rows, error } = await context.supabase
      .from("vehicle_skills")
      .select("*, skill:skills(*)")
      .eq("vehicle_id", data.vehicleId);
    if (error) throw new Error(error.message);
    return rows as VehicleSkillRow[];
  });

export const setVehicleSkills = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      vehicleId: z.string().uuid(),
      // Liste complète — on écrase les anciens (delete + insert)
      skillIds: z.array(z.string().uuid()),
    }),
  )
  .handler(async ({ data, context }): Promise<void> => {
    // Vérifie que le véhicule appartient bien à cet owner
    const { data: vehicle, error: checkErr } = await context.supabase
      .from("vehicles")
      .select("id")
      .eq("id", data.vehicleId)
      .single();

    if (checkErr || !vehicle) throw new Error("Véhicule introuvable");

    // Supprime les anciens skills, insère les nouveaux
    await context.supabase.from("vehicle_skills").delete().eq("vehicle_id", data.vehicleId);

    if (data.skillIds.length > 0) {
      const rows = data.skillIds.map((skillId: string) => ({
        vehicle_id: data.vehicleId,
        skill_id: skillId,
      }));
      const { error } = await context.supabase.from("vehicle_skills").insert(rows);
      if (error) throw new Error(error.message);
    }
  });

// ─── Driver skills ────────────────────────────────────────────────────────────

export const getDriverSkills = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ driverId: z.string().uuid() }))
  .handler(async ({ data, context }): Promise<DriverSkillRow[]> => {
    const { data: rows, error } = await context.supabase
      .from("driver_skills")
      .select("*, skill:skills(*)")
      .eq("driver_id", data.driverId);
    if (error) throw new Error(error.message);
    return rows as DriverSkillRow[];
  });

export const setDriverSkills = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      driverId: z.string().uuid(),
      skillIds: z.array(z.string().uuid()),
    }),
  )
  .handler(async ({ data, context }): Promise<void> => {
    const { data: driver, error: checkErr } = await context.supabase
      .from("drivers")
      .select("id")
      .eq("id", data.driverId)
      .single();

    if (checkErr || !driver) throw new Error("Chauffeur introuvable");

    await context.supabase.from("driver_skills").delete().eq("driver_id", data.driverId);

    if (data.skillIds.length > 0) {
      const rows = data.skillIds.map((skillId: string) => ({
        driver_id: data.driverId,
        skill_id: skillId,
      }));
      const { error } = await context.supabase.from("driver_skills").insert(rows);
      if (error) throw new Error(error.message);
    }
  });

// ─── Fleet filter ─────────────────────────────────────────────────────────────
// Côté annonceur : "Montre-moi tous les véhicules ZFE + LED dynamique"

export const filterFleetBySkills = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      requiredSlugs: z.array(z.string()).min(1),
    }),
  )
  .handler(async ({ data, context }) => {
    // Résoud les slugs en IDs
    const { data: skills, error: skillErr } = await context.supabase
      .from("skills")
      .select("id")
      .in("slug", data.requiredSlugs);

    if (skillErr) throw new Error(skillErr.message);

    const skillIds = (skills ?? []).map((s: { id: string }) => s.id);
    const required = skillIds.length;

    if (required === 0) return [];

    // Récupère les associations véhicule ↔ skill
    const { data: rows, error } = await context.supabase
      .from("vehicle_skills")
      .select("vehicle_id, vehicles(*)")
      .in("skill_id", skillIds);

    if (error) throw new Error(error.message);

    // Compte combien de skills requis chaque véhicule possède
    const countByVehicle = new Map<string, number>();
    for (const row of rows ?? []) {
      countByVehicle.set(row.vehicle_id, (countByVehicle.get(row.vehicle_id) ?? 0) + 1);
    }

    // Garde uniquement ceux qui ont TOUS les skills requis, sans doublons
    const seen = new Set<string>();
    return (rows ?? [])
      .filter((r: { vehicle_id: string }) => (countByVehicle.get(r.vehicle_id) ?? 0) >= required)
      .map((r: { vehicle_id: string; vehicles: unknown }) => r.vehicles)
      .filter((v: unknown): v is Record<string, unknown> => {
        if (!v || typeof v !== "object") return false;
        const id = (v as Record<string, unknown>).id as string;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
  });
