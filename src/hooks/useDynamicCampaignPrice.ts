import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DynamicPriceParams {
  basePrice: number;
  regionId: string;
  startDate: string; // ISO date 'YYYY-MM-DD'
  endDate: string;
}

export function useDynamicCampaignPrice(params: DynamicPriceParams | null) {
  return useQuery({
    queryKey: ['dynamic-campaign-price', params],
    queryFn: async () => {
      if (!params) return null;
      const { data, error } = await supabase.rpc('calculate_dynamic_campaign_price', {
        p_base_price: params.basePrice,
        p_region_id: params.regionId,
        p_start_date: params.startDate,
        p_end_date: params.endDate,
      });
      if (error) throw error;
      return data as number;
    },
    enabled: !!params,
  });
}
