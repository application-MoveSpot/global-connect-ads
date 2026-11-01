REVOKE ALL ON public.ai_brief_summaries FROM anon;
REVOKE ALL ON public.ai_brief_summaries FROM authenticated;
GRANT SELECT ON public.ai_brief_summaries TO authenticated;
GRANT ALL ON public.ai_brief_summaries TO service_role;