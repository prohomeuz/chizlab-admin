/**
 * packages/contracts/index.ts
 *
 * Hand-written TypeScript types derived from packages/contracts/openapi.yaml.
 * This file is the single source of truth for shared types across:
 *   - apps/api      (NestJS backend — import for DTO validation guards)
 *   - apps/admin    (React frontend — import for TanStack Query / Zod schemas)
 *
 * Rules:
 *   - No `any`. Strict TypeScript throughout.
 *   - Every interface/type matches its counterpart schema in openapi.yaml exactly.
 *   - Do not add fields not present in the YAML schema.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Lifecycle status of a Material record. */
export type MaterialStatus = 'pending' | 'draft' | 'ready';

/** Type/format of a Material. */
export type MaterialType =
  | 'textbook_electronic'
  | 'thesis'
  | 'article'
  | 'textbook'
  | 'monograph'
  | 'presentation';

// ---------------------------------------------------------------------------
// Core entities
// ---------------------------------------------------------------------------

/**
 * Full Material record as returned by the admin API.
 * Includes `deletedAt` (null for non-deleted records).
 */
export interface Material {
  /** UUID primary key. */
  id: string;
  /** Material title. AI-fillable. */
  title: string;
  /** Plain-text description. AI-fillable. */
  description: string;
  /** Short marketing blurb. AI-fillable. */
  blurb: string | null;
  /** Foreign key to Category.id. Null until a category is assigned. */
  categoryId: string | null;
  /** Material type selected by admin. */
  materialType: MaterialType | null;
  /** MinIO URL of the uploaded media file. Null until media is uploaded. */
  mediaUrl: string | null;
  /** MinIO URL of the AI-generated cover image. Null until cover is generated. */
  coverUrl: string | null;
  /** Free-text tags (5-6 keywords). AI-fillable. */
  tags: string[];
  /** Author names extracted by AI. */
  authors: string[];
  /** Language of the material. AI-fillable. */
  language: string | null;
  /** Publication year. AI-fillable. */
  publishYear: number | null;
  /** Country of publication. AI-fillable. */
  country: string | null;
  /** Page count. AI-fillable. */
  pageCount: number | null;
  /** Lifecycle status. */
  status: MaterialStatus;
  /** True only after successful AI analysis. */
  isReady: boolean;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** ISO-8601 last-update timestamp. */
  updatedAt: string;
  /**
   * ISO-8601 soft-delete timestamp.
   * Null means the record is not deleted.
   * Omitted from public API responses — use PublicMaterial for those.
   */
  deletedAt: string | null;
  /**
   * pgvector embedding (array of floats). Null until computed.
   * Used for future semantic search. Omitted from public API responses.
   */
  embedding: number[] | null;
}

/**
 * Public-facing Material record (omits `deletedAt`).
 * Only `status=ready AND deletedAt IS NULL` records are ever returned from the public API.
 */
