import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ProfitDashboard, ProfitRow } from '../types'

export function useProfitDashboard() {
  return useQuery({
    queryKey: ['profit-dashboard'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: ProfitDashboard }>(
        '/api/profit/dashboard'
      )
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useProfitStats(
  groupBy: 'model' | 'channel' | 'group' | 'date'
) {
  return useQuery({
    queryKey: ['profit-stats', groupBy],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: ProfitRow[] }>(
        `/api/profit/stats?group_by=${groupBy}`
      )
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}
