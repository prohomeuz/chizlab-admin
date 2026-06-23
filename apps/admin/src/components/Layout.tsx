import React, { useState } from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}

export function Layout({ children, title, actions }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[50] md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative h-full w-[240px]">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 h-[65px] bg-bg-elevated border-b border-border flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* Hamburger for mobile */}
            <button
              className="md:hidden p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surfaceHover transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Menyuni ochish"
            >
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-text-primary">{title}</h1>
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[50] md:hidden bg-primary flex border-t border-[rgba(255,255,246,0.12)]"
        aria-label="Pastki navigatsiya"
      >
        {[
          { to: '/materials', label: 'Materiallar' },
          { to: '/categories', label: 'Kategoriyalar' },
        ].map((item) => (
          <a
            key={item.to}
            href={item.to}
            className="flex-1 flex flex-col items-center py-2 text-xs text-text-onPrimary opacity-70 hover:opacity-100 transition-opacity"
          >
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
