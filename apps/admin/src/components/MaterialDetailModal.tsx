import React, { useEffect } from 'react';
import type { Material, MaterialType } from '@contracts/index';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';

const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  textbook_electronic: "Elektron o'quv qo'llanma",
  thesis: 'Tezis',
  article: 'Maqola',
  textbook: 'Darslik',
  monograph: 'Monografiya',
  presentation: 'Taqdimot',
};

const UZ_MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = date.getDate();
  const month = UZ_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-yil ${day}-${month} | ${hours}:${minutes}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</dt>
      <dd className="text-sm text-text-primary break-words">{children}</dd>
    </div>
  );
}

interface MaterialDetailModalProps {
  material: Material | null;
  categoryName?: string;
  onClose: () => void;
  onEdit?: () => void;
}

/**
 * Large, near-full-page modal showing every field of a material plus its cover
 * image. Opened by a single click on a table row.
 */
export function MaterialDetailModal({
  material,
  categoryName,
  onClose,
  onEdit,
}: MaterialDetailModalProps) {
  useEffect(() => {
    if (!material) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [material, onClose]);

  if (!material) return null;

  const dash = <span className="text-text-muted">—</span>;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="material-detail-title"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 bg-surface rounded-lg shadow-modal w-full max-w-[1100px] max-h-[92vh] flex flex-col outline-none modal-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border flex-shrink-0">
          <div className="min-w-0">
            <h2
              id="material-detail-title"
              className="text-lg font-medium text-text-primary truncate"
            >
              {material.title || <span className="italic text-text-muted">Sarlavsiz</span>}
            </h2>
            <div className="mt-1.5">
              <StatusBadge status={material.status} />
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Yopish"
            className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-md flex-shrink-0"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
          {/* Cover + file */}
          <div className="flex flex-col gap-3">
            {material.coverUrl ? (
              <img
                src={material.coverUrl}
                alt="Muqova"
                className="w-full rounded-lg object-cover shadow-card"
              />
            ) : (
              <div className="w-full aspect-[3/4] rounded-lg border border-dashed border-border flex items-center justify-center bg-bg-sunken">
                <p className="text-sm text-text-muted">Muqova mavjud emas</p>
              </div>
            )}
            {material.mediaUrl && (
              <a
                href={material.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
                Faylni ko'rish
              </a>
            )}
          </div>

          {/* Fields */}
          <div className="space-y-5 min-w-0">
            {material.blurb && (
              <p className="text-sm text-text-secondary italic">{material.blurb}</p>
            )}
            {material.description && (
              <Field label="Ta'rif">
                <p className="whitespace-pre-wrap leading-relaxed">{material.description}</p>
              </Field>
            )}

            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Tur">
                {material.materialType
                  ? MATERIAL_TYPE_LABELS[material.materialType as MaterialType]
                  : dash}
              </Field>
              <Field label="Kategoriya">{categoryName ?? dash}</Field>
              <Field label="Sahifa soni">{material.pageCount ?? dash}</Field>
              <Field label="Til">{material.language || dash}</Field>
              <Field label="Nashr yili">{material.publishYear ?? dash}</Field>
              <Field label="Davlat">{material.country || dash}</Field>
            </dl>

            <Field label="Mualliflar">
              {material.authors?.length ? material.authors.join(', ') : dash}
            </Field>

            <Field label="Teglar">
              {material.tags?.length ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {material.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs bg-primary-muted text-primary rounded-sm px-2 py-0.5"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : (
                dash
              )}
            </Field>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t border-border">
              <Field label="Yaratilgan">{formatDate(material.createdAt)}</Field>
              <Field label="Yangilangan">{formatDate(material.updatedAt)}</Field>
            </dl>
          </div>
        </div>

        {/* Footer */}
        {onEdit && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Yopish
            </Button>
            <Button size="sm" onClick={onEdit}>
              Tahrirlash
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
