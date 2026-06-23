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
import type { Material, MaterialStatus, AdminMaterialsQuery } from '@contracts/index';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const STATUS_OPTIONS: { value: MaterialStatus | ''; label: string }[] = [
  { value: '', label: "Barcha statuslar" },
  { value: 'active', label: 'Faol' },
  { value: 'pending', label: 'Kutilmoqda' },
  { value: 'draft', label: 'Qoralama' },
  { value: 'needs_review', label: "Ko'rib chiqish kerak" },
];

// Proper debounce hook
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
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const query: AdminMaterialsQuery = {
    offset,
    limit,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(categoryId ? { categoryId } : {}),
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

  const hasPending = data?.items.some((m) => m.status === 'pending') ?? false;
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
      {/* AI Polling Banner */}
      {hasPending && (
        <div
          aria-live="polite"
          className="flex items-center gap-2 px-4 py-2 rounded-md mb-4 text-sm font-medium"
          style={{ background: '#fef3e2', color: '#92550a' }}
        >
          <Spinner size="sm" />
          AI tahlil qilmoqda...
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
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
            className="w-full pl-9 pr-3 py-[10px] text-sm bg-bg-elevated border border-border rounded-md placeholder:text-text-muted focus:outline-none focus:border-2 focus:border-focus focus:shadow-[0_0_0_3px_rgba(184,146,106,0.15)] transition-all"
          />
        </div>

        {/* Category filter */}
        <select
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setOffset(0); }}
          className="px-3 py-[10px] text-sm bg-bg-elevated border border-border rounded-md text-text-primary focus:outline-none focus:border-2 focus:border-focus transition-all"
          aria-label="Kategoriya bo'yicha filtrlash"
        >
          <option value="">Barcha kategoriyalar</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as MaterialStatus | ''); setOffset(0); }}
          className="px-3 py-[10px] text-sm bg-bg-elevated border border-border rounded-md text-text-primary focus:outline-none focus:border-2 focus:border-focus transition-all"
          aria-label="Status bo'yicha filtrlash"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Clear filters */}
        {(search || categoryId || status) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setCategoryId(''); setStatus(''); setOffset(0); }}
          >
            Filtrlarni tozalash
          </Button>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-md" />
          ))}
        </div>
      )}

      {/* Table */}
      {!isLoading && (
        <>
          <div className="bg-bg-elevated rounded-lg shadow-card overflow-hidden border border-border">
            {/* Refetch indicator */}
            {isFetching && !isLoading && (
              <div className="h-0.5 bg-accent-muted">
                <div className="h-full bg-accent animate-pulse w-1/3" />
              </div>
            )}

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-sunken">
                    <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider text-xs">Sarlavha</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider text-xs w-40">Kategoriya</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider text-xs w-44">Teglar</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider text-xs w-36">Status</th>
                    <th className="px-4 py-3 text-center font-medium text-text-secondary uppercase tracking-wider text-xs w-16">Tayyor</th>
                    <th className="px-4 py-3 text-right font-medium text-text-secondary uppercase tracking-wider text-xs w-20">Harakat</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center">
                        <img
                          src="/brand/naqsh.svg"
                          alt=""
                          aria-hidden="true"
                          className="mx-auto mb-4 w-32 opacity-25"
                        />
                        <p className="text-text-muted">
                          {search || categoryId || status
                            ? 'Filtr bo\'yicha hech narsa topilmadi'
                            : 'Hech qanday material yo\'q'}
                        </p>
                        {!search && !categoryId && !status && (
                          <Link to="/materials/new" className="mt-3 inline-block text-accent hover:text-accent-dark text-sm font-medium">
                            + Yangi material qo'shish
                          </Link>
                        )}
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
                        <span
                          className="font-medium text-text-primary line-clamp-2"
                          title={mat.title}
                        >
                          {mat.title || <span className="text-text-muted italic">Sarlavsiz</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {mat.categoryId ? categoryMap.get(mat.categoryId) ?? '—' : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(mat.tags ?? []).slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex text-xs bg-primary-muted text-primary rounded-sm px-2 py-0.5"
                            >
                              {tag}
                            </span>
                          ))}
                          {(mat.tags ?? []).length > 3 && (
                            <span className="text-xs text-text-muted">+{mat.tags.length - 3}</span>
                          )}
                        </div>
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
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
        </>
      )}

      {/* Delete confirmation modal */}
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
