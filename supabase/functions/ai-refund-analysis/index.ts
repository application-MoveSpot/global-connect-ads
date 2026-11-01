import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── JSON schema de réponse attendu de Claude ──────────────────────────────────
const SYSTEM_PROMPT = `Tu es un moteur d'analyse de conformité et de détection de fraude pour MoveSpot, plateforme de publicité mobile sur véhicules en France (taxi, VTC, camionnettes, etc.).
Tu analyses les demandes de remboursement soumises par les annonceurs et retournes une décision structurée.

════════════════════════════════════════════════════════
  POLITIQUE DE REMBOURSEMENT MOVESPOT — Version 2026
════════════════════════════════════════════════════════

## MOTIFS ÉLIGIBLES AU REMBOURSEMENT

1. Campagne non démarrée à la date contractuelle par faute de MoveSpot ou du prestataire poseur.
2. Non-conformité avérée des visuels posés : mauvaise taille, couleurs incorrectes, position non contractuelle.
3. Défaillance technique documentée : visuels non posés, tracking GPS défaillant rendant la campagne invérifiable.
4. Interruption prématurée de la campagne par MoveSpot (résiliation ou défaillance de flotte prestataire).
5. Double facturation ou erreur de montant (montant débité supérieur au devis signé).
6. Vehicule détruit ou accident grave rendant l'affichage impossible pendant la durée contractuelle.

## MOTIFS NON ÉLIGIBLES

1. Changement de stratégie marketing ou d'avis de l'annonceur après démarrage.
2. Résultats publicitaires jugés insuffisants, sauf garantie contractuelle d'impressions minimales explicitement accordée.
3. Délai dépassé : demande soumise plus de 30 jours après la date de fin de campagne.
4. Campagne en cours d'exécution sans incident documenté signalé dans les 72h.
5. Motif vague, générique, sans fait précis ni date vérifiable.
6. Demande de remboursement total quand la campagne a partiellement été exécutée (partiel possible).
7. Insatisfaction esthétique non documentée par photos.

## RÈGLES FINANCIÈRES STRICTES

- Remboursement maximum : 100 % du montant effectivement encaissé par MoveSpot.
- Remboursement partiel : proratisé sur les jours non exécutés si campagne partiellement démarrée.
- Tout montant demandé supérieur au montant payé de la campagne → fraude probable, décision AUTO_REJECTED.
- Demande de remboursement > 500 € : revue humaine obligatoire, même si motif éligible.
- Demande de remboursement > 2 000 € : validation managériale requise, signaler dans suggested_admin_note.

## SEUILS DE DÉCISION AUTOMATIQUE

| Condition | Décision |
|---|---|
| Motif éligible ET risque low ET montant ≤ 300 € | AUTO_APPROVED |
| Motif clairement non éligible ET risque low ET pas d'ambiguïté | AUTO_REJECTED |
| Montant > 500 € (quel que soit le motif) | REQUIRES_HUMAN_REVIEW |
| Risque medium ou high | REQUIRES_HUMAN_REVIEW |
| Motif ambigu ou incomplet | REQUIRES_HUMAN_REVIEW |
| Campagne non liée (pas de campaign_request_id) | REQUIRES_HUMAN_REVIEW |

════════════════════════════════════════════════════════
  DÉTECTION DE SIGNAUX DE RISQUE ET FRAUDE
════════════════════════════════════════════════════════

Analyse le champ "reason" pour détecter les signaux suivants :

SIGNAUX D'INCOHÉRENCE :
- Dates mentionnées impossibles ou antérieures à la création du compte
- Montant réclamé supérieur au montant payé de la campagne
- Motif contredit par les métadonnées (ex. : campagne jamais payée mais remboursement demandé)
- Références à des contrats ou garanties non mentionnées dans le dossier

SIGNAUX DE PRESSION ET D'URGENCE :
- Mentions de poursuites judiciaires imminentes, avocats, tribunaux
- Ultimatums temporels très courts ("sous 24h sinon…", "dernière chance")
- Références à des organismes de protection des consommateurs avec ton menaçant

SIGNAUX D'AGRESSIVITÉ :
- Langage offensif, insultes, menaces directes
- Ton intimidant disproportionné par rapport au motif

SIGNAUX DE FABRICATION :
- Texte générique sans détails spécifiques à la campagne (copier-coller visible)
- Absence de tout fait vérifiable (dates, noms, lieux, véhicules)
- Descriptions trop précises mais incohérentes entre elles (hallucination de détails)
- Fautes d'orthographe inhabituelles ou traduction automatique apparente

CALCUL DU SCORE DE RISQUE (0-100) :
- 0-25 : Low — aucun signal ou signal très mineur
- 26-55 : Medium — 1-2 signaux modérés ou un signal fort isolé
- 56-100 : High — plusieurs signaux forts, fraude probable

════════════════════════════════════════════════════════
  FORMAT DE RÉPONSE — STRICT
════════════════════════════════════════════════════════

Retourne UNIQUEMENT un objet JSON valide, sans markdown, sans balises de code, sans commentaires.
La réponse doit commencer par { et finir par }.

{
  "compliance_eligible": true,
  "compliance_reason": "1-2 phrases expliquant pourquoi la demande est ou n'est pas éligible selon la politique",
  "extracted_facts": [
    "Fait 1 extrait du motif textuel",
    "Fait 2 extrait du motif textuel"
  ],
  "policy_violations": [
    "Règle violée 1 si applicable"
  ],
  "risk_score": "low",
  "risk_score_numeric": 12,
  "risk_signals": [
    "Signal de risque détecté 1 si applicable"
  ],
  "tone_flags": [
    "urgent"
  ],
  "decision": "auto_approved",
  "decision_justification": "Explication détaillée de la décision pour l'équipe support (2-3 phrases)",
  "suggested_admin_note": "Note concise suggérée à copier dans le champ admin_notes (1 phrase max)"
}

Valeurs autorisées :
- compliance_eligible : true | false
- risk_score : "low" | "medium" | "high"
- risk_score_numeric : entier entre 0 et 100
- tone_flags : sous-ensemble de ["urgent", "agressif", "incohérent", "generique", "menacant", "vague"]
- decision : "auto_approved" | "auto_rejected" | "requires_human_review"`;

