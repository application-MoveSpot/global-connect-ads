REVOKE EXECUTE ON FUNCTION public.assign_advertiser_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_owner_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_partner_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_provider_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_reject_bad_condition() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_validate_campaign_request() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_proposal_acceptance() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;