/**
 * Site analytics admin API calls.
 */
import { apiClient } from './client';
import type { AnalyticsSummary } from '@contracts/index';

export async function getAnalyticsSummary(days: number): Promise<AnalyticsSummary> {
  const res = await apiClient.get<AnalyticsSummary>('/api/admin/analytics/summary', {
    params: { days },
  });
  return res.data;
}
