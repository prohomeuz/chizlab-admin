import type { MaterialType } from '@contracts/index'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { getCategories } from '../api/categories'
import {
  createMaterial,
  getMaterial,
  getMaterialProgress,
  updateMaterial,
  uploadMedia,
} from '../api/materials'
import { Button } from '../components/Button'
import { Layout } from '../components/Layout'
import { PageSelectionPanel } from '../components/PageSelectionPanel'
import { useToastContext } from '../context/ToastContext'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MATERIAL_TYPE_OPTIONS: { value: MaterialType; label: string }[] = [
  { value: 'textbook_electronic', label: "Elektron o'quv qo'llanma" },
  { value: 'thesis', label: 'Tezis' },
  { value: 'article', label: 'Maqola' },
  { value: 'textbook', label: 'Darslik' },
  { value: 'monograph', label: 'Monografiya' },
  { value: 'presentation', label: 'Taqdimot' },
]

const ACCEPTED_MIME =
  'application/pdf,.doc,.docx,application/msword,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.ms-powerpoint,.ppt,.pptx,' +
  'application/vnd.openxmlformats-officedocument.presentationml.presentation,' +
  'application/vnd.oasis.opendocument.text,' +
  'application/vnd.oasis.opendocument.presentation,.odp,.odt'

const ACCEPTED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.odp',
  '.odt',
]

function isAccepted(file: File): boolean {
  const name = file.name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))
}

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const MATERIAL_TYPES = [
  'textbook_electronic',
  'thesis',
  'article',
  'textbook',
  'monograph',
  'presentation',
] as const

const LANGUAGES = [
  "O'zbek",
  'Rus',
  'Ingliz',
  'Qoraqalpoq',
  'Tojik',
  'Qozoq',
  'Arabcha',
  'Nemis',
  'Fransuz',
  'Xitoy',
  'Yapon',
  'Koreys',
  'Turk',
  'Fors',
  'Italyan',
  'Ispan',
] as const

const COUNTRIES = [
  "O'zbekiston",
  'Rossiya',
  'AQSH',
  'Buyuk Britaniya',
  'Germaniya',
  'Fransiya',
  'Xitoy',
  'Yaponiya',
  'Janubiy Koreya',
  'Hindiston',
  'Turkiya',
  "Qozog'iston",
  "Qirg'iziston",
  'Tojikiston',
  'Turkmaniston',
  'Ukraina',
  'Belarus',
  'Ozarbayjon',
  'Gruziya',
  'Kanada',
  'Avstriya',
  'Italiya',
] as const

const CURRENT_YEAR = new Date().getFullYear()

const formSchema = z.object({
  mediaUrl: z.string().nullable(),
  materialType: z.enum(MATERIAL_TYPES).nullable(),
  categoryId: z.string().nullable(),
  title: z.string().nullable().optional(),
  blurb: z.string().nullable().optional(),
  tags: z.array(z.string()),
  authors: z.array(z.string()),
  language: z.string().nullable().optional(),
  publishYear: z.number().int().min(1900).max(2100).nullable().optional(),
  country: z.string().nullable().optional(),
  pageCount: z.number().int().min(1).nullable().optional(),
  status: z.enum(['pending', 'draft', 'ready'] as const),
  // 1-indexed pages AI should analyze. null = every page. Set programmatically
  // once the admin confirms the page-selection modal after uploading a file.
  selectedPages: z.array(z.number()).nullable(),
})

type FormValues = z.infer<typeof formSchema>

function makeSchema(requireMedia: boolean) {
  return formSchema.superRefine((data, ctx) => {
    if (requireMedia && !data.mediaUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Media fayl majburiy',
        path: ['mediaUrl'],
      })
    }
    if (requireMedia && !data.materialType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Material turi majburiy',
        path: ['materialType'],
      })
    }
    if (requireMedia && !data.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Kategoriya majburiy',
        path: ['categoryId'],
      })
    }
    // Tags min/max only in edit mode (AI fills them on create)
    if (!requireMedia) {
      if (data.tags.length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Kamida 4 ta kalit so'z",
          path: ['tags'],
        })
      }
      if (data.tags.length > 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ko'pi bilan 6 ta kalit so'z",
          path: ['tags'],
        })
      }
    }
  })
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="text-sm font-medium text-text-primary">
      {children}
      {required && <span className="text-[#9b2c2c] ml-0.5">*</span>}
    </span>
  )
}