export interface PublicMaterial {
  id: string;
  title: string;
  description: string;
  categoryId: string | null;
  mediaUrl: string | null;
  coverUrl: string | null;
  tags: string[];
  status: MaterialStatus;
  isReady: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Category record (flat — reconstruct tree client-side using parentId). */
export interface Category {
  /** UUID primary key. */
  id: string;
  /** Display name. */
  name: string;
  /** Parent category UUID. Null for root categories. */
  parentId: string | null;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Pagination envelope
// ---------------------------------------------------------------------------

/**
 * Generic pagination wrapper returned by list endpoints.
 *
 * @template T  The type of items in the page.
 *
 * @example
 * // Admin materials list
 * const result: PaginationEnvelope<Material> = await api.get('/api/admin/materials');
 *
 * // Public materials list
 * const result: PaginationEnvelope<PublicMaterial> = await api.get('/api/public/materials');
 */
export interface PaginationEnvelope<T> {
  /** The records for this page. */
  items: T[];
  /** Total number of records matching the filter (before pagination). */
  total: number;
  /** Page size used in this request. */
  limit: number;
  /** Offset used in this request. */
  offset: number;
}

// ---------------------------------------------------------------------------
// Material DTOs
// ---------------------------------------------------------------------------

/**
 * Request body for POST /api/admin/materials.
 * Status always starts as 'pending' — AI sets it to 'ready'.
 * User provides: mediaUrl, materialType, categoryId only.
 */
export interface CreateMaterialDto {
  mediaUrl?: string | null;
  materialType?: MaterialType | null;
  categoryId?: string | null;
  /** Optionally pre-fill; AI will overwrite. */
  title?: string;
  description?: string;
  tags?: string[];
  /**
   * 1-indexed page numbers to include in AI analysis.
   * Omit (or send every page) to analyze the full document.
   */
  selectedPages?: number[];
  /**
   * Total page count from the page-prep render (deterministic). Stored on the
   * material so "Sahifa soni" is accurate even if the AI fails to extract it.
   */
  pageCount?: number;
}

/**
 * Request body for PUT /api/admin/materials/:id.
 * All fields optional — only provided fields are updated (partial update).
 */
export interface UpdateMaterialDto {
  title?: string;
  description?: string;
  blurb?: string | null;
  categoryId?: string | null;
  materialType?: MaterialType | null;
  mediaUrl?: string | null;
  tags?: string[];
  authors?: string[];
  language?: string | null;
  publishYear?: number | null;
  country?: string | null;
  pageCount?: number | null;
  status?: MaterialStatus;
}

// ---------------------------------------------------------------------------
// Category DTOs
// ---------------------------------------------------------------------------

/** Request body for POST /api/admin/categories. */
export interface CreateCategoryDto {
  /** Required. Max 256 characters. */
  name: string;
  /** Omit or null for root category. */
  parentId?: string | null;
}

/** Request body for PUT /api/admin/categories/:id. */
export interface UpdateCategoryDto {
  /** Max 256 characters. */
  name?: string;
  parentId?: string | null;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** Request body for POST /api/admin/auth/login. */
export interface LoginRequest {
  /**
   * Exactly 8 numeric digits.
   * Pattern: /^\d{8}$/
   */
  pin: string;
}

/** Response body from POST /api/admin/auth/login. */
export interface LoginResponse {
  /** Short-lived JWT access token. */
  accessToken: string;
  /** Long-lived refresh token. */
  refreshToken: string;
  /** Access token TTL in seconds (e.g. 900 = 15 min). */
  expiresIn: number;
}

/** Request body for POST /api/admin/auth/refresh. */
export interface RefreshRequest {
  refreshToken: string;
}

/** Response body from POST /api/admin/auth/refresh. */
export interface RefreshResponse {
  /** New short-lived JWT access token. */
  accessToken: string;
  /** Access token TTL in seconds. */
  expiresIn: number;
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/** Response body from POST /api/admin/upload. */
export interface UploadResponse {
  /** Fully-qualified public MinIO URL of the uploaded file. */
  url: string;
}

// ---------------------------------------------------------------------------
// Page-prep (page-thumbnail preview for AI-analysis page selection)
// ---------------------------------------------------------------------------

/** Request body for POST /api/admin/materials/prepare-pages. */
export interface PreparePagesDto {
  mediaUrl: string;
}

/** Response body from POST /api/admin/materials/prepare-pages. */
export interface PreparePagesResponse {
  jobId: string;
}

/** Response body from GET /api/admin/materials/prepare-pages/:jobId. */
export interface PreparePagesStatus {
  status: 'pending' | 'done' | 'error';
  progress: number;
  pageCount?: number;
  thumbnailUrls?: string[];
  error?: string;
}

// ---------------------------------------------------------------------------
// AI worker callback
// ---------------------------------------------------------------------------

/**
 * Request body for POST /internal/ai-result.
 * Sent by the Python AI worker after media analysis completes.
 * Protected by X-Internal-Secret header.
 */
export interface AiResultCallback {
  /** UUID of the Material that was analyzed. */
  materialId: string;
  /**
   * True if analysis succeeded.
   * On success: backend sets status=ready, isReady=true and applies AI-filled fields.
   * On false: backend leaves status=pending, sets isReady=false.
   */
  success: boolean;
  /** AI-generated title. Present when success=true. */
  title?: string | null;
  /** AI-generated plain-text description. Present when success=true. */
  description?: string | null;
  /** AI-generated short marketing blurb. Present when success=true. */
  blurb?: string | null;
  /** AI-generated tags (5-6 keywords). Present when success=true. */
  tags?: string[] | null;
  /** AI-extracted author names. Present when success=true. */
  authors?: string[] | null;
  /** AI-detected language. Present when success=true. */
  language?: string | null;
  /** AI-detected publication year. Present when success=true. */
  publishYear?: number | null;
  /** AI-detected country. Present when success=true. */
  country?: string | null;
  /** AI-detected page count. Present when success=true. */
  pageCount?: number | null;
  /**
   * Category UUID suggested by AI.
   * Backend validates the UUID exists before applying it.
   */
  suggestedCategoryId?: string | null;
  /** Human-readable error message. Present when success=false. */
  error?: string | null;
}

// ---------------------------------------------------------------------------
// Error response
// ---------------------------------------------------------------------------

/** Standard error envelope returned by all error responses. */
export interface ErrorResponse {
  /** HTTP status code (mirrors the HTTP response status). */
  statusCode: number;
  /** Human-readable description of the error. */
  message: string;
  /** Short error category / code. Optional. */
  error?: string | null;
}

// ---------------------------------------------------------------------------
// Query parameter shapes (convenience types for frontend use)
// ---------------------------------------------------------------------------

/** Query parameters accepted by GET /api/admin/materials. */
export interface AdminMaterialsQuery {
  limit?: number;
  offset?: number;
  categoryId?: string;
  materialType?: MaterialType;
  /** Comma-separated tags. */
  tags?: string;
  status?: MaterialStatus;
  search?: string;
  includeDeleted?: boolean;
}

/** Query parameters accepted by GET /api/public/materials. */
export interface PublicMaterialsQuery {
  limit?: number;
  offset?: number;
  categoryId?: string;
  /** Comma-separated tags. */
  tags?: string;
  search?: string;
}

// All types above are already exported at their declaration site.
// No re-export block needed — import directly from '@contracts/index'.
