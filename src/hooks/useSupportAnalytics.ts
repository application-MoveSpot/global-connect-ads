import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSupportAnalytics() {
  return useQuery({
    queryKey: ['admin-support-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_support_analytics');
      if (error) throw error;
      return data as {
        total_rooms: number;
        open_rooms: number;
        resolved_rooms: number;
        avg_response_time_minutes: number;
      };
    },
    refetchInterval: 60000,
  });
}
