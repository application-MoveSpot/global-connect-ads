/**
 * dispatch-missions — Edge Function
 *
 * Cherche les poseurs/déposeurs disponibles dans un rayon géographique et
 * crée (ou met à jour) la mission correspondante.
 *
 * POST /functions/v1/dispatch-missions
 * Body: {
 *   campaign_request_id: string,
 *   mission_type: 'pose' | 'depose',
 *   location_lat: number,
 *   location_lng: number,
 *   location_address?: string,
 *   location_city?: string,
 *   scheduled_date: string,          // ISO date
 *   scheduled_time_slot?: string,
 *   fee_cents: number,
 *   radius_km?: number               // défaut 30
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // ── 1. Auth : seul un admin ou service_role peut dispatcher ──────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Vérification rôle admin
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleRow) {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    // ── 2. Parse body ─────────────────────────────────────────────────────────
    const body = await req.json();
    const {
      campaign_request_id,
      mission_type,
      location_lat,
      location_lng,
      location_address,
      location_city,
      scheduled_date,
      scheduled_time_slot = 'flexible',
      fee_cents,
      radius_km = 30,
    } = body;

    if (!campaign_request_id || !mission_type || !location_lat || !location_lng || !fee_cents) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['pose', 'depose'].includes(mission_type)) {
      return Response.json({ error: 'mission_type must be pose or depose' }, { status: 400 });
    }

    // Pour la dépose : vérifier que la campagne existe et est dans le bon état
    if (mission_type === 'depose') {
      const { data: campaign } = await supabase
        .from('campaign_requests')
        .select('installation_status, pm_status')
        .eq('id', campaign_request_id)
        .single();

      if (campaign?.installation_status !== 'approved') {
        return Response.json(
          { error: 'POSE_NOT_VALIDATED: impossible de planifier une dépose avant que la pose soit validée' },
          { status: 409 }
        );
      }
    }

    // ── 3. Créer ou upsert la mission ─────────────────────────────────────────
    const { data: mission, error: missionErr } = await supabase
      .from('installation_missions')
      .upsert(
        {
          campaign_request_id,
          mission_type,
          status: 'dispatched',
          location_lat,
          location_lng,
          location_address,
          location_city,
          scheduled_date,
          scheduled_time_slot,
          fee_cents,
          dispatch_radius_km: radius_km,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'campaign_request_id,mission_type',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (missionErr) {
      console.error('Mission upsert error:', missionErr);
      return Response.json({ error: missionErr.message }, { status: 500 });
    }

    // ── 4. Trouver les poseurs disponibles (PostGIS) ───────────────────────────
    const { data: installers, error: geoErr } = await supabase.rpc('find_available_installers', {
      p_lat: location_lat,
      p_lng: location_lng,
      p_radius_km: radius_km,
      p_mission_date: scheduled_date,
    });

    if (geoErr) {
      console.error('Geo dispatch error:', geoErr);
      // Ne pas bloquer : mission créée, dispatch géo échoué
    }

    const availableInstallers = installers ?? [];

    // ── 5. Enregistrer le dispatch log ────────────────────────────────────────
    if (availableInstallers.length > 0) {
      const dispatchRows = availableInstallers.map((installer: {
        payee_id: string;
        user_id: string;
        distance_km: number;
      }) => ({
        mission_id:   mission.id,
        payee_id:     installer.payee_id,
        payee_user_id: installer.user_id,
        distance_km:  installer.distance_km,
        response:     'pending',
      }));

      const { error: logErr } = await supabase
        .from('mission_dispatch_log')
        .insert(dispatchRows);

      if (logErr) {
        console.error('Dispatch log insert error:', logErr);
      }
    }

    // ── 6. Envoyer les notifications push aux poseurs (via pgmq) ─────────────
    for (const installer of availableInstallers.slice(0, 10)) {
      await supabase.from('pm_jobs').insert({
        campaign_request_id,
        job_type: 'notify_installer_dispatch',
        status: 'pending',
        user_id: installer.user_id,
        payload: {
          mission_id:       mission.id,
          mission_type,
          distance_km:      installer.distance_km,
          scheduled_date,
          location_city,
          fee_cents,
        },
      });
    }

    return Response.json({
      mission,
      installers_notified: availableInstallers.length,
      dispatched_to: availableInstallers.map((i: { user_id: string; full_name: string; distance_km: number }) => ({
        user_id: i.user_id,
        full_name: i.full_name,
        distance_km: i.distance_km,
      })),
    });

  } catch (err) {
    console.error('dispatch-missions error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});
