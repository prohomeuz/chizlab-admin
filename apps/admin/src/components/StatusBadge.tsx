import type { MaterialStatus } from '@contracts/index';

interface StatusBadgeProps {
  status: MaterialStatus;
  progress?: number; // 0-99 when pending; omit for static badge
}

const statusConfig: Record<
  MaterialStatus,
  { label: string; textColor: string; bgColor: string }
> = {
  pending: { label: 'Kutilmoqda', textColor: '#92550a', bgColor: '#fef3e2' },
  draft:   { label: 'Qoralama',   textColor: '#4a5568', bgColor: '#edf2f7' },
  ready:   { label: 'Tayyor',     textColor: '#006b3c', bgColor: '#e6f4ed' },
};

export function StatusBadge({ status, progress }: StatusBadgeProps) {
  if (status === 'pending' && progress !== undefined) {
    return (
      <span
        role="status"
        aria-label={`Tahlil: ${progress}%`}
        style={{ color: '#92550a', backgroundColor: '#fef3e2' }}
        className="inline-flex items-center gap-1.5 rounded-full px-[10px] py-[3px] text-xs font-medium"
      >
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: '#92550a' }}
        />
        {progress}%
      </span>
    );
  }

  const cfg = statusConfig[status] ?? { label: status, textColor: '#4a5568', bgColor: '#edf2f7' };
  return (
    <span
      role="status"
      aria-label={`Holati: ${cfg.label}`}
      style={{ color: cfg.textColor, backgroundColor: cfg.bgColor }}
      className="inline-flex items-center gap-1.5 rounded-full px-[10px] py-[3px] text-xs font-medium"
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: cfg.textColor }}
      />
      {cfg.label}
    </span>
  );
}
