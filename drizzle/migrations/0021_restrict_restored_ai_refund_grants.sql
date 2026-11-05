REVOKE ALL ON public.refund_requests, public.refund_claims_moderation, public.moderation_alerts, public.ai_translations, public.ai_conversation_summaries FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.refund_requests TO authenticated;
GRANT SELECT ON public.refund_claims_moderation, public.ai_translations, public.ai_conversation_summaries TO authenticated;
GRANT SELECT, UPDATE ON public.moderation_alerts TO authenticated;
GRANT ALL ON public.refund_requests, public.refund_claims_moderation, public.moderation_alerts, public.ai_translations, public.ai_conversation_summaries TO service_role;
NOTIFY pgrst, 'reload schema';