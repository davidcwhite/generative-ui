import { useQuery } from '@tanstack/react-query';
import { fetchDashboardData } from './data';

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard-prototype', 'market-snapshot'],
    queryFn: fetchDashboardData,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
