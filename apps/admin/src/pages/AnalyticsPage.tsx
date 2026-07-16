import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAnalyticsSummary } from '../api/analytics';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';

const RANGE_OPTIONS = [
  { value: 1, label: 'Bugun' },
  { value: 7, label: '7 kun' },
  { value: 30, label: '30 kun' },
  { value: 90, label: '90 kun' },
] as const;

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated px-5 py-4">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-text-primary tabular-nums">
        {value.toLocaleString('uz-UZ')}
      </p>
    </div>
  );
}

function RankedList({
  title,
  emptyText,
  rows,
}: {
  title: string;
  emptyText: string;
  rows: { primary: string; secondary?: string; count: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="rounded-lg border border-border bg-bg-elevated px-5 py-4 flex-1 min-w-0">
      <p className="text-sm font-medium text-text-primary mb-3">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-text-muted py-6 text-center">{emptyText}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r, i) => (
            <li key={`${r.primary}-${i}`} className="min-w-0">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="text-sm text-text-primary truncate" title={r.primary}>
                  {r.primary}
                </span>
                <span className="text-xs text-text-muted tabular-nums flex-shrink-0">
                  {r.count.toLocaleString('uz-UZ')}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-bg-sunken overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(4, (r.count / max) * 100)}%` }}
                />
              </div>
              {r.secondary && (
                <p className="text-xs text-text-muted truncate mt-0.5" title={r.secondary}>
                  {r.secondary}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AnalyticsPage() {
  const navigate = useNavigate();
  const [days, setDays] = useState<number>(7);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-summary', days],
    queryFn: () => getAnalyticsSummary(days),
    refetchInterval: 60_000,
  });

  return (
    <Layout
      title="Analitika"
      actions={
        <Button variant="secondary" size="sm" onClick={() => navigate('/materials')}>
          Materiallarga qaytish
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          {RANGE_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setDays(o.value)}
              className={`px-3 py-[6px] text-sm rounded-md border transition-colors ${
                days === o.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-bg-elevated text-text-secondary border-border hover:text-text-primary'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {isError && (
          <p className="text-sm text-[#9b2c2c]">Analitikani yuklashda xatolik yuz berdi.</p>
        )}

        {isLoading || !data ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Sahifa ko'rishlar" value={data.totals.pageviews} />
              <StatCard label="Bosishlar" value={data.totals.clicks} />
              <StatCard label="Noyob tashrifchilar" value={data.totals.uniqueSessions} />
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <RankedList
                title="Eng ko'p ko'rilgan sahifalar"
                emptyText="Hali sahifa ko'rish qayd etilmagan"
                rows={data.topPages.map((p) => ({ primary: p.path, count: p.count }))}
              />
              <RankedList
                title="Eng ko'p bosilgan tugmalar / havolalar"
                emptyText="Hali bosish qayd etilmagan"
                rows={data.topClicks.map((c) => ({
                  primary: c.label,
                  secondary: c.path,
                  count: c.count,
                }))}
              />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
