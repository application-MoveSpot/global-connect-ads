/**
 * React Query hooks pour les missions d'installation (pose/dépose).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  InstallationMission,
  MissionProof,
  UpdateMissionStatusPayload,
  ValidateMissionPayload,
  DispatchMissionPayload,
  DispatchMissionResponse,
} from '@/lib/missions/types';

// ─────────────────────────────────────────────────────────────────────────────
// Clés de cache
// ─────────────────────────────────────────────────────────────────────────────
export const missionsKeys = {
  all:         () => ['missions'] as const,
  byCampaign:  (id: string) => ['missions', 'campaign', id] as const,
  byPayee:     (uid: string) => ['missions', 'payee', uid] as const,
  proofs:      (missionId: string) => ['missions', 'proofs', missionId] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Lire les missions d'une campagne (admin / propriétaire)
// ─────────────────────────────────────────────────────────────────────────────
export function useCampaignMissions(campaignId: string) {
  return useQuery({
    queryKey: missionsKeys.byCampaign(campaignId),
    queryFn: async (): Promise<InstallationMission[]> => {
      const { data, error } = await supabase
        .from('installation_missions')
        .select(`
          *,
          payee_profile:payee_profiles!payee_id ( id, user_id, full_name, city, phone, certification_status )
        `)
        .eq('campaign_request_id', campaignId)
        .order('mission_type', { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as InstallationMission[];
    },
    enabled: !!campaignId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Lire les missions du prestataire connecté
// ─────────────────────────────────────────────────────────────────────────────
export function useMyMissions(payeeUserId: string) {
  return useQuery({
    queryKey: missionsKeys.byPayee(payeeUserId),
    queryFn: async (): Promise<InstallationMission[]> => {
      const { data, error } = await supabase
        .from('installation_missions')
        .select('*')
        .eq('payee_user_id', payeeUserId)
        .not('status', 'in', '("cancelled","validated")')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as InstallationMission[];
    },
    enabled: !!payeeUserId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Lire les preuves d'une mission
// ─────────────────────────────────────────────────────────────────────────────
export function useMissionProofs(missionId: string) {
  return useQuery({
    queryKey: missionsKeys.proofs(missionId),
    queryFn: async (): Promise<MissionProof[]> => {
      const { data, error } = await supabase
        .from('mission_proofs')
        .select('*')
        .eq('mission_id', missionId)
        .order('uploaded_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as MissionProof[];
    },
    enabled: !!missionId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher une mission (admin)
// ─────────────────────────────────────────────────────────────────────────────
export function useDispatchMission() {
  const queryClient = useQueryClient();

  return useMutation<DispatchMissionResponse, Error, DispatchMissionPayload>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase.functions.invoke<DispatchMissionResponse>(
        'dispatch-missions',
        { body: payload }
      );
      if (error) throw new Error(error.message);
      return data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: missionsKeys.byCampaign(variables.campaign_request_id),
      });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mettre à jour le statut d'une mission (prestataire)
// ─────────────────────────────────────────────────────────────────────────────
export function useUpdateMissionStatus() {
  const queryClient = useQueryClient();

  return useMutation<InstallationMission, Error, UpdateMissionStatusPayload>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase.functions.invoke<{ mission: InstallationMission }>(
        'update-mission-status',
        { body: payload }
      );
      if (error) throw new Error(error.message);
      return data!.mission;
    },
    onSuccess: (mission) => {
      queryClient.invalidateQueries({
        queryKey: missionsKeys.byCampaign(mission.campaign_request_id),
      });
      queryClient.invalidateQueries({
        queryKey: missionsKeys.byPayee(mission.payee_user_id!),
      });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Valider une mission (admin)
// ─────────────────────────────────────────────────────────────────────────────
export function useValidateMission() {
  const queryClient = useQueryClient();

  return useMutation<{ mission: InstallationMission; payout_queued: boolean }, Error, ValidateMissionPayload>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase.functions.invoke<{
        mission: InstallationMission;
        payout_queued: boolean;
      }>('update-mission-status/validate', { body: payload });
      if (error) throw new Error(error.message);
      return data!;
    },
    onSuccess: ({ mission }) => {
      queryClient.invalidateQueries({
        queryKey: missionsKeys.byCampaign(mission.campaign_request_id),
      });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Uploader une preuve photo et créer l'entrée en base
// ─────────────────────────────────────────────────────────────────────────────
export function useUploadMissionProof() {
  const queryClient = useQueryClient();

  return useMutation<
    MissionProof,
    Error,
    { missionId: string; proofType: 'avant' | 'pendant' | 'apres'; file: File }
  >({
    mutationFn: async ({ missionId, proofType, file }) => {
      // 1. Upload vers Supabase Storage
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `mission-proofs/${missionId}/${proofType}-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('mission-proofs')
        .upload(path, file, { upsert: false });

      if (uploadErr) throw uploadErr;

      // 2. Obtenir l'URL publique signée (1 heure)
      const { data: { signedUrl } } = await supabase.storage
        .from('mission-proofs')
        .createSignedUrl(path, 3600);

      // 3. Insérer en base via update-mission-status (photos incluses dans payload)
      const { data, error } = await supabase
        .from('mission_proofs')
        .insert({
          mission_id:   missionId,
          proof_type:   proofType,
          storage_path: path,
          storage_url:  signedUrl,
          uploaded_by:  (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as MissionProof;
    },
    onSuccess: (proof) => {
      queryClient.invalidateQueries({
        queryKey: missionsKeys.proofs(proof.mission_id),
      });
    },
  });
}
