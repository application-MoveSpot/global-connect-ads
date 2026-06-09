GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
GRANT SELECT ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;