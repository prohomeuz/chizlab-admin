import { apiClient } from './client';
import type { Category } from '@contracts/index';

export async function getCategories(): Promise<Category[]> {
  const res = await apiClient.get<Category[]>('/api/admin/categories');
  return res.data;
}
