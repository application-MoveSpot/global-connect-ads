/**
 * update-mission-status — Edge Function
 *
 * Permet au poseur/déposeur de mettre à jour le statut de sa mission
 * et d'uploader des preuves photos.
 *
 * PATCH /functions/v1/update-mission-status
 * Body: {
 *   mission_id: string,
 *   new_status: 'accepted' | 'en_route' | 'in_progress' | 'pending_validation',
 *   proof_paths?: Array<{path: string, type: 'avant'|'pendant'|'apres', url?: string}>,
 *   provider_notes?: string,
 *   location_lat?: number,     // position actuelle du prestataire (trace)
 *   location_lng?: number,
 * }
 *
 * POST /functions/v1/update-mission-status/validate   (admin only)
 * Body: { mission_id: string, admin_notes?: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Transitions autorisées par statut courant
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  dispatched:          ['assigned'],
  assigned:            ['en_route', 'cancelled'],
  en_route:            ['in_progress', 'assigned'],
  in_progress:         ['pending_validation', 'en_route'],
  pending_validation:  [],         // Seul l'admin peut valider
  validated:           [],
  cancelled:           [],
  pending:             ['assigned'],
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const isValidateRoute = url.pathname.endsWith('/validate');

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // ══════════════════════════════════════════════════════════════════════════
    // ROUTE ADMIN : validation finale
    // ══════════════════════════════════════════════════════════════════════════
    if (isValidateRoute) {
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

      const { mission_id, admin_notes } = body;

      // Récupérer la mission
      const { data: mission, error: fetchErr } = await supabase
        .from('installation_missions')
        .select('*')
        .eq('id', mission_id)
        .single();

      if (fetchErr || !mission) {
        return Response.json({ error: 'Mission not found' }, { status: 404 });
      }

      if (mission.status !== 'pending_validation') {
        return Response.json(
          { error: `Cannot validate a mission with status '${mission.status}'` },
          { status: 409 }
        );
      }

      // Vérifier la contrainte pose avant dépose (aussi en DB via trigger, double sécurité)
      if (mission.mission_type === 'depose') {
        const { data: poseMission } = await supabase
          .from('installation_missions')
          .select('status')
          .eq('campaign_request_id', mission.campaign_request_id)
          .eq('mission_type', 'pose')
          .maybeSingle();

        if (!poseMission || poseMission.status !== 'validated') {
          return Response.json(
            { error: 'POSE_NOT_VALIDATED: validez la pose avant la dépose' },
            { status: 409 }
          );
        }
      }

      const { data: validated, error: updateErr } = await supabase
        .from('installation_missions')
        .update({
          status: 'validated',
          admin_notes,
          admin_reviewed_at: new Date().toISOString(),
          admin_reviewed_by: user.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', mission_id)
        .select()
        .single();

      if (updateErr) {
        console.error('Validate error:', updateErr);
        return Response.json({ error: updateErr.message }, { status: 500 });
      }

      // Déclencher le virement Stripe si payee a un stripe_connect_account_id
      await supabase.from('pm_jobs').insert({
        campaign_request_id: mission.campaign_request_id,
        job_type: 'payout_installer',
        status: 'pending',
        user_id: mission.payee_user_id,
        payload: {
          mission_id:   mission.id,
          mission_type: mission.mission_type,
          fee_cents:    mission.fee_cents,
          payee_id:     mission.payee_id,
        },
      });

      return Response.json({ mission: validated, payout_queued: true });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ROUTE POSEUR : mise à jour du statut
    // ══════════════════════════════════════════════════════════════════════════
    const { mission_id, new_status, proof_paths, provider_notes, location_lat, location_lng } = body;

    if (!mission_id || !new_status) {
      return Response.json({ error: 'mission_id and new_status are required' }, { status: 400 });
    }

    // Récupérer la mission en vérifiant que l'appelant en est le propriétaire
    const { data: mission, error: fetchErr } = await supabase
      .from('installation_missions')
      .select('*')
      .eq('id', mission_id)
      .eq('payee_user_id', user.id)
      .single();

    if (fetchErr || !mission) {
      return Response.json({ error: 'Mission not found or not yours' }, { status: 404 });
    }

    // Vérifier la transition
    const allowed = ALLOWED_TRANSITIONS[mission.status] ?? [];
    if (!allowed.includes(new_status)) {
      return Response.json(
        { error: `Transition '${mission.status}' → '${new_status}' non autorisée. Autorisées: [${allowed.join(', ')}]` },
        { status: 409 }
      );
    }

    // Préparer les champs de mise à jour
    const updates: Record<string, unknown> = {
      status: new_status,
      provider_notes: provider_notes ?? mission.provider_notes,
    };

    if (new_status === 'assigned')    updates.accepted_at   = new Date().toISOString();
    if (new_status === 'in_progress') updates.started_at    = new Date().toISOString();

    // Enregistrer la position actuelle du prestataire
    if (location_lat && location_lng) {
      await supabase.from('provider_positions').insert({
        provider_id:      mission.payee_user_id,
        service_quote_id: null,
        lat:              location_lat,
        lng:              location_lng,
        recorded_at:      new Date().toISOString(),
      });
    }

    // Mettre à jour la mission
    const { data: updated, error: updateErr } = await supabase
      .from('installation_missions')
      .update(updates)
      .eq('id', mission_id)
      .select()
      .single();

    if (updateErr) {
      console.error('Status update error:', updateErr);
      return Response.json({ error: updateErr.message }, { status: 500 });
    }

    // Insérer les preuves photos si fournies
    let proofsInserted = 0;
    if (proof_paths && Array.isArray(proof_paths) && proof_paths.length > 0) {
      const proofRows = proof_paths.map((p: { path: string; type: string; url?: string }) => ({
        mission_id:   mission_id,
        proof_type:   p.type,
        storage_path: p.path,
        storage_url:  p.url ?? null,
        uploaded_by:  user.id,
      }));

      const { error: proofErr, count } = await supabase
        .from('mission_proofs')
        .insert(proofRows, { count: 'exact' });

      if (proofErr) {
        console.error('Proof insert error:', proofErr);
      } else {
        proofsInserted = count ?? proofRows.length;
      }
    }

    // Marquer la réponse dans le dispatch log
    await supabase
      .from('mission_dispatch_log')
      .update({ response: 'accepted', responded_at: new Date().toISOString() })
      .eq('mission_id', mission_id)
      .eq('payee_user_id', user.id);

    // Notifier les autres poseurs que la mission est prise (decline les pending)
    if (new_status === 'assigned') {
      await supabase
        .from('mission_dispatch_log')
        .update({ response: 'expired', responded_at: new Date().toISOString() })
        .eq('mission_id', mission_id)
        .neq('payee_user_id', user.id)
        .eq('response', 'pending');
    }

    return Response.json({
      mission: updated,
      proofs_inserted: proofsInserted,
    });

  } catch (err) {
    console.error('update-mission-status error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});
