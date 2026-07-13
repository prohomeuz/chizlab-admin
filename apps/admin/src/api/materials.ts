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
  PreparePagesResponse,
  PreparePagesStatus,
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

export async function getMaterialProgress(id: string): Promise<{ progress: number }> {
  const res = await apiClient.get<{ progress: number }>(`/api/admin/materials/${id}/progress`);
  return res.data;
}

/** Fields drawn on the generated cover — payload for the live preview. */
export interface CoverPreviewFields {
  title?: string;
  authors?: string[];
  publishYear?: number | null;
  publishPlace?: string | null;
  country?: string | null;
}

/** Render a live cover preview (JPEG blob) from the current form fields. */
export async function getCoverPreview(
  fields: CoverPreviewFields,
  signal?: AbortSignal,
): Promise<Blob> {
  const res = await apiClient.post<Blob>('/api/admin/materials/cover-preview', fields, {
    responseType: 'blob',
    signal,
  });
  return res.data;
}

export async function preparePages(mediaUrl: string): Promise<PreparePagesResponse> {
  const res = await apiClient.post<PreparePagesResponse>('/api/admin/materials/prepare-pages', {
    mediaUrl,
  });
  return res.data;
}

export async function getPagePrepStatus(jobId: string): Promise<PreparePagesStatus> {
  const res = await apiClient.get<PreparePagesStatus>(
    `/api/admin/materials/prepare-pages/${jobId}`,
  );
  return res.data;
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
