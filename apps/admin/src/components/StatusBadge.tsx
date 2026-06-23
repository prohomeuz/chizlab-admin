import type { MaterialStatus } from '@contracts/index';

interface StatusBadgeProps {
  status: MaterialStatus;
}

const statusConfig: Record<
  MaterialStatus,
  { label: string; textColor: string; bgColor: string }
> = {
  active: {
    label: 'Faol',
    textColor: '#006b3c',
    bgColor: '#e6f4ed',
  },
  pending: {
    label: 'Kutilmoqda',
    textColor: '#92550a',
    bgColor: '#fef3e2',
  },
  draft: {
    label: 'Qoralama',
    textColor: '#4a5568',
    bgColor: '#edf2f7',
  },
  needs_review: {
    label: "Ko'rib chiqish kerak",
    textColor: '#9b2c2c',
    bgColor: '#fff5f5',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = statusConfig[status];
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