type RefundAnalysisInput = {
  refund_request_id: string;
};

type ModerationDecision = "auto_approved" | "auto_rejected" | "requires_human_review";
type RiskScore = "low" | "medium" | "high";

type AnalysisResult = {
  compliance_eligible: boolean;
  compliance_reason: string;
  extracted_facts: string[];
  policy_violations: string[];
  risk_score: RiskScore;
  risk_score_numeric: number;
  risk_signals: string[];
  tone_flags: string[];
  decision: ModerationDecision;
  decision_justification: string;
  suggested_admin_note: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startMs = Date.now();

  try {
    // ── Auth : service_role uniquement (appelé par trigger pg_net) ────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Vérification JWT via client anon pour identifier l'appelant
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();

    // Accepter uniquement : service_role (user == null mais token valide) ou admin
    if (authError && authError.message !== "invalid claim: missing sub claim") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (user) {
      // Appelé par un utilisateur authentifié → vérifier rôle admin
      const { data: isAdmin } = await supabaseAdmin.rpc("has_role" as never, {
        _user_id: user.id,
        _role: "admin",
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin role required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Parse input ───────────────────────────────────────────────────────────
    const input = (await req.json()) as RefundAnalysisInput;

    if (!input.refund_request_id) {
      return new Response(
        JSON.stringify({ error: "refund_request_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Idempotence : ne pas analyser deux fois ───────────────────────────────
    const { data: existing } = await supabaseAdmin
      .from("refund_claims_moderation")
      .select("id")
      .eq("refund_request_id", input.refund_request_id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ status: "already_analyzed", moderation_id: existing.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Récupérer la demande + contexte campagne ──────────────────────────────
    const { data: refund, error: refundError } = await supabaseAdmin
      .from("refund_requests")
      .select(`
        id,
        user_id,
        campaign_request_id,
        amount_cents,
        reason,
        status,
        created_at,
        campaign_requests (
          id,
          spot_name,
          start_date,
          end_date,
          total_price,
          status,
          payment_status
        )
      `)
      .eq("id", input.refund_request_id)
      .maybeSingle();

    if (refundError || !refund) {
      return new Response(
        JSON.stringify({ error: "Refund request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Nombre de demandes précédentes de cet utilisateur (signal de récidive)
    const { count: previousCount } = await supabaseAdmin
      .from("refund_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", refund.user_id)
      .neq("id", refund.id);

    const campaign = (refund as any).campaign_requests as {
      id: string;
      spot_name: string;
      start_date: string | null;
      end_date: string | null;
      total_price: number | null;
      status: string;
      payment_status: string;
    } | null;

    // Construire le contexte utilisateur pour Claude
    const amountEuros = refund.amount_cents ? (refund.amount_cents / 100).toFixed(2) : null;
    const campaignPrice = campaign?.total_price ? Number(campaign.total_price).toFixed(2) : null;

    const contextLines: string[] = [
      `=== DEMANDE DE REMBOURSEMENT ===`,
      `ID demande        : ${refund.id}`,
      `Montant demandé   : ${amountEuros ? `${amountEuros} €` : "non précisé"}`,
      `Motif fourni      : ${refund.reason}`,
      `Date de soumission: ${new Date(refund.created_at).toLocaleDateString("fr-FR")}`,
      `Demandes précédentes de cet utilisateur : ${previousCount ?? 0}`,
      ``,
      `=== CAMPAGNE ASSOCIÉE ===`,
    ];

    if (campaign) {
      contextLines.push(
        `Nom               : ${campaign.spot_name}`,
        `Date de début     : ${campaign.start_date ? new Date(campaign.start_date).toLocaleDateString("fr-FR") : "inconnue"}`,
        `Date de fin       : ${campaign.end_date ? new Date(campaign.end_date).toLocaleDateString("fr-FR") : "inconnue"}`,
        `Montant payé      : ${campaignPrice ? `${campaignPrice} €` : "inconnu"}`,
        `Statut campagne   : ${campaign.status}`,
        `Statut paiement   : ${campaign.payment_status}`,
      );

      // Vérification primaire : montant demandé > montant payé
      if (amountEuros && campaignPrice && parseFloat(amountEuros) > parseFloat(campaignPrice)) {
        contextLines.push(
          `⚠️ ALERTE : montant demandé (${amountEuros} €) SUPÉRIEUR au montant payé (${campaignPrice} €) — incohérence majeure.`,
        );
      }
    } else {
      contextLines.push("Aucune campagne associée à cette demande.");
    }

    const userContext = contextLines.join("\n");

    // ── Appel Claude ─────────────────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: userContext,
        },
      ],
    });

    // Extraire uniquement le bloc texte (ignorer le bloc thinking)
    const textBlock = message.content.find((b) => b.type === "text") as
      | { type: string; text: string }
      | undefined;

    if (!textBlock) throw new Error("No text block in Claude response");

    const jsonMatch = textBlock.text.trim().match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in Claude response");

    const analysis = JSON.parse(jsonMatch[0]) as AnalysisResult;

    // ── Validation et normalisation des champs ────────────────────────────────
    const validDecisions = new Set(["auto_approved", "auto_rejected", "requires_human_review"]);
    const validRiskScores = new Set(["low", "medium", "high"]);

    if (!validDecisions.has(analysis.decision)) {
      analysis.decision = "requires_human_review";
    }
    if (!validRiskScores.has(analysis.risk_score)) {
      analysis.risk_score = "medium";
    }
    analysis.risk_score_numeric = Math.max(0, Math.min(100, Math.round(Number(analysis.risk_score_numeric) || 50)));

    // Sécurité : montant > 500€ → jamais auto_approved
    if (refund.amount_cents && refund.amount_cents > 50000 && analysis.decision === "auto_approved") {
      analysis.decision = "requires_human_review";
      analysis.decision_justification =
        `[Surclassé automatiquement] Montant > 500 €. ` + analysis.decision_justification;
    }

    // Sécurité : risque high ou medium → jamais auto_approved
    if (analysis.risk_score !== "low" && analysis.decision === "auto_approved") {
      analysis.decision = "requires_human_review";
      analysis.decision_justification =
        `[Surclassé automatiquement] Risque ${analysis.risk_score} détecté. ` + analysis.decision_justification;
    }

    const processingMs = Date.now() - startMs;

    // ── Insérer dans refund_claims_moderation ─────────────────────────────────
    const { data: modRow, error: insertError } = await supabaseAdmin
      .from("refund_claims_moderation")
      .insert({
        refund_request_id:      input.refund_request_id,
        compliance_eligible:    analysis.compliance_eligible,
        compliance_reason:      analysis.compliance_reason,
        extracted_facts:        analysis.extracted_facts ?? [],
        policy_violations:      analysis.policy_violations ?? [],
        risk_score:             analysis.risk_score,
        risk_score_numeric:     analysis.risk_score_numeric,
        risk_signals:           analysis.risk_signals ?? [],
        tone_flags:             analysis.tone_flags ?? [],
        decision:               analysis.decision,
        decision_justification: analysis.decision_justification,
        suggested_admin_note:   analysis.suggested_admin_note,
        model_version:          message.model,
        processing_ms:          processingMs,
        raw_response:           {
          usage:   message.usage,
          content: textBlock.text,
        },
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("ai-refund-analysis: insert error:", insertError);
      throw new Error(insertError.message);
    }

    // ── Mettre à jour refund_requests selon la décision ──────────────────────
    if (analysis.decision === "auto_approved") {
      await supabaseAdmin
        .from("refund_requests")
        .update({
          status:      "approved",
          admin_notes: analysis.suggested_admin_note,
          updated_at:  new Date().toISOString(),
        })
        .eq("id", input.refund_request_id);
    } else if (analysis.decision === "auto_rejected") {
      await supabaseAdmin
        .from("refund_requests")
        .update({
          status:      "rejected",
          admin_notes: analysis.suggested_admin_note,
          updated_at:  new Date().toISOString(),
        })
        .eq("id", input.refund_request_id);
    }
    // requires_human_review → statut reste "pending", pas de note automatique

    return new Response(
      JSON.stringify({
        ok:             true,
        moderation_id:  modRow.id,
        decision:       analysis.decision,
        risk_score:     analysis.risk_score,
        processing_ms:  processingMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-refund-analysis error:", e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
