import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { getPagePrepStatus, preparePages } from '../api/materials'
import { Button } from './Button'

interface PageSelectionPanelProps {
  mediaUrl: string
  /** null means "all pages" — AI analyzes the whole document, no need to restrict it. */
  onChange: (selectedPages: number[] | null) => void
  onStateChange: (state: { ready: boolean; selectedCount: number }) => void
}

/**
 * Inline page-selection panel shown directly under the upload dropzone.
 * Starts thumbnail generation as soon as the file is uploaded and lets the
 * admin pick which pages the AI should analyze. Remount with key={mediaUrl}
 * when the file changes.
 */
export function PageSelectionPanel({ mediaUrl, onChange, onStateChange }: PageSelectionPanelProps) {
  const [jobId, setJobId] = useState<string | null>(null)
  const [enqueueError, setEnqueueError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  // 2 marta bosilganda kattalashtirib ko'rsatiladigan sahifa (null = yopiq)
  const [zoomPage, setZoomPage] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    preparePages(mediaUrl)
      .then((res) => {
        if (!cancelled) setJobId(res.jobId)
      })
      .catch(() => {
        if (!cancelled) setEnqueueError("Sahifalarni tayyorlashni boshlab bo'lmadi.")
      })
    return () => {
      cancelled = true
    }
  }, [mediaUrl])

  const { data: status, error: pollError } = useQuery({
    queryKey: ['page-prep-status', jobId],
    queryFn: () => getPagePrepStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? 1500 : false),
  })

  const isDone = status?.status === 'done'
  const isError = status?.status === 'error' || !!pollError || !!enqueueError
  const pageCount = status?.pageCount ?? 0
  const thumbnailUrls = useMemo(() => status?.thumbnailUrls ?? [], [status])

  // All pages selected by default once thumbnails arrive
  useEffect(() => {
    if (isDone && pageCount > 0) {
      setSelected(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)))
      onChange(null)
      onStateChange({ ready: true, selectedCount: pageCount })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone, pageCount])

  const emit = (next: Set<number>) => {
    setSelected(next)
    const all = pageCount > 0 && next.size === pageCount
    onChange(all ? null : Array.from(next).sort((a, b) => a - b))
    onStateChange({ ready: isDone, selectedCount: next.size })
  }

  const togglePage = (page: number) => {
    const next = new Set(selected)
    if (next.has(page)) next.delete(page)
    else next.add(page)
    emit(next)
  }

  const allSelected = pageCount > 0 && selected.size === pageCount
  const toggleAll = () => {
    emit(allSelected ? new Set() : new Set(Array.from({ length: pageCount }, (_, i) => i + 1)))
  }

  const handleRetry = () => {
    setJobId(null)
    setEnqueueError(null)
    preparePages(mediaUrl)
      .then((res) => setJobId(res.jobId))
      .catch(() => setEnqueueError("Sahifalarni tayyorlashni boshlab bo'lmadi."))
  }

  // Lightbox klaviatura boshqaruvi: Esc — yopish, chap/o'ng — sahifalar orasida yurish
  useEffect(() => {
    if (zoomPage === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomPage(null)
      else if (e.key === 'ArrowRight') setZoomPage((p) => (p && p < pageCount ? p + 1 : p))
      else if (e.key === 'ArrowLeft') setZoomPage((p) => (p && p > 1 ? p - 1 : p))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomPage, pageCount])

  const [elapsedMs, setElapsedMs] = useState(0)
  useEffect(() => {
    if (isDone || isError) {
      setElapsedMs(0)
      return
    }
    const start = Date.now()
    const timer = setInterval(() => setElapsedMs(Date.now() - start), 1000)
    return () => clearInterval(timer)
  }, [isDone, isError])

  return (
    <div className="mt-4 border-t border-border pt-4 flex flex-col gap-3 min-h-0">
      {isError ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-[#9b2c2c]">
            {status?.error ?? "Sahifalarni tayyorlashda xatolik yuz berdi."}
          </p>
          <Button variant="secondary" size="sm" onClick={handleRetry}>
            Qayta urinish
          </Button>
        </div>
      ) : !isDone ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="animate-spin h-7 w-7 rounded-full border-2 border-primary border-t-transparent" />
          <div>
            <p className="text-sm font-medium text-text-primary">Sahifalar tayyorlanmoqda...</p>
            {typeof status?.progress === 'number' && (
              <p className="text-xs text-text-muted mt-1 tabular-nums">{status.progress}%</p>
            )}
            {elapsedMs > 15000 && (
              <p className="text-xs text-text-muted mt-2 max-w-[320px]">
                Katta hajmdagi fayllar uchun bu biroz vaqt olishi mumkin
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-text-secondary whitespace-nowrap">
              <span className="font-medium text-text-primary tabular-nums">
                {selected.size}/{pageCount}
              </span>{' '}
              sahifa tanlangan
              <span className="text-xs text-text-muted ml-2 hidden sm:inline">
                · 2 marta bosib kattalashtiring
              </span>
            </p>
            <label className="flex items-center gap-2 text-sm text-primary cursor-pointer select-none hover:underline whitespace-nowrap">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = !allSelected && selected.size > 0
                }}
                onChange={toggleAll}
                className="h-4 w-4 accent-primary cursor-pointer"
                aria-label="Hammasini tanlash yoki bekor qilish"
              />
              {allSelected ? 'Bekor qilish' : 'Hammasini tanlash'}
            </label>
          </div>

          {selected.size === 0 && (
            <p className="text-xs text-[#9b2c2c]" role="alert">
              Kamida bitta sahifa tanlanishi kerak
            </p>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 overflow-y-auto pr-1 max-h-[520px]">
            {thumbnailUrls.map((url, i) => {
              const page = i + 1
              const isSelected = selected.has(page)
              return (
                <button
                  type="button"
                  key={page}
                  onClick={() => togglePage(page)}
                  onDoubleClick={() => setZoomPage(page)}
                  className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 bg-white transition-all duration-150 ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-border opacity-50 hover:opacity-80'
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`${page}-sahifa${isSelected ? ', tanlangan' : ''}`}
                >
                  <img
                    src={url}
                    alt={`Sahifa ${page}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain block"
                  />
                  <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {page}
                  </span>
                  {isSelected && (
                    <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center">
                      <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42l2.79 2.79 6.79-6.79a1 1 0 011.42 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {zoomPage !== null && thumbnailUrls[zoomPage - 1] && (
            <div
              className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-6"
              onClick={() => setZoomPage(null)}
              role="dialog"
              aria-modal="true"
              aria-label={`${zoomPage}-sahifa kattalashtirilgan ko'rinishi`}
            >
              {zoomPage > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setZoomPage(zoomPage - 1)
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/15 hover:bg-white/30 text-white text-2xl flex items-center justify-center transition-colors"
                  aria-label="Oldingi sahifa"
                >
                  ‹
                </button>
              )}
              <div className="flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <img
                  src={thumbnailUrls[zoomPage - 1]}
                  alt={`Sahifa ${zoomPage}`}
                  className="max-h-[85vh] max-w-[85vw] rounded-lg shadow-2xl bg-white"
                />
                <div className="flex items-center gap-4">
                  <span className="text-white/90 text-sm tabular-nums">
                    {zoomPage} / {pageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => togglePage(zoomPage)}
                    className="text-sm text-white bg-white/15 hover:bg-white/30 rounded-md px-3 py-1.5 transition-colors"
                  >
                    {selected.has(zoomPage) ? 'Tanlovdan olish' : 'Tanlash'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomPage(null)}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    Yopish (Esc)
                  </button>
                </div>
              </div>
              {zoomPage < pageCount && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setZoomPage(zoomPage + 1)
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/15 hover:bg-white/30 text-white text-2xl flex items-center justify-center transition-colors"
                  aria-label="Keyingi sahifa"
                >
                  ›
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
