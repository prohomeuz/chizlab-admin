interface MaterialAnalyzingOverlayProps {
  progress?: number // 0-100; undefined = spinner only, no bar yet
}

export function MaterialAnalyzingOverlay({ progress }: MaterialAnalyzingOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="analyzing-overlay-title"
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div className="relative z-10 bg-surface rounded-lg shadow-modal w-full max-w-[560px] p-10 flex flex-col items-center text-center gap-6 modal-in">
        <div className="animate-spin h-10 w-10 rounded-full border-2 border-primary border-t-transparent flex-shrink-0" />
        <div>
          <h3 id="analyzing-overlay-title" className="text-base font-semibold text-text-primary">
            Material tahlil qilinmoqda
          </h3>
          <p className="text-sm text-text-muted mt-1.5 leading-relaxed">
            AI sarlavha, mualliflar, teglar va boshqa ma'lumotlarni aniqlamoqda...
          </p>
        </div>
        {progress !== undefined && (
          <div className="w-full space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Tahlil</span>
              <span className="font-semibold text-primary tabular-nums">{progress}%</span>
            </div>
            <div className="w-full bg-bg-sunken rounded-full h-2">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
