/**
 * Categories admin API calls.
 */
import { apiClient } from './client';
import type {
  Category,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '@contracts/index';

export async function getCategories(): Promise<Category[]> {
  const res = await apiClient.get<Category[]>('/api/admin/categories');
  return res.data;
}

export async function createCategory(dto: CreateCategoryDto): Promise<Category> {
  const res = await apiClient.post<Category>('/api/admin/categories', dto);
  return res.data;
}

export async function updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
  const res = await apiClient.put<Category>(`/api/admin/categories/${id}`, dto);
  return res.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/api/admin/categories/${id}`);
}
