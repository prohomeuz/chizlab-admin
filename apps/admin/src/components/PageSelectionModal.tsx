import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { getPagePrepStatus, preparePages } from '../api/materials'
import { Button } from './Button'
import { Modal } from './Modal'

interface PageSelectionModalProps {
  open: boolean
  mediaUrl: string | null
  onCancel: () => void
  /** null means "all pages" — AI analyzes the whole document, no need to restrict it. */
  onConfirm: (selectedPages: number[] | null) => void
}

export function PageSelectionModal({ open, mediaUrl, onCancel, onConfirm }: PageSelectionModalProps) {
  const [jobId, setJobId] = useState<string | null>(null)
  const [enqueueError, setEnqueueError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!open || !mediaUrl) {
      setJobId(null)
      setEnqueueError(null)
      setSelected(new Set())
      return
    }
    let cancelled = false
    setJobId(null)
    setEnqueueError(null)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mediaUrl])

  const { data: status, error: pollError } = useQuery({
    queryKey: ['page-prep-status', jobId],
    queryFn: () => getPagePrepStatus(jobId!),
    enabled: open && !!jobId,
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
    }
  }, [isDone, pageCount])

  const [elapsedMs, setElapsedMs] = useState(0)
  useEffect(() => {
    if (!open || isDone || isError) {
      setElapsedMs(0)
      return
    }
    const start = Date.now()
    const timer = setInterval(() => setElapsedMs(Date.now() - start), 1000)
    return () => clearInterval(timer)
  }, [open, isDone, isError])

  const togglePage = (page: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(page)) next.delete(page)
      else next.add(page)
      return next
    })
  }

  const allSelected = pageCount > 0 && selected.size === pageCount
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(Array.from({ length: pageCount }, (_, i) => i + 1)))
  }

  const handleRetry = () => {
    if (!mediaUrl) return
    setJobId(null)
    setEnqueueError(null)
    preparePages(mediaUrl)
      .then((res) => setJobId(res.jobId))
      .catch(() => setEnqueueError("Sahifalarni tayyorlashni boshlab bo'lmadi."))
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Sahifalarni tanlash"
      wide
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Bekor qilish
          </Button>
          <Button
            size="sm"
            disabled={!isDone || selected.size === 0}
            onClick={() =>
              onConfirm(allSelected ? null : Array.from(selected).sort((a, b) => a - b))
            }
          >
            Tasdiqlash
          </Button>
        </>
      }
    >
      {isError ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-sm text-[#9b2c2c]">
            {status?.error ?? "Sahifalarni tayyorlashda xatolik yuz berdi."}
          </p>
          <Button variant="secondary" size="sm" onClick={handleRetry}>
            Qayta urinish
          </Button>
        </div>
      ) : !isDone ? (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
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
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">
              {pageCount} ta sahifadan {selected.size} tasi tanlangan
            </p>
            <button
              type="button"
              onClick={toggleAll}
              className="text-sm text-primary hover:underline"
            >
              {allSelected ? 'Hammasini bekor qilish' : 'Hammasini tanlash'}
            </button>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-[420px] overflow-y-auto pr-1">
            {thumbnailUrls.map((url, i) => {
              const page = i + 1
              const isSelected = selected.has(page)
              return (
                <button
                  type="button"
                  key={page}
                  onClick={() => togglePage(page)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all duration-150 ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-border opacity-50 hover:opacity-80'
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`${page}-sahifa${isSelected ? ", tanlangan" : ''}`}
                >
                  <img src={url} alt={`Sahifa ${page}`} className="w-full h-auto block" />
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
        </div>
      )}
    </Modal>
  )
}
