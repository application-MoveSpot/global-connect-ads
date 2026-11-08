// ─────────────────────────────────────────────────────────────────────────────
// Types TypeScript pour le système Pose / Dépose
// ─────────────────────────────────────────────────────────────────────────────

export type MissionType = 'pose' | 'depose';

export type MissionStatus =
  | 'pending'            // Aucun prestataire encore
  | 'dispatched'         // Notifications envoyées, en attente d'acceptation
  | 'assigned'           // Un prestataire a accepté
  | 'en_route'           // Prestataire en route
  | 'in_progress'        // Sur site
  | 'pending_validation' // Photos soumises, attente admin
  | 'validated'          // Mission validée
  | 'cancelled';

export type MissionPayoutStatus = 'pending' | 'processing' | 'transferred' | 'failed';

export type ProofType = 'avant' | 'pendant' | 'apres';

export type DispatchResponse = 'pending' | 'accepted' | 'declined' | 'expired';

export interface InstallationMission {
  id:                   string;
  campaign_request_id:  string;
  mission_type:         MissionType;
  payee_id:             string | null;
  payee_user_id:        string | null;
  status:               MissionStatus;
  location_lat:         number | null;
  location_lng:         number | null;
  location_address:     string | null;
  location_city:        string | null;
  location_postal_code: string | null;
  scheduled_date:       string | null;
  scheduled_time_slot:  'matin' | 'apres_midi' | 'journee' | 'flexible' | null;
  accepted_at:          string | null;
  started_at:           string | null;
  completed_at:         string | null;
  fee_cents:            number;
  payout_status:        MissionPayoutStatus;
  stripe_transfer_id:   string | null;
  payout_transferred_at: string | null;
  provider_notes:       string | null;
  admin_notes:          string | null;
  admin_reviewed_at:    string | null;
  dispatch_radius_km:   number;
  created_at:           string;
  updated_at:           string;
  // Relations jointes en option
  proofs?:              MissionProof[];
  payee_profile?:       PayeeProfileSummary;
}

export interface MissionProof {
  id:           string;
  mission_id:   string;
  proof_type:   ProofType;
  storage_path: string;
  storage_url:  string | null;
  uploaded_by:  string;
  uploaded_at:  string;
  metadata:     {
    gps_lat?:  number;
    gps_lng?:  number;
    taken_at?: string;
    device?:   string;
  };
}

export interface MissionDispatchLog {
  id:             string;
  mission_id:     string;
  payee_id:       string;
  payee_user_id:  string;
  distance_km:    number | null;
  dispatched_at:  string;
  response:       DispatchResponse;
  responded_at:   string | null;
}

export interface PayeeProfileSummary {
  id:               string;
  user_id:          string;
  full_name:        string;
  city:             string | null;
  phone:            string | null;
  certification_status: string;
}

export interface AvailableInstaller {
  payee_id:         string;
  user_id:          string;
  full_name:        string;
  city:             string | null;
  phone:            string | null;
  stripe_connect_id: string | null;
  distance_km:      number;
  last_position_at: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs pour les Edge Functions
// ─────────────────────────────────────────────────────────────────────────────

export interface DispatchMissionPayload {
  campaign_request_id:  string;
  mission_type:         MissionType;
  location_lat:         number;
  location_lng:         number;
  location_address?:    string;
  location_city?:       string;
  scheduled_date:       string;
  scheduled_time_slot?: 'matin' | 'apres_midi' | 'journee' | 'flexible';
  fee_cents:            number;
  radius_km?:           number;
}

export interface DispatchMissionResponse {
  mission:             InstallationMission;
  installers_notified: number;
  dispatched_to: Array<{
    user_id:     string;
    full_name:   string;
    distance_km: number;
  }>;
}

export interface UpdateMissionStatusPayload {
  mission_id:    string;
  new_status:    MissionStatus;
  proof_paths?:  Array<{ path: string; type: ProofType; url?: string }>;
  provider_notes?: string;
  location_lat?: number;
  location_lng?: number;
}

export interface ValidateMissionPayload {
  mission_id:  string;
  admin_notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Labels UI (français)
// ─────────────────────────────────────────────────────────────────────────────

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  pending:             'En attente de prestataire',
  dispatched:          'En cours de dispatch',
  assigned:            'Prestataire assigné',
  en_route:            'En route',
  in_progress:         'En cours',
  pending_validation:  'En attente de validation',
  validated:           'Validé',
  cancelled:           'Annulé',
};

export const MISSION_TYPE_LABELS: Record<MissionType, string> = {
  pose:    'Pose',
  depose:  'Dépose',
};

export const PROOF_TYPE_LABELS: Record<ProofType, string> = {
  avant:   'Photo avant',
  pendant: 'Photo pendant',
  apres:   'Photo après',
};

export const MISSION_STATUS_COLORS: Record<MissionStatus, string> = {
  pending:             'text-gray-500 bg-gray-100',
  dispatched:          'text-blue-600 bg-blue-100',
  assigned:            'text-indigo-600 bg-indigo-100',
  en_route:            'text-yellow-600 bg-yellow-100',
  in_progress:         'text-orange-600 bg-orange-100',
  pending_validation:  'text-purple-600 bg-purple-100',
  validated:           'text-green-600 bg-green-100',
  cancelled:           'text-red-600 bg-red-100',
};

// Transitions autorisées côté frontend (miroir du backend)
export const PROVIDER_ALLOWED_TRANSITIONS: Partial<Record<MissionStatus, MissionStatus[]>> = {
  dispatched:         ['assigned'],
  assigned:           ['en_route'],
  en_route:           ['in_progress'],
  in_progress:        ['pending_validation'],
};
