import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OwnerFinancialAnalytics {
  total_vehicles: number;
  active_vehicles: number;
  occupancy_rate: number;
  total_earned: number;
  projected_revenue: number;
}

export function useOwnerAnalytics() {
  return useQuery({
    queryKey: ['owner-financial-analytics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data, error } = await supabase.rpc('get_owner_financial_analytics', {
        p_owner_id: user.id,
      });

      if (error) throw error;
      return data as OwnerFinancialAnalytics;
    },
  });
}
