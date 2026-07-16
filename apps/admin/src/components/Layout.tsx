import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}

function LogoContextMenu({
  x,
  y,
  onClose,
  onOpenAnalytics,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onOpenAnalytics: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      style={{ left: x, top: y }}
      className="fixed z-[200] min-w-[180px] rounded-md border border-border bg-bg-elevated shadow-modal py-1"
    >
      <button
        role="menuitem"
        onClick={onOpenAnalytics}
        className="w-full text-left px-3.5 py-2 text-sm text-text-primary hover:bg-bg-sunken transition-colors flex items-center gap-2"
      >
        <svg className="h-4 w-4 text-text-muted" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1v-6zM8 7a1 1 0 011-1h2a1 1 0 011 1v10a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 3a1 1 0 011-1h2a1 1 0 011 1v14a1 1 0 01-1 1h-2a1 1 0 01-1-1V3z" />
        </svg>
        Analitika
      </button>
    </div>
  );
}

export function Layout({ children, actions }: LayoutProps) {
  const navigate = useNavigate();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden">
      <header className="flex items-center justify-between px-6 h-[65px] bg-bg-elevated border-b border-border flex-shrink-0">
        <div className="flex items-center gap-5">
          <NavLink
            to="/materials"
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ x: e.clientX, y: e.clientY });
            }}
          >
            <img src="/brand/logo.svg" alt="Chizlab" width={120} />
          </NavLink>
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </header>
      <main className="flex-1 overflow-auto p-6 flex flex-col">{children}</main>

      {menu && (
        <LogoContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onOpenAnalytics={() => {
            setMenu(null);
            navigate('/analytics');
          }}
        />
      )}
    </div>
  );
}
