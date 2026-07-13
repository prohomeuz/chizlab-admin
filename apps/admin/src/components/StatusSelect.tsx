import type { MaterialStatus } from '@contracts/index'

/**
 * Holat tanlagich — "Saqlash" yonida turadigan segmentli pill.
 * Ranglar StatusBadge bilan bir xil, shuning uchun ro'yxat sahifasidagi
 * belgi bilan bir tilda "gaplashadi".
 *
 * "Tayyorlanmoqda" (pending) bu yerda ko'rsatilmaydi — u faqat AI faylni
 * tahlil qilayotganda tizim tomonidan avtomatik qo'yiladi. Admin qo'lda
 * faqat Qoralama yoki Tayyor holatini tanlaydi.
 */
const OPTIONS: {
  value: Extract<MaterialStatus, 'draft' | 'ready'>
  label: string
  color: string
  bg: string
}[] = [
  { value: 'draft', label: 'Qoralama', color: '#4a5568', bg: '#edf2f7' },
  { value: 'ready', label: 'Tayyor', color: '#006b3c', bg: '#e6f4ed' },
]

interface StatusSelectProps {
  value: MaterialStatus
  onChange: (value: MaterialStatus) => void
  disabled?: boolean
}

export function StatusSelect({ value, onChange, disabled }: StatusSelectProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Holat"
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-bg-elevated p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={
              active
                ? { color: opt.color, backgroundColor: opt.bg }
                : { color: 'var(--color-text-muted)', backgroundColor: 'transparent' }
            }
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: active ? opt.color : 'var(--color-border-strong)' }}
            />
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
