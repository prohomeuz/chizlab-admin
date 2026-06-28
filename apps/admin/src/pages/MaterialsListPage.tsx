import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMaterials, deleteMaterial } from '../api/materials';
import { getCategories } from '../api/categories';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { Spinner } from '../components/Spinner';
import { ConfirmModal } from '../components/Modal';
import { useToastContext } from '../context/ToastContext';
import type { Material, MaterialStatus, MaterialType, AdminMaterialsQuery } from '@contracts/index';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const STATUS_OPTIONS: { value: MaterialStatus | ''; label: string }[] = [
  { value: '', label: 'Barcha statuslar' },
  { value: 'pending', label: 'Kutilmoqda' },
  { value: 'draft', label: 'Qoralama' },
  { value: 'ready', label: 'Tayyor' },
];

const MATERIAL_TYPE_OPTIONS: { value: MaterialType | ''; label: string }[] = [
  { value: '', label: 'Barcha turlar' },
  { value: 'textbook_electronic', label: "Elektron o'quv qo'llanma" },
  { value: 'thesis', label: 'Tezis' },
  { value: 'article', label: 'Maqola' },
  { value: 'textbook', label: 'Darslik' },
  { value: 'monograph', label: 'Monografiya' },
  { value: 'presentation', label: 'Taqdimot' },
];

