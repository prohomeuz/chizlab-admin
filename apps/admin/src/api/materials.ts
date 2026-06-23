/**
 * Materials admin API calls.
 */
import { apiClient } from './client';
import type {
  Material,
  PaginationEnvelope,
  CreateMaterialDto,
  UpdateMaterialDto,
  AdminMaterialsQuery,
  UploadResponse,
} from '@contracts/index';

export async function getMaterials(
  params: AdminMaterialsQuery,
): Promise<PaginationEnvelope<Material>> {
  const res = await apiClient.get<PaginationEnvelope<Material>>('/api/admin/materials', { params });
  return res.data;
}

export async function getMaterial(id: string): Promise<Material> {
  const res = await apiClient.get<Material>(`/api/admin/materials/${id}`);
  return res.data;
}

export async function createMaterial(dto: CreateMaterialDto): Promise<Material> {
  const res = await apiClient.post<Material>('/api/admin/materials', dto);
  return res.data;
}

export async function updateMaterial(id: string, dto: UpdateMaterialDto): Promise<Material> {
  const res = await apiClient.put<Material>(`/api/admin/materials/${id}`, dto);
  return res.data;
}

export async function deleteMaterial(id: string): Promise<void> {
  await apiClient.delete(`/api/admin/materials/${id}`);
}

export async function uploadMedia(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiClient.post<UploadResponse>('/api/admin/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return res.data;
}
