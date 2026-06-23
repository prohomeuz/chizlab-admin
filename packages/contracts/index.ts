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
export type MaterialStatus = 'draft' | 'active' | 'pending' | 'needs_review';

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
  /** Foreign key to Category.id. Null until a category is assigned. */
  categoryId: string | null;
  /** MinIO URL of the uploaded media file. Null until media is uploaded. */
  mediaUrl: string | null;
  /** Free-text tags. AI-fillable. */
  tags: string[];
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
 * Only `status=active AND isReady=true AND deletedAt IS NULL` records
 * are ever returned from the public API.
 */
export interface PublicMaterial {
  id: string;
  title: string;
  description: string;
  categoryId: string | null;
  mediaUrl: string | null;
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
 * All fields optional. Defaults: status=pending, isReady=false.
 */
export interface CreateMaterialDto {
  /** Max 512 characters. */
  title?: string;
  /** Plain text. */
  description?: string;
  /** Category UUID. */
  categoryId?: string | null;
  /**
   * URL returned by POST /api/admin/upload.
   * Set this after uploading the media file.
   */
  mediaUrl?: string | null;
  tags?: string[];
  /** Defaults to 'pending' if omitted. */
  status?: MaterialStatus;
}

/**
 * Request body for PUT /api/admin/materials/:id.
 * All fields optional — only provided fields are updated (partial update).
 */
export interface UpdateMaterialDto {
  /** Max 512 characters. */
  title?: string;
  description?: string;
  categoryId?: string | null;
  mediaUrl?: string | null;
  tags?: string[];
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
   * On success: backend sets status=active, isReady=true and applies AI-filled fields.
   * On false: backend sets status=needs_review, isReady=false.
   */
  success: boolean;
  /** AI-generated title. Present when success=true. */
  title?: string | null;
  /** AI-generated plain-text description. Present when success=true. */
  description?: string | null;
  /** AI-generated tags. Present when success=true. */
  tags?: string[] | null;
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

// ---------------------------------------------------------------------------
// Re-exports — single import point for consumers
// ---------------------------------------------------------------------------

export type {
  // Entities
  Material,
  PublicMaterial,
  Category,
  // Pagination
  PaginationEnvelope,
  // Material DTOs
  CreateMaterialDto,
  UpdateMaterialDto,
  // Category DTOs
  CreateCategoryDto,
  UpdateCategoryDto,
  // Auth
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  RefreshResponse,
  // Upload
  UploadResponse,
  // Internal
  AiResultCallback,
  // Errors
  ErrorResponse,
  // Query helpers
  AdminMaterialsQuery,
  PublicMaterialsQuery,
};