const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  textbook_electronic: "Elektron o'quv q.",
  thesis: 'Tezis',
  article: 'Maqola',
  textbook: 'Darslik',
  monograph: 'Monografiya',
  presentation: 'Taqdimot',
};

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function MaterialsListPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToastContext();

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<MaterialStatus | ''>('');
  const [materialType, setMaterialType] = useState<MaterialType | ''>('');
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const hasActiveFilters = Boolean(categoryId || status || materialType);

  const query: AdminMaterialsQuery = {
    offset,
    limit,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(materialType ? { materialType } : {}),
    ...(status ? { status } : {}),
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['materials', query],
    queryFn: () => getMaterials(query),
    refetchInterval: (q) => {
      const items = q.state.data?.items ?? [];
      return items.some((m) => m.status === 'pending') ? 5000 : false;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMaterial(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['materials'] });
      addToast("Material o'chirildi", 'success');
      setDeleteTarget(null);
    },
    onError: () => {
      addToast("O'chirishda xatolik yuz berdi", 'error');
    },
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const categoryMap = new Map((categories ?? []).map((c) => [c.id, c.name]));

  return (
    <Layout
      title="Materiallar"
      actions={
        <Link to="/materials/new">
          <Button size="sm">+ Yangi material</Button>
        </Link>
      }
    >
      <div className="flex flex-col flex-1 min-h-0">

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 mb-3 flex-shrink-0">
          {/* Left: filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={categoryId}
                onChange={(e) => { setCategoryId(e.target.value); setOffset(0); }}
                className="appearance-none pl-3 pr-9 py-[10px] text-sm bg-bg-elevated border border-border rounded-md text-text-primary focus:outline-none focus:border-focus transition-all"
                aria-label="Kategoriya bo'yicha filtrlash"
              >
                <option value="">Barcha kategoriyalar</option>
                {(categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>

            <div className="relative">
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value as MaterialStatus | ''); setOffset(0); }}
                className="appearance-none pl-3 pr-9 py-[10px] text-sm bg-bg-elevated border border-border rounded-md text-text-primary focus:outline-none focus:border-focus transition-all"
                aria-label="Status bo'yicha filtrlash"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>

            <div className="relative">
              <select
                value={materialType}
                onChange={(e) => { setMaterialType(e.target.value as MaterialType | ''); setOffset(0); }}
                className="appearance-none pl-3 pr-9 py-[10px] text-sm bg-bg-elevated border border-border rounded-md text-text-primary focus:outline-none focus:border-focus transition-all"
                aria-label="Material turi bo'yicha filtrlash"
              >
                {MATERIAL_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setCategoryId(''); setStatus(''); setMaterialType(''); setOffset(0); }}
              >
                Tozalash
              </Button>
            )}
          </div>

          {/* Right: search */}
          <div className="relative w-80">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
              placeholder="Qidirish..."
              className="w-full pl-9 pr-8 py-[10px] text-sm bg-bg-elevated border border-border rounded-md placeholder:text-text-muted focus:outline-none focus:border-focus focus:shadow-[0_0_0_3px_rgba(184,146,106,0.15)] transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setOffset(0); }}
                aria-label="Qidiruvni tozalash"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-text-muted hover:text-text-primary transition-colors"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex-1 min-h-0 flex items-center justify-center bg-bg-elevated rounded-lg border border-border">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="relative flex-1 min-h-0 bg-bg-elevated rounded-lg shadow-card overflow-auto border border-border">
              {isFetching && !isLoading && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent-muted z-10 rounded-t-lg overflow-hidden">
                  <div className="h-full bg-accent animate-pulse w-1/3" />
                </div>
              )}

              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-sunken sticky top-0">
                      <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider text-xs">Sarlavha</th>
                      <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider text-xs w-36">Tur</th>
                      <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider text-xs w-36">Kategoriya</th>
                      <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider text-xs w-36">Status</th>
                      <th className="px-4 py-3 text-center font-medium text-text-secondary uppercase tracking-wider text-xs w-16">Tayyor</th>
                      <th className="px-4 py-3 text-right font-medium text-text-secondary uppercase tracking-wider text-xs w-20">Harakat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.items.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <div className="flex flex-col items-center justify-center" style={{ height: 'calc(100vh - 220px)' }}>
                            <img
                              src="/brand/naqsh.svg"
                              alt=""
                              aria-hidden="true"
                              className="mb-4 w-32 opacity-25"
                            />
                            <p className="text-text-muted">
                              {search || categoryId || status
                                ? "Filtr bo'yicha hech narsa topilmadi"
                                : "Hech qanday material yo'q"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                    {data?.items.map((mat, idx) => (
                      <tr
                        key={mat.id}
                        className={`border-b border-border last:border-0 hover:bg-surfaceHover transition-colors ${idx % 2 === 1 ? 'bg-bg-sunken' : 'bg-bg-elevated'}`}
                        style={{ height: '56px' }}
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium text-text-primary line-clamp-2" title={mat.title}>
                            {mat.title || <span className="text-text-muted italic">Sarlavsiz</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-xs">
                          {mat.materialType
                            ? MATERIAL_TYPE_LABELS[mat.materialType as MaterialType]
                            : <span className="text-text-muted">—</span>}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {mat.categoryId ? categoryMap.get(mat.categoryId) ?? '—' : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={mat.status} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {mat.isReady ? (
                            <svg className="h-5 w-5 text-[#006b3c] mx-auto" viewBox="0 0 20 20" fill="currentColor" aria-label="Tayyor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5 text-text-muted mx-auto" viewBox="0 0 20 20" fill="currentColor" aria-label="Tayyor emas">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/materials/${mat.id}/edit`}
                              aria-label={`${mat.title} ni tahrirlash`}
                              className="p-1.5 rounded-md text-text-muted hover:text-primary hover:bg-primary-muted transition-colors"
                            >
                              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                              </svg>
                            </Link>
                            <button
                              onClick={() => setDeleteTarget(mat)}
                              aria-label={`${mat.title} ni o'chirish`}
                              className="p-1.5 rounded-md text-text-muted hover:text-[#9b2c2c] hover:bg-[#fff5f5] transition-colors"
                            >
                              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-border">
                {data?.items.length === 0 && (
                  <div className="p-8 text-center text-text-muted">
                    Hech qanday material yo'q
                  </div>
                )}
                {data?.items.map((mat) => (
                  <div key={mat.id} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium text-text-primary text-sm line-clamp-2 flex-1">
                        {mat.title || <span className="italic text-text-muted">Sarlavsiz</span>}
                      </p>
                      <StatusBadge status={mat.status} />
                    </div>
                    {mat.categoryId && (
                      <p className="text-xs text-text-secondary mb-2">
                        {categoryMap.get(mat.categoryId)}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex gap-1 flex-wrap">
                        {(mat.tags ?? []).slice(0, 2).map((tag) => (
                          <span key={tag} className="text-xs bg-primary-muted text-primary rounded-sm px-2 py-0.5">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Link
                          to={`/materials/${mat.id}/edit`}
                          aria-label="Tahrirlash"
                          className="p-2 rounded-md text-text-muted hover:text-primary hover:bg-primary-muted transition-colors"
                        >
                          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                          </svg>
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(mat)}
                          aria-label="O'chirish"
                          className="p-2 rounded-md text-text-muted hover:text-[#9b2c2c] hover:bg-[#fff5f5] transition-colors"
                        >
                          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary">Jami {total} ta</span>
                  <select
                    value={limit}
                    onChange={(e) => { setLimit(Number(e.target.value)); setOffset(0); }}
                    className="text-sm bg-bg-elevated border border-border rounded-md px-2 py-1 text-text-primary focus:outline-none focus:border-focus"
                    aria-label="Sahifadagi yozuvlar soni"
                  >
                    {PAGE_SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s} ta / sahifa</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    aria-label="Oldingi sahifa"
                  >
                    ← Oldingi
                  </Button>

                  <div className="hidden sm:flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                      const page = i + 1;
                      const isActive = page === currentPage;
                      return (
                        <button
                          key={page}
                          onClick={() => setOffset((page - 1) * limit)}
                          className={`w-8 h-8 text-sm rounded-md transition-colors ${
                            isActive
                              ? 'bg-primary text-text-onPrimary font-medium'
                              : 'text-text-secondary hover:bg-surfaceHover'
                          }`}
                          aria-label={`${page}-sahifa`}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={offset + limit >= total}
                    onClick={() => setOffset(offset + limit)}
                    aria-label="Keyingi sahifa"
                  >
                    Keyingi →
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
        loading={deleteMutation.isPending}
        title="Materialni o'chirish"
        message={`"${deleteTarget?.title ?? 'Bu material'}" ni o'chirmoqchimisiz? Bu amalni bekor qilib bo'lmaydi.`}
      />
    </Layout>
  );
}
