import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getMaterial, createMaterial, updateMaterial, uploadMedia } from '../api/materials';
import { getCategories } from '../api/categories';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Input, Textarea } from '../components/Input';
import { StatusBadge } from '../components/StatusBadge';
import { useToastContext } from '../context/ToastContext';
import type { MaterialStatus } from '@contracts/index';

const STATUS_OPTIONS: { value: MaterialStatus; label: string }[] = [
  { value: 'draft', label: 'Qoralama' },
  { value: 'active', label: 'Faol' },
  { value: 'pending', label: 'Kutilmoqda' },
  { value: 'needs_review', label: "Ko'rib chiqish kerak" },
];

const schema = z.object({
  title: z.string().min(2, "Sarlavha kamida 2 ta belgi bo'lishi kerak"),
  description: z.string().min(10, "Tavsif kamida 10 ta belgi bo'lishi kerak"),
  categoryId: z.string().nullable(),
  tags: z.array(z.string()).max(20, 'Maksimal 20 ta teg'),
  mediaUrl: z.string().min(1, "Media fayl majburiy").nullable(),
  status: z.enum(['draft', 'active', 'pending', 'needs_review'] as const),
});

type FormValues = z.infer<typeof schema>;

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
  // Build tree for indented display
  const roots = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  function renderOptions(items: typeof categories, depth = 0): React.ReactNode[] {
    return items.flatMap((c) => [
      <option key={c.id} value={c.id} style={{ paddingLeft: `${depth * 16}px` }}>
        {'  '.repeat(depth)}{depth > 0 ? '— ' : ''}{c.name}
      </option>,
      ...renderOptions(childrenOf(c.id), depth + 1),
    ]);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-text-primary">
        Kategoriya <span className="text-[#9b2c2c]">*</span>
      </label>
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

function TagInput({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
}) {
  const [input, setInput] = useState('');

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (tag && !value.includes(tag) && value.length < 20) {
      onChange([...value, tag]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

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
      <label className="text-sm font-medium text-text-primary">Teglar</label>
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
              aria-label={`${tag} tegini o'chirish`}
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
          placeholder={value.length === 0 ? "Teg qo'shish (Enter yoki vergul)" : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          aria-label="Teg kiriting"
        />
      </div>
      {error && <p className="text-xs text-[#9b2c2c]" role="alert">{error}</p>}
    </div>
  );
}

function MediaUpload({
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
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setUploadError('');
    try {
      const res = await uploadMedia(file, (pct) => setProgress(pct));
      onChange(res.url);
    } catch {
      setUploadError('Yuklashda xatolik yuz berdi. Qayta urinib ko\'ring.');
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const isImage = value && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(value);
  const isVideo = value && /\.(mp4|webm|ogg|mov)$/i.test(value);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-text-primary">
        Media fayl <span className="text-[#9b2c2c]">*</span>
      </label>

      {/* URL input */}
      <input
        type="url"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder="Media URL ni kiriting yoki fayl yuklang"
        className={`w-full bg-bg-elevated border rounded-md px-[14px] py-[10px] text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-2 focus:border-focus transition-all ${
          error ? 'border-2 border-[#9b2c2c]' : 'border-border'
        }`}
        aria-label="Media URL"
        aria-invalid={error ? true : undefined}
      />

      {/* File picker */}
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,application/pdf,.doc,.docx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
          aria-label="Fayl tanlash"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          loading={uploading}
        >
          {uploading ? 'Yuklanmoqda...' : 'Fayl yuklash'}
        </Button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-text-muted hover:text-[#9b2c2c] transition-colors"
            aria-label="Mediani tozalash"
          >
            Tozalash
          </button>
        )}
      </div>

      {/* Progress */}
      {progress !== null && (
        <div className="w-full bg-bg-sunken rounded-full h-1.5">
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

      {uploadError && <p className="text-xs text-[#9b2c2c]" role="alert">{uploadError}</p>}
      {error && !uploadError && <p className="text-xs text-[#9b2c2c]" role="alert">{error}</p>}

      {/* Preview */}
      {value && !uploading && (
        <div className="mt-2 rounded-md overflow-hidden border border-border bg-bg-sunken" style={{ maxHeight: '240px' }}>
          {isImage ? (
            <img
              src={value}
              alt="Media preview"
              className="w-full object-cover"
              style={{ maxHeight: '240px' }}
              loading="lazy"
            />
          ) : isVideo ? (
            <video
              src={value}
              controls
              className="w-full"
              style={{ maxHeight: '240px' }}
            />
          ) : (
            <div className="flex items-center gap-3 p-4">
              <svg className="h-8 w-8 text-text-muted" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-text-secondary truncate">{value}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      categoryId: null,
      tags: [],
      mediaUrl: null,
      status: 'draft',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (material) {
      reset({
        title: material.title ?? '',
        description: material.description ?? '',
        categoryId: material.categoryId,
        tags: material.tags ?? [],
        mediaUrl: material.mediaUrl,
        status: material.status,
      });
    }
  }, [material, reset]);

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      createMaterial({
        title: values.title,
        description: values.description,
        categoryId: values.categoryId,
        tags: values.tags,
        mediaUrl: values.mediaUrl,
        status: values.status,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['materials'] });
      addToast('Material muvaffaqiyatli yaratildi', 'success');
      navigate('/materials');
    },
    onError: () => {
      addToast("Saqlashda xatolik yuz berdi", 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateMaterial(id!, {
        title: values.title,
        description: values.description,
        categoryId: values.categoryId,
        tags: values.tags,
        mediaUrl: values.mediaUrl,
        status: values.status,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['materials'] });
      void queryClient.invalidateQueries({ queryKey: ['material', id] });
      addToast("Material muvaffaqiyatli saqlandi", 'success');
      navigate('/materials');
    },
    onError: () => {
      addToast("Saqlashda xatolik yuz berdi", 'error');
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

  if (isEdit && matLoading) {
    return (
      <Layout title={pageTitle}>
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 rounded-full border-2 border-accent border-t-transparent" />
        </div>
      </Layout>
    );
  }

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
        className="max-w-[1100px]"
        noValidate
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-6">
          {/* Left column — form fields */}
          <div className="space-y-5">
            <div className="bg-bg-elevated rounded-lg shadow-card border border-border p-6 space-y-5">
              <Input
                label="Sarlavha *"
                error={errors.title?.message}
                {...register('title')}
                placeholder="Material sarlavhasini kiriting"
              />

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Textarea
                    label="Tavsif *"
                    error={errors.description?.message}
                    placeholder="Material haqida qisqacha ma'lumot kiriting"
                    {...field}
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

              <Controller
                name="tags"
                control={control}
                render={({ field }) => (
                  <TagInput
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.tags?.message}
                  />
                )}
              />
            </div>

            <div className="bg-bg-elevated rounded-lg shadow-card border border-border p-6">
              <Controller
                name="mediaUrl"
                control={control}
                render={({ field }) => (
                  <MediaUpload
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.mediaUrl?.message}
                  />
                )}
              />
            </div>

            <div className="bg-bg-elevated rounded-lg shadow-card border border-border p-6">
              <fieldset>
                <legend className="text-sm font-medium text-text-primary mb-3">Status</legend>
                <div className="space-y-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        value={opt.value}
                        {...register('status')}
                        className="w-4 h-4 accent-accent"
                      />
                      <span className="text-sm text-text-primary group-hover:text-primary transition-colors">
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="submit"
                loading={isSubmitting || createMutation.isPending || updateMutation.isPending}
              >
                Saqlash
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/materials')}
              >
                Bekor qilish
              </Button>
            </div>
          </div>

          {/* Right column — meta / AI status */}
          <div className="space-y-4">
            {/* AI status card — only in edit mode */}
            {isEdit && material && (
              <div className="bg-bg-elevated rounded-lg shadow-card border border-border p-5">
                <h3 className="text-sm font-medium text-text-primary mb-3">AI holati</h3>
                <div className="flex items-center gap-2 mb-3">
                  <StatusBadge status={material.status} />
                  {material.isReady && (
                    <span className="text-xs text-[#006b3c] font-medium">AI to'ldirdi</span>
                  )}
                </div>
                {material.status === 'pending' && (
                  <div className="flex items-center gap-2 text-xs text-[#92550a]">
                    <div className="animate-spin h-3 w-3 rounded-full border border-[#92550a] border-t-transparent" />
                    AI tahlil qilmoqda...
                  </div>
                )}
                {material.status === 'needs_review' && (
                  <p className="text-xs text-[#9b2c2c]">
                    ⚠ Qo'lda to'ldiring. AI tahlil qila olmadi.
                  </p>
                )}
                {material.status === 'active' && material.isReady && (
                  <p className="text-xs text-[#006b3c]">
                    ✓ AI muvaffaqiyatli tahlil qildi.
                  </p>
                )}

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
              </div>
            )}

            {/* Help card */}
            <div className="bg-primary-muted rounded-lg border border-primary/20 p-5">
              <h3 className="text-sm font-medium text-primary mb-2">Ma'lumot</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Material yaratilganda AI avtomatik ravishda tahlil qiladi va sarlavha, tavsif hamda teglarni to'ldirishi mumkin. Barcha maydonlarni keyin tahrirlash mumkin.
              </p>
            </div>
          </div>
        </div>
      </form>
    </Layout>
  );
}
