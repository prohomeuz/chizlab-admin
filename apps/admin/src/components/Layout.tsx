import React from 'react';
import { NavLink } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}

export function Layout({ children, title, actions }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden">
      <header className="flex items-center justify-between px-6 h-[65px] bg-bg-elevated border-b border-border flex-shrink-0">
        <div className="flex items-center gap-5">
          <NavLink to="/materials">
            <img src="/brand/logo.svg" alt="Chizlab" width={120} />
          </NavLink>
          {title && (
            <h1 className="text-base font-semibold text-text-primary hidden sm:block">{title}</h1>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </header>
      <main className="flex-1 overflow-auto p-6 flex flex-col">{children}</main>
    </div>
  );
}
