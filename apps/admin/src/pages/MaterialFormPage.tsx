import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getMaterial, createMaterial, updateMaterial, uploadMedia } from '../api/materials';
import { getCategories } from '../api/categories';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { useToastContext } from '../context/ToastContext';
import type { MaterialType } from '@contracts/index';

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
];

const ACCEPTED_MIME =
  'application/pdf,.doc,.docx,application/msword,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.ms-powerpoint,.ppt,.pptx,' +
  'application/vnd.openxmlformats-officedocument.presentationml.presentation,' +
  'application/vnd.oasis.opendocument.text,' +
  'application/vnd.oasis.opendocument.presentation,.odp,.odt,.ods';

const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.odp', '.odt', '.ods'];

function isAccepted(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
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
] as const;

const formSchema = z.object({
  mediaUrl: z.string().nullable(),
  materialType: z.enum(MATERIAL_TYPES).nullable(),
  categoryId: z.string().nullable(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  blurb: z.string().nullable().optional(),
  tags: z.array(z.string()).max(20),
  authors: z.array(z.string()),
  language: z.string().nullable().optional(),
  publishYear: z.number().int().min(1900).max(2100).nullable().optional(),
  country: z.string().nullable().optional(),
  pageCount: z.number().int().min(1).nullable().optional(),
  status: z.enum(['pending', 'draft', 'ready'] as const),
});

type FormValues = z.infer<typeof formSchema>;

function makeSchema(requireMedia: boolean) {
  return formSchema.superRefine((data, ctx) => {
    if (requireMedia && !data.mediaUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Media fayl majburiy',
        path: ['mediaUrl'],
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function AiBadge() {
  return (
    <span className="inline-flex items-center text-[10px] font-medium bg-primary-muted text-primary rounded-sm px-1.5 py-0.5 ml-1 align-middle">
      AI
    </span>
  );
}

function FieldLabel({
  children,
  ai,
  required,
}: {
  children: React.ReactNode;
  ai?: boolean;
  required?: boolean;
}) {
  return (
    <span className="text-sm font-medium text-text-primary">
      {children}
      {required && <span className="text-[#9b2c2c] ml-0.5">*</span>}
      {ai && <AiBadge />}
    </span>
  );
}

// ---------------------------------------------------------------------------
// DropzoneUpload
// ---------------------------------------------------------------------------

function DropzoneUpload({
  value,
  onChange,
  error,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  error?: string;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!isAccepted(file)) {
      setUploadError("Bu fayl turi qabul qilinmaydi. PDF, DOC, DOCX, PPT, PPTX formatlarini yuklang.");
      return;
    }
    setUploading(true);
    setProgress(0);
    setUploadError('');
    try {
      const res = await uploadMedia(file, (pct) => setProgress(pct));
      onChange(res.url);
    } catch {
      setUploadError("Yuklashda xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }, []);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => setDragActive(false);

  const fileName = value ? value.split('/').pop() : null;

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel required>Media fayl</FieldLabel>

      {/* Dropzone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !uploading && fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
        aria-label="Fayl yuklash maydoni"
        className={`
          relative flex flex-col items-center justify-center gap-3
          min-h-[200px] rounded-xl border-2 border-dashed cursor-pointer
          transition-all duration-200 select-none
          ${dragActive
            ? 'border-focus bg-primary-muted/40'
            : error
            ? 'border-[#9b2c2c] bg-[#fff5f5]'
            : 'border-border bg-bg-sunken hover:border-primary hover:bg-primary-muted/20'
          }
        `}
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_MIME}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
          aria-label="Fayl tanlash"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3 px-6">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm text-text-secondary">Yuklanmoqda...</p>
            {progress !== null && (
              <div className="w-48 bg-bg-elevated rounded-full h-1.5">
                <div
                  className="bg-accent h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            )}
          </div>
        ) : value ? (
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            <svg className="h-10 w-10 text-primary" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
            </svg>
            <p className="text-sm font-medium text-text-primary truncate max-w-xs" title={fileName ?? value}>
              {fileName ?? value}
            </p>
            <p className="text-xs text-text-muted">Yangilash uchun bosing yoki yangi fayl tashlang</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <svg
              className={`h-12 w-12 transition-colors ${dragActive ? 'text-primary' : 'text-text-muted'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.87 11.095H6.75z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-text-primary">
                {dragActive ? 'Tashlang!' : 'Faylni shu yerga tashlang'}
              </p>
              <p className="text-xs text-text-muted mt-0.5">yoki</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
              Fayl tanlash
            </Button>
            <p className="text-xs text-text-muted">
              PDF · DOC · DOCX · PPT · PPTX · ODP · ODT
            </p>
          </div>
        )}
      </div>

      {value && !uploading && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="self-start text-xs text-text-muted hover:text-[#9b2c2c] transition-colors"
          aria-label="Mediani tozalash"
        >
          Faylni olib tashlash
        </button>
      )}

      {uploadError && <p className="text-xs text-[#9b2c2c]" role="alert">{uploadError}</p>}
      {error && !uploadError && <p className="text-xs text-[#9b2c2c]" role="alert">{error}</p>}
    </div>
  );
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
  categories: { id: string; name: string; parentId: string | null }[];
  value: string | null;
  onChange: (v: string | null) => void;
  error?: string;
}) {
  const roots = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  function renderOptions(items: typeof categories, depth = 0): React.ReactNode[] {
    return items.flatMap((c) => [
      <option key={c.id} value={c.id}>
        {'  '.repeat(depth)}{depth > 0 ? '— ' : ''}{c.name}
      </option>,
      ...renderOptions(childrenOf(c.id), depth + 1),
    ]);
  }

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel required>Kategoriya</FieldLabel>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className={`w-full bg-bg-elevated border rounded-md px-[14px] py-[10px] text-base text-text-primary focus:outline-none focus:border-2 focus:border-focus transition-all ${
          error ? 'border-2 border-[#9b2c2c]' : 'border-border'
        }`}
        aria-invalid={error ? true : undefined}
      >
        <option value="">Kategoriyani tanlang</option>
        {renderOptions(roots)}
      </select>
      {error && <p className="text-xs text-[#9b2c2c]" role="alert">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MaterialTypeSelect
// ---------------------------------------------------------------------------

function MaterialTypeSelect({
  value,
  onChange,
  error,
}: {
  value: MaterialType | null;
  onChange: (v: MaterialType | null) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel required>Material turi</FieldLabel>
      <select
        value={value ?? ''}
        onChange={(e) => onChange((e.target.value as MaterialType) || null)}
        className={`w-full bg-bg-elevated border rounded-md px-[14px] py-[10px] text-base text-text-primary focus:outline-none focus:border-2 focus:border-focus transition-all ${
          error ? 'border-2 border-[#9b2c2c]' : 'border-border'
        }`}
        aria-invalid={error ? true : undefined}
      >
        <option value="">Material turini tanlang</option>
        {MATERIAL_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-[#9b2c2c]" role="alert">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TagInput
// ---------------------------------------------------------------------------

function TagInput({
  value,
  onChange,
  error,
  label,
  ai,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
  label: string;
  ai?: boolean;
}) {
  const [input, setInput] = useState('');

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (tag && !value.includes(tag) && value.length < 20) {
      onChange([...value, tag]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => onChange(value.filter((t) => t !== tag));

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1]!);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel ai={ai}>{label}</FieldLabel>
      <div
        className={`flex flex-wrap gap-1.5 items-center bg-bg-elevated border rounded-md px-3 py-2 min-h-[44px] focus-within:border-2 focus-within:border-focus transition-all ${
          error ? 'border-2 border-[#9b2c2c]' : 'border-border'
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
          onBlur={() => { if (input) addTag(input); }}
          placeholder={value.length === 0 ? "Qo'shish uchun kiriting (Enter yoki vergul)" : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
        />
      </div>
      {error && <p className="text-xs text-[#9b2c2c]" role="alert">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export function MaterialFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToastContext();

  const { data: material, isLoading: matLoading } = useQuery({
    queryKey: ['material', id],
    queryFn: () => getMaterial(id!),
    enabled: isEdit,
    refetchInterval: (q) => q.state.data?.status === 'pending' ? 4000 : false,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(makeSchema(!isEdit)),
    defaultValues: {
      mediaUrl: null,
      materialType: null,
      categoryId: null,
      title: '',
      description: '',
      blurb: '',
      tags: [],
      authors: [],
      language: '',
      publishYear: null,
      country: '',
      pageCount: null,
      status: 'pending',
    },
  });

  useEffect(() => {
    if (material) {
      reset({
        mediaUrl: material.mediaUrl,
        materialType: material.materialType as MaterialType | null,
        categoryId: material.categoryId,
        title: material.title ?? '',
        description: material.description ?? '',
        blurb: material.blurb ?? '',
        tags: material.tags ?? [],
        authors: material.authors ?? [],
        language: material.language ?? '',
        publishYear: material.publishYear ?? null,
        country: material.country ?? '',
        pageCount: material.pageCount ?? null,
        status: material.status,
      });
    }
  }, [material, reset]);

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      createMaterial({
        mediaUrl: values.mediaUrl,
        materialType: values.materialType,
        categoryId: values.categoryId,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['materials'] });
      addToast('Material muvaffaqiyatli yaratildi', 'success');
      navigate('/materials');
    },
    onError: () => {
      addToast('Saqlashda xatolik yuz berdi', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateMaterial(id!, {
        mediaUrl: values.mediaUrl,
        materialType: values.materialType,
        categoryId: values.categoryId,
        title: values.title || undefined,
        description: values.description || undefined,
        blurb: values.blurb || undefined,
        tags: values.tags,
        authors: values.authors,
        language: values.language || undefined,
        publishYear: values.publishYear ?? undefined,
        country: values.country || undefined,
        pageCount: values.pageCount ?? undefined,
        status: values.status,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['materials'] });
      void queryClient.invalidateQueries({ queryKey: ['material', id] });
      addToast('Material muvaffaqiyatli saqlandi', 'success');
      navigate('/materials');
    },
    onError: () => {
      addToast('Saqlashda xatolik yuz berdi', 'error');
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (isEdit) {
      await updateMutation.mutateAsync(values);
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const pageTitle = isEdit ? 'Materialni tahrirlash' : 'Yangi material';
  const isPending = material?.status === 'pending';

  if (isEdit && matLoading) {
    return (
      <Layout title={pageTitle}>
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 rounded-full border-2 border-accent border-t-transparent" />
        </div>
      </Layout>
    );
  }

  const isBusy = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <Layout
      title={pageTitle}
      actions={
        <Button variant="secondary" size="sm" onClick={() => navigate('/materials')}>
          Bekor qilish
        </Button>
      }
    >
      <form
        onSubmit={(e) => { void handleSubmit(onSubmit)(e); }}
        noValidate
        className="max-w-[1100px]"
      >
        {isEdit ? (
          // ----------------------------------------------------------------
          // EDIT MODE — full form
          // ----------------------------------------------------------------
          <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6">
            {/* Left column */}
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
                      <label className="text-sm font-medium text-text-primary">
                        Sarlavha <AiBadge />
                      </label>
                      <input
                        {...field}
                        value={field.value ?? ''}
                        placeholder={isPending ? 'AI aniqlamoqda...' : 'Sarlavha'}
                        disabled={isPending}
                        className="w-full bg-bg-elevated border border-border rounded-md px-[14px] py-[10px] text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-2 focus:border-focus transition-all disabled:bg-bg-sunken disabled:opacity-60"
                      />
                    </div>
                  )}
                />

                <Controller
                  name="blurb"
                  control={control}
                  render={({ field }) => (
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-text-primary">
                        Qisqa ta'rif <AiBadge />
                      </label>
                      <textarea
                        {...field}
                        value={field.value ?? ''}
                        placeholder={isPending ? 'AI aniqlamoqda...' : 'Materialning qisqa marketing tavsifi'}
                        disabled={isPending}
                        rows={3}
                        className="w-full bg-bg-elevated border border-border rounded-md px-[14px] py-[10px] text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-2 focus:border-focus transition-all resize-y disabled:bg-bg-sunken disabled:opacity-60"
                      />
                    </div>
                  )}
                />

                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-text-primary">
                        Tavsif <AiBadge />
                      </label>
                      <textarea
                        {...field}
                        value={field.value ?? ''}
                        placeholder={isPending ? 'AI aniqlamoqda...' : "Material haqida batafsil ma'lumot"}
                        disabled={isPending}
                        rows={4}
                        className="w-full bg-bg-elevated border border-border rounded-md px-[14px] py-[10px] text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-2 focus:border-focus transition-all resize-y disabled:bg-bg-sunken disabled:opacity-60"
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
                      ai
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
                      ai
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
                        <label className="text-sm font-medium text-text-primary">
                          Nashr yili <AiBadge />
                        </label>
                        <input
                          type="number"
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value ? parseInt(e.target.value, 10) : null)
                          }
                          placeholder={isPending ? 'AI...' : '2024'}
                          disabled={isPending}
                          min={1900}
                          max={2100}
                          className="w-full bg-bg-elevated border border-border rounded-md px-[14px] py-[10px] text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-2 focus:border-focus transition-all disabled:bg-bg-sunken disabled:opacity-60"
                        />
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
                        <label className="text-sm font-medium text-text-primary">
                          Sahifa soni <AiBadge />
                        </label>
                        <input
                          type="number"
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value ? parseInt(e.target.value, 10) : null)
                          }
                          placeholder={isPending ? 'AI...' : '256'}
                          disabled={isPending}
                          min={1}
                          className="w-full bg-bg-elevated border border-border rounded-md px-[14px] py-[10px] text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-2 focus:border-focus transition-all disabled:bg-bg-sunken disabled:opacity-60"
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
                        <label className="text-sm font-medium text-text-primary">
                          Til <AiBadge />
                        </label>
                        <input
                          {...field}
                          value={field.value ?? ''}
                          placeholder={isPending ? 'AI...' : "O'zbek"}
                          disabled={isPending}
                          className="w-full bg-bg-elevated border border-border rounded-md px-[14px] py-[10px] text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-2 focus:border-focus transition-all disabled:bg-bg-sunken disabled:opacity-60"
                        />
                      </div>
                    )}
                  />

                  <Controller
                    name="country"
                    control={control}
                    render={({ field }) => (
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-text-primary">
                          Davlat <AiBadge />
                        </label>
                        <input
                          {...field}
                          value={field.value ?? ''}
                          placeholder={isPending ? 'AI...' : 'O\'zbekiston'}
                          disabled={isPending}
                          className="w-full bg-bg-elevated border border-border rounded-md px-[14px] py-[10px] text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-2 focus:border-focus transition-all disabled:bg-bg-sunken disabled:opacity-60"
                        />
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

            {/* Right column */}
            <div className="space-y-4">
              {/* AI holati */}
              <div className="bg-bg-elevated rounded-lg shadow-card border border-border p-5">
                <h3 className="text-sm font-medium text-text-primary mb-3">AI holati</h3>

                {material && (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <StatusBadge status={material.status} />
                      {material.isReady && (
                        <span className="text-xs text-[#006b3c] font-medium">AI to'ldirdi</span>
                      )}
                    </div>

                    {material.status === 'pending' && (
                      <div className="flex items-center gap-2 text-xs text-[#92550a] mb-3">
                        <div className="animate-spin h-3 w-3 rounded-full border border-[#92550a] border-t-transparent" />
                        AI tahlil qilmoqda...
                      </div>
                    )}

                    {material.status === 'ready' && (
                      <p className="text-xs text-[#006b3c] mb-3">
                        ✓ AI muvaffaqiyatli tahlil qildi.
                      </p>
                    )}
                  </>
                )}

                {/* Draft toggle — only when not pending */}
                {material && material.status !== 'pending' && (
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <label className="flex items-start gap-3 cursor-pointer mt-3 pt-3 border-t border-border">
                        <input
                          type="checkbox"
                          checked={field.value === 'draft'}
                          onChange={(e) =>
                            field.onChange(e.target.checked ? 'draft' : 'ready')
                          }
                          className="mt-0.5 h-4 w-4 accent-accent"
                          aria-label="Qoralama sifatida yashirish"
                        />
                        <div>
                          <p className="text-sm font-medium text-text-primary">Qoralama</p>
                          <p className="text-xs text-text-muted mt-0.5">
                            Jamoat API'da ko'rinmaydi
                          </p>
                        </div>
                      </label>
                    )}
                  />
                )}

                {material && (
                  <div className="mt-4 pt-4 border-t border-border space-y-1 text-xs text-text-muted">
                    <p>
                      Yaratilgan:{' '}
                      {new Date(material.createdAt).toLocaleDateString('uz-UZ', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </p>
                    <p>
                      Yangilangan:{' '}
                      {new Date(material.updatedAt).toLocaleDateString('uz-UZ', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Help */}
              <div className="bg-primary-muted rounded-lg border border-primary/20 p-5">
                <h3 className="text-sm font-medium text-primary mb-2">Ma'lumot</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Material yaratilganda AI avtomatik ravishda hujjatni tahlil qilib sarlavha, tavsif, mualliflar, teglar va boshqa ma'lumotlarni to'ldiradi. Barcha maydonlarni keyinchalik qo'lda tahrirlash mumkin.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // ----------------------------------------------------------------
          // CREATE MODE — minimal: file + type + category
          // ----------------------------------------------------------------
          <div className="max-w-[680px] space-y-5">
            <div className="bg-bg-elevated rounded-lg shadow-card border border-border p-6 space-y-5">
              <Controller
                name="mediaUrl"
                control={control}
                render={({ field }) => (
                  <DropzoneUpload
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.mediaUrl?.message}
                  />
                )}
              />
            </div>

            <div className="bg-bg-elevated rounded-lg shadow-card border border-border p-6">
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

            <div className="bg-primary-muted rounded-lg border border-primary/20 p-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                <span className="font-medium text-primary">AI avtomatik to'ldiradi:</span>{' '}
                sarlavha, tavsif, mualliflar, teglar, til, nashr yili, davlat va sahifa soni.
                Fayl yuklangandan keyin tahlil boshlanadi.
              </p>
            </div>

            <div className="flex gap-3">
              <Button type="submit" loading={isBusy}>
                Yaratish
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/materials')}>
                Bekor qilish
              </Button>
            </div>
          </div>
        )}
      </form>
    </Layout>
  );
}