// ---------------------------------------------------------------------------
// DropzoneUpload
// ---------------------------------------------------------------------------

function describeFile(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    pdf: 'PDF hujjat',
    doc: 'Word hujjat',
    docx: 'Word hujjat',
    ppt: 'PowerPoint',
    pptx: 'PowerPoint',
    odt: 'ODT hujjat',
    odp: 'ODP hujjat',
    ods: 'ODS hujjat',
    xls: 'Excel jadval',
    xlsx: 'Excel jadval',
  }
  return map[ext] ?? 'Hujjat'
}

function getFileExt(url: string): string {
  return (url.split('.').pop()?.toUpperCase() ?? 'FILE').slice(0, 4)
}

function DropzoneUpload({
  value,
  onChange,
  error,
  fillHeight = false,
  readOnly = false,
  disabled = false,
  disabledHint,
  onUploadingChange,
}: {
  value: string | null
  onChange: (url: string | null) => void
  error?: string
  fillHeight?: boolean
  readOnly?: boolean
  disabled?: boolean
  disabledHint?: string
  onUploadingChange?: (uploading: boolean) => void
}) {
  const [progress, setProgress] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [fadeVisible, setFadeVisible] = useState(!!value)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value) {
      requestAnimationFrame(() => setFadeVisible(true))
    } else {
      setFadeVisible(false)
    }
  }, [value])

  useEffect(() => {
    onUploadingChange?.(uploading)
  }, [uploading, onUploadingChange])

  const handleFile = async (file: File) => {
    if (disabled) return
    if (!isAccepted(file)) {
      setUploadError(
        'Bu fayl turi qabul qilinmaydi. PDF, DOC, DOCX, PPT, PPTX formatlarini yuklang.',
      )
      return
    }
    setUploading(true)
    setProgress(0)
    setUploadError('')
    try {
      const res = await uploadMedia(file, (pct) => setProgress(pct))
      setProgress(100)
      await new Promise((r) => setTimeout(r, 800))
      onChange(res.url)
    } catch {
      setUploadError("Yuklashda xatolik yuz berdi. Qayta urinib ko'ring.")
    } finally {
      setUploading(false)
      setProgress(null)
    }
  }

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }, [])

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(true)
  }

  const onDragLeave = () => setDragActive(false)

  return (
    <div className={`flex flex-col gap-2 ${fillHeight ? 'h-full' : ''}`}>
      <FieldLabel required>Media fayl</FieldLabel>

      {/* Hidden input — always mounted so ref works from any state */}
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept={ACCEPTED_MIME}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ''
        }}
        aria-label="Fayl tanlash"
      />

      {uploading ? (
        /* ── Uploading ─────────────────────────────────────────────────── */
        <div className="rounded-xl border border-primary/30 bg-primary-muted/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 rounded-full border-2 border-primary border-t-transparent flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-text-primary mb-2">Yuklanmoqda...</p>
              <div className="w-full bg-bg-elevated rounded-full h-1.5">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress ?? 0}%` }}
                  role="progressbar"
                  aria-valuenow={progress ?? 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
            {progress !== null && (
              <span className="text-sm font-semibold text-primary flex-shrink-0 tabular-nums w-10 text-right">
                {progress}%
              </span>
            )}
          </div>
        </div>
      ) : value ? (
        /* ── File uploaded ──────────────────────────────────────────────── */
        <div
          className={`transition-opacity duration-500 ${fadeVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="rounded-xl border border-border bg-bg-elevated px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-muted flex items-center justify-center">
                <span className="text-[11px] font-bold text-primary leading-none tracking-tight">
                  {getFileExt(value)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{describeFile(value)}</p>
                {!readOnly && (
                  <p className="text-xs text-[#006b3c] flex items-center gap-1 mt-0.5">
                    <svg
                      className="h-3.5 w-3.5 flex-shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Muvaffaqiyatli yuklandi
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Ko'rish
                </a>
                {!readOnly && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="text-xs text-primary hover:underline"
                    >
                      O'zgartirish
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(null)}
                      className="text-xs text-text-muted hover:text-[#9b2c2c] transition-colors"
                    >
                      O'chirish
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Empty dropzone ─────────────────────────────────────────────── */
        <div
          onDrop={disabled ? undefined : onDrop}
          onDragOver={disabled ? undefined : onDragOver}
          onDragLeave={disabled ? undefined : onDragLeave}
          onClick={() => !disabled && fileRef.current?.click()}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onKeyDown={(e) => !disabled && e.key === 'Enter' && fileRef.current?.click()}
          aria-label="Fayl yuklash maydoni"
          className={`
            flex flex-col items-center justify-center gap-3
            ${
              fillHeight ? 'flex-1' : 'min-h-[240px]'
            } rounded-xl border-2 border-dashed
            transition-all duration-200 select-none
            ${
              disabled
                ? 'border-border bg-bg-sunken opacity-50 cursor-not-allowed'
                : `cursor-pointer ${
                    dragActive
                      ? 'border-primary bg-primary-muted/40'
                      : error
                      ? 'border-[#9b2c2c] bg-[#fff5f5]'
                      : 'border-border bg-bg-sunken hover:border-primary hover:bg-primary-muted/10'
                  }`
            }
          `}
        >
          <svg
            className={`h-8 w-8 ${dragActive && !disabled ? 'text-primary' : 'text-text-muted'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <div className="text-center px-4">
            <p className="text-sm font-medium text-text-primary">
              {disabled
                ? disabledHint ?? 'Avval kerakli maydonlarni tanlang'
                : dragActive
                ? 'Tashlang!'
                : 'Faylni tashlang yoki tanlang'}
            </p>
            {!disabled && (
              <p className="text-xs text-text-muted mt-1">
                PDF · Word · PowerPoint · 100 MB gacha
              </p>
            )}
          </div>
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-[#9b2c2c]" role="alert">
          {uploadError}
        </p>
      )}
      {error && !uploadError && (
        <p className="text-xs text-[#9b2c2c]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CategorySelect
// ---------------------------------------------------------------------------

function CategorySelect({
  categories,
  value,
  onChange,
  error,
}: {
  categories: { id: string; name: string; parentId: string | null }[]
  value: string | null
  onChange: (v: string | null) => void
  error?: string
}) {
  const roots = categories.filter((c) => !c.parentId)
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id)

  function renderOptions(items: typeof categories, depth = 0): React.ReactNode[] {
    return items.flatMap((c) => [
      <option key={c.id} value={c.id}>
        {'  '.repeat(depth)}
        {depth > 0 ? '— ' : ''}
        {c.name}
      </option>,
      ...renderOptions(childrenOf(c.id), depth + 1),
    ])
  }

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel required>Kategoriya</FieldLabel>
      <div className="relative">
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          className={`w-full appearance-none bg-bg-elevated border-2 rounded-md pl-[14px] pr-10 py-[10px] text-base text-text-primary focus:outline-none focus:border-focus transition-all ${
            error ? 'border-[#9b2c2c]' : 'border-border'
          }`}
          aria-invalid={error ? true : undefined}
        >
          <option value="">Kategoriyani tanlang</option>
          {renderOptions(roots)}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      {error && (
        <p className="text-xs text-[#9b2c2c]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MaterialTypeSelect
// ---------------------------------------------------------------------------

function MaterialTypeSelect({
  value,
  onChange,
  error,
}: {
  value: MaterialType | null
  onChange: (v: MaterialType | null) => void
  error?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel required>Material turi</FieldLabel>
      <div className="relative">
        <select
          value={value ?? ''}
          onChange={(e) => onChange((e.target.value as MaterialType) || null)}
          className={`w-full appearance-none bg-bg-elevated border-2 rounded-md pl-[14px] pr-10 py-[10px] text-base text-text-primary focus:outline-none focus:border-focus transition-all ${
            error ? 'border-[#9b2c2c]' : 'border-border'
          }`}
          aria-invalid={error ? true : undefined}
        >
          <option value="">Material turini tanlang</option>
          {MATERIAL_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      {error && (
        <p className="text-xs text-[#9b2c2c]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TagInput
// ---------------------------------------------------------------------------

function TagInput({
  value,
  onChange,
  error,
  label,
}: {
  value: string[]
  onChange: (v: string[]) => void
  error?: string
  label: string
}) {
  const [input, setInput] = useState('')

  const MAX_TAGS = label === "Teglar (kalit so'zlar)" ? 6 : 999

  const addTag = (raw: string) => {
    const tag = raw.trim()
    if (tag && !value.includes(tag) && value.length < MAX_TAGS) {
      onChange([...value, tag])
    }
    setInput('')
  }

  const removeTag = (tag: string) => onChange(value.filter((t) => t !== tag))

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1]!)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel>{label}</FieldLabel>
      <div
        className={`flex flex-wrap gap-1.5 items-center bg-bg-elevated border-2 rounded-md px-3 py-2 min-h-[44px] focus-within:border-focus transition-all ${
          error ? 'border-[#9b2c2c]' : 'border-border'
        }`}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-primary-muted text-primary text-xs rounded-sm px-2 py-0.5"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`${tag} ni o'chirish`}
              className="hover:text-[#9b2c2c] transition-colors"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => {
            if (input) addTag(input)
          }}
          placeholder={value.length === 0 ? "Qo'shish uchun kiriting (Enter yoki vergul)" : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
        />
      </div>
      {error && (
        <p className="text-xs text-[#9b2c2c]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Author name abbreviation: "Raxmonjonov Xasan Aliyevich" → "X. A. Raxmonjonov"
// ---------------------------------------------------------------------------

function abbreviateAuthor(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  // Already abbreviated if first word ends with "." (e.g. "A. Tilegenov", "X.A. Raxmonjonov")
  if (parts[0]?.endsWith('.')) return name
  const [surname, ...given] = parts
  const initials = given
    .map((p) => p[0]?.toUpperCase())
    .filter(Boolean)
    .map((c) => c + '.')
    .join(' ')
  return `${initials} ${surname}`
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export function MaterialFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { addToast } = useToastContext()

  const { data: material, isLoading: matLoading } = useQuery({
    queryKey: ['material', id],
    queryFn: () => getMaterial(id!),
    enabled: isEdit,
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? 4000 : false),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const {
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(makeSchema(!isEdit)),
    defaultValues: {
      mediaUrl: null,
      materialType: null,
      categoryId: null,
      title: '',
      blurb: '',
      tags: [],
      authors: [],
      language: '',
      publishYear: null,
      country: '',
      pageCount: null,
      status: 'pending',
      selectedPages: null,
    },
  })

  const watchedMaterialType = watch('materialType')
  const watchedCategoryId = watch('categoryId')
  const watchedMediaUrl = watch('mediaUrl')
  const canUpload = Boolean(watchedMaterialType) && Boolean(watchedCategoryId)

  // True while the media file is uploading — blocks the primary action so
  // the admin can't advance before the file finishes uploading.
  const [mediaUploading, setMediaUploading] = useState(false)

  // ── Page-selection: the inline panel below the dropzone prepares page
  // thumbnails as soon as a file is uploaded. Saving is blocked until the
  // thumbnails are ready and at least one page is selected.
  const [pagePrep, setPagePrep] = useState({ ready: false, selectedCount: 0, pageCount: 0 })
  const pagePrepPending =
    !isEdit && !!watchedMediaUrl && (!pagePrep.ready || pagePrep.selectedCount === 0)

  useEffect(() => {
    if (!watchedMediaUrl) {
      setPagePrep({ ready: false, selectedCount: 0, pageCount: 0 })
      setValue('selectedPages', null)
    }
  }, [watchedMediaUrl, setValue])

  useEffect(() => {
    if (material) {
      reset({
        mediaUrl: material.mediaUrl,
        materialType: material.materialType as MaterialType | null,
        categoryId: material.categoryId,
        title: material.title ?? '',
        blurb: material.blurb ?? '',
        tags: material.tags ?? [],
        authors: (material.authors ?? []).map(abbreviateAuthor),
        language: material.language ?? '',
        publishYear: material.publishYear ?? null,
        country: material.country ?? '',
        pageCount: material.pageCount ?? null,
        status: material.status,
        selectedPages: null,
      })
    }
  }, [material, reset])

  const [processingId, setProcessingId] = useState<string | null>(null)
  const [processingDisplayed, setProcessingDisplayed] = useState<number | undefined>(undefined)
  const processingAnimRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: processingMaterial } = useQuery({
    queryKey: ['material', processingId],
    queryFn: () => getMaterial(processingId!),
    enabled: !!processingId,
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? 3000 : false),
  })

  const { data: processingProgress } = useQuery({
    queryKey: ['material-progress', processingId],
    queryFn: () => getMaterialProgress(processingId!),
    enabled: !!processingId && processingMaterial?.status === 'pending',
    refetchInterval: 2000,
  })

  useEffect(() => {
    const target = processingProgress?.progress
    if (target === undefined) return
    if (processingDisplayed === undefined) {
      setProcessingDisplayed(target)
      return
    }
    if (target <= processingDisplayed) {
      setProcessingDisplayed(target)
      return
    }
    if (processingAnimRef.current) clearInterval(processingAnimRef.current)
    const diff = target - processingDisplayed
    const stepMs = Math.max(20, 1500 / diff)
    let cur = processingDisplayed
    processingAnimRef.current = setInterval(() => {
      cur += 1
      setProcessingDisplayed(cur)
      if (cur >= target) {
        if (processingAnimRef.current) clearInterval(processingAnimRef.current)
        processingAnimRef.current = null
      }
    }, stepMs)
    return () => {
      if (processingAnimRef.current) {
        clearInterval(processingAnimRef.current)
        processingAnimRef.current = null
      }
    }
  }, [processingProgress?.progress]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (processingMaterial && processingMaterial.status !== 'pending') {
      // Fresh-create flow: we're still on /materials/new, so navigate to the
      // edit URL. Direct-navigation flow: we're already there — navigating to
      // the same URL again would be a no-op, so just clear processingId to
      // let the overlay give way to the now-populated edit form below.
      if (!isEdit) {
        navigate(`/materials/${processingMaterial.id}/edit`, { replace: true })
      }
      setProcessingId(null)
    }
  }, [processingMaterial?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // Seed processingId from the route id when navigating directly to a
  // still-analyzing material's edit page, so it reuses the same
  // polling/animation machinery as the fresh-create flow above.
  useEffect(() => {
    if (isEdit && material?.status === 'pending' && !processingId) {
      setProcessingId(material.id)
    }
  }, [isEdit, material?.status, material?.id, processingId])

  // AI hali ishlayapti — forma ochiq, lekin maydonlar loading holatida
  const aiLoading = isEdit && material?.status === 'pending'

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      createMaterial({
        mediaUrl: values.mediaUrl,
        materialType: values.materialType,
        categoryId: values.categoryId,
        selectedPages: values.selectedPages ?? undefined,
        // Real document page count from the page-prep render — deterministic, so
        // "Sahifa soni" is always accurate regardless of what the AI extracts.
        pageCount: pagePrep.pageCount || undefined,
      }),
    onSuccess: (newMaterial) => {
      void queryClient.invalidateQueries({ queryKey: ['materials'] })
      setProcessingId(newMaterial.id)
      // Darhol input sahifasiga o'tamiz — maydonlar AI tugaguncha loading holatida turadi
      navigate(`/materials/${newMaterial.id}/edit`, { replace: true })
    },
    onError: () => {
      addToast('Saqlashda xatolik yuz berdi', 'error')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateMaterial(id!, {
        mediaUrl: values.mediaUrl,
        materialType: values.materialType,
        categoryId: values.categoryId,
        title: values.title || undefined,
        blurb: values.blurb || undefined,
        tags: values.tags,
        authors: values.authors,
        language: values.language || undefined,
        publishYear: values.publishYear ?? undefined,
        country: values.country || undefined,
        pageCount: values.pageCount ?? undefined,
        // Saqlash = yakuniy tasdiq: material shu yerda READY bo'ladi
        status: 'ready',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['materials'] })
      void queryClient.invalidateQueries({ queryKey: ['material', id] })
      addToast('Material muvaffaqiyatli saqlandi', 'success')
      navigate('/materials')
    },
    onError: () => {
      addToast('Saqlashda xatolik yuz berdi', 'error')
    },
  })

  const onSubmit = async (values: FormValues) => {
    if (isEdit) {
      await updateMutation.mutateAsync(values)
    } else {
      if (pagePrepPending || mediaUploading) return
      await createMutation.mutateAsync(values)
    }
  }

  const pageTitle = isEdit ? 'Materialni tahrirlash' : 'Yangi material'

  if (isEdit && matLoading) {
    return (
      <Layout title={pageTitle}>
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 rounded-full border-2 border-accent border-t-transparent" />
        </div>
      </Layout>
    )
  }

  const isBusy = isSubmitting || createMutation.isPending || updateMutation.isPending

  return (
    <Layout
      title={pageTitle}
      actions={
        isEdit ? (
          <Button variant="secondary" size="sm" onClick={() => navigate('/materials')}>
            Bekor qilish
          </Button>
        ) : (
          <Button
            size="sm"
            loading={isBusy}
            disabled={pagePrepPending || mediaUploading}
            onClick={() => {
              void handleSubmit(onSubmit)()
            }}
          >
            Keyingi
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 ml-1.5 -mr-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        )
      }
    >
      <form
        id="material-form"
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e)
        }}
        noValidate
        className="w-full flex-1 flex flex-col"
      >
        {isEdit ? (
          // ----------------------------------------------------------------
          // EDIT MODE — full form. AI hali ishlayotgan bo'lsa maydonlar
          // disabled + pulse holatida turadi va tugagach avtomatik to'ladi.
          // ----------------------------------------------------------------
          <fieldset disabled={aiLoading} className={aiLoading ? 'ai-loading' : ''}>
            {aiLoading && (
              <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary-muted/20 px-4 py-3 mb-5">
                <div className="animate-spin h-5 w-5 rounded-full border-2 border-primary border-t-transparent flex-shrink-0" />
                <p className="text-sm text-text-primary">
                  AI tahlil qilmoqda
                  {typeof processingDisplayed === 'number' && (
                    <span className="tabular-nums text-text-secondary"> · {processingDisplayed}%</span>
                  )}
                </p>
              </div>
            )}
            {!aiLoading && material?.status === 'draft' && !material.isReady && (
              <div className="flex items-center gap-3 rounded-lg border border-[#e0b13d]/50 bg-[#fdf6e3] px-4 py-3 mb-5">
                <svg
                  className="h-5 w-5 text-[#b7791f] flex-shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-[#7a5c14]">
                  AI tahlili muvaffaqiyatsiz tugadi (internet yoki AI xizmatidagi uzilish bo'lishi
                  mumkin). Maydonlarni qo'lda to'ldirib saqlashingiz yoki materialni qaytadan
                  yaratishingiz mumkin.
                </p>
              </div>
            )}
            <div className="grid grid-cols-[70fr_30fr] gap-6 items-start">
            <div className="space-y-5">
              {/* Media */}
              <div className="bg-bg-elevated rounded-lg shadow-card border border-border p-6">
                <Controller
                  name="mediaUrl"
                  control={control}
                  render={({ field }) => (
                    <DropzoneUpload
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.mediaUrl?.message}
                      readOnly={isEdit}
                    />
                  )}
                />
              </div>

              {/* Asosiy ma'lumotlar */}
              <div className="bg-bg-elevated rounded-lg shadow-card border border-border p-6 space-y-5">
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                  Asosiy ma'lumotlar
                </h2>

                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-text-primary">Sarlavha</label>
                      <input
                        {...field}
                        value={field.value ?? ''}
                        placeholder={aiLoading ? "Ma'lumot olinmoqda..." : 'Sarlavha'}
                        className="w-full bg-bg-elevated border-2 border-border rounded-md px-[14px] py-[10px] text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-focus transition-all disabled:bg-bg-sunken disabled:opacity-60"
                      />
                    </div>
                  )}
                />

                <Controller
                  name="blurb"
                  control={control}
                  render={({ field }) => (
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-text-primary">Qisqa ta'rif</label>
                      <textarea
                        {...field}
                        value={field.value ?? ''}
                        placeholder={
                          aiLoading ? "Ma'lumot olinmoqda..." : 'Materialning qisqa marketing tavsifi'
                        }
                        rows={3}
                        className="w-full bg-bg-elevated border-2 border-border rounded-md px-[14px] py-[10px] text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-focus transition-all resize-y disabled:bg-bg-sunken disabled:opacity-60"
                      />
                    </div>
                  )}
                />
              </div>

              {/* Bibliografik ma'lumotlar */}
              <div className="bg-bg-elevated rounded-lg shadow-card border border-border p-6 space-y-5">
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                  Bibliografik ma'lumotlar
                </h2>

                <Controller
                  name="authors"
                  control={control}
                  render={({ field }) => (
                    <TagInput
                      value={field.value}
                      onChange={field.onChange}
                      label="Mualliflar"
                      error={errors.authors?.message}
                    />
                  )}
                />

                <Controller
                  name="tags"
                  control={control}
                  render={({ field }) => (
                    <TagInput
                      value={field.value}
                      onChange={field.onChange}
                      label="Teglar (kalit so'zlar)"
                      error={errors.tags?.message}
                    />
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Controller
                    name="publishYear"
                    control={control}
                    render={({ field }) => (
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-text-primary">Nashr yili</label>
                        <div className="relative">
                          <select
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value ? parseInt(e.target.value, 10) : null)
                            }
                            className="w-full appearance-none bg-bg-elevated border-2 border-border rounded-md pl-[14px] pr-10 py-[10px] text-base text-text-primary focus:outline-none focus:border-focus transition-all disabled:bg-bg-sunken disabled:opacity-60"
                          >
                            <option value="">— Tanlang —</option>
                            {Array.from(
                              { length: CURRENT_YEAR - 1899 },
                              (_, i) => CURRENT_YEAR - i,
                            ).map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </select>
                          <svg
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        {errors.publishYear && (
                          <p className="text-xs text-[#9b2c2c]">{errors.publishYear.message}</p>
                        )}
                      </div>
                    )}
                  />

                  <Controller
                    name="pageCount"
                    control={control}
                    render={({ field }) => (
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-text-primary">Sahifa soni</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const v = e.target.value
                            if (v === '') {
                              field.onChange(null)
                              return
                            }
                            if (!/^\d+$/.test(v)) return
                            const n = parseInt(v, 10)
                            if (n >= 1) field.onChange(n)
                          }}
                          placeholder="256"
                          className="w-full bg-bg-elevated border-2 border-border rounded-md px-[14px] py-[10px] text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-focus transition-all disabled:bg-bg-sunken disabled:opacity-60"
                        />
                        {errors.pageCount && (
                          <p className="text-xs text-[#9b2c2c]">{errors.pageCount.message}</p>
                        )}
                      </div>
                    )}
                  />

                  <Controller
                    name="language"
                    control={control}
                    render={({ field }) => (
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-text-primary">Til</label>
                        <div className="relative">
                          <select
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            className="w-full appearance-none bg-bg-elevated border-2 border-border rounded-md pl-[14px] pr-10 py-[10px] text-base text-text-primary focus:outline-none focus:border-focus transition-all disabled:bg-bg-sunken disabled:opacity-60"
                          >
                            <option value="">— Tanlang —</option>
                            {LANGUAGES.map((l) => (
                              <option key={l} value={l}>
                                {l}
                              </option>
                            ))}
                          </select>
                          <svg
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  />

                  <Controller
                    name="country"
                    control={control}
                    render={({ field }) => (
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-text-primary">Davlat</label>
                        <div className="relative">
                          <select
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            className="w-full appearance-none bg-bg-elevated border-2 border-border rounded-md pl-[14px] pr-10 py-[10px] text-base text-text-primary focus:outline-none focus:border-focus transition-all disabled:bg-bg-sunken disabled:opacity-60"
                          >
                            <option value="">— Tanlang —</option>
                            {COUNTRIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <svg
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>

              {/* Klassifikatsiya */}
              <div className="bg-bg-elevated rounded-lg shadow-card border border-border p-6 space-y-5">
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                  Klassifikatsiya
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Controller
                    name="materialType"
                    control={control}
                    render={({ field }) => (
                      <MaterialTypeSelect
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.materialType?.message}
                      />
                    )}
                  />

                  <Controller
                    name="categoryId"
                    control={control}
                    render={({ field }) => (
                      <CategorySelect
                        categories={categories ?? []}
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.categoryId?.message}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button type="submit" loading={isBusy}>
                  Saqlash
                </Button>
                <Button type="button" variant="secondary" onClick={() => navigate('/materials')}>
                  Bekor qilish
                </Button>
              </div>
            </div>

            {/* Right column — muqova rasmi */}
            <div className="sticky top-0">
              {material?.coverUrl ? (
                <img
                  src={material.coverUrl}
                  alt="Muqova"
                  className="w-full rounded-lg object-cover shadow-card"
                />
              ) : (
                <div className="bg-bg-elevated rounded-lg border border-dashed border-border flex items-center justify-center min-h-[200px]">
                  <p className="text-sm text-text-muted">Muqova mavjud emas</p>
                </div>
              )}
            </div>
            </div>
          </fieldset>
        ) : (
          // ----------------------------------------------------------------
          // CREATE MODE — minimal: file + type + category
          // ----------------------------------------------------------------
          <div className="flex-1 flex flex-col gap-5">
            <div className="grid grid-cols-[7fr_3fr] gap-5 items-stretch flex-1 min-h-0">
              {/* Left 70%: Media fayl + inline sahifa tanlash */}
              <div className="bg-bg-elevated rounded-lg shadow-card border border-border p-6 flex flex-col">
                <Controller
                  name="mediaUrl"
                  control={control}
                  render={({ field }) => (
                    <DropzoneUpload
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.mediaUrl?.message}
                      fillHeight={!field.value}
                      readOnly={isEdit}
                      disabled={!isEdit && !canUpload}
                      disabledHint="Fayl yuklashdan oldin Material turi va Kategoriyani tanlang"
                      onUploadingChange={setMediaUploading}
                    />
                  )}
                />
                {watchedMediaUrl && (
                  <PageSelectionPanel
                    key={watchedMediaUrl}
                    mediaUrl={watchedMediaUrl}
                    onChange={(sp) => setValue('selectedPages', sp)}
                    onStateChange={setPagePrep}
                  />
                )}
              </div>

              {/* Right 30%: Material turi + Kategoriya stacked */}
              <div className="bg-bg-elevated rounded-lg shadow-card border border-border p-6 flex flex-col gap-4">
                <Controller
                  name="materialType"
                  control={control}
                  render={({ field }) => (
                    <MaterialTypeSelect
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.materialType?.message}
                    />
                  )}
                />

                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <CategorySelect
                      categories={categories ?? []}
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.categoryId?.message}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </form>

    </Layout>
  )
}
