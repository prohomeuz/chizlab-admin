import React, { createContext, useContext } from 'react';
import { useToast } from '../hooks/useToast';

type ToastContextType = ReturnType<typeof useToast>;
const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  return <ToastContext.Provider value={toast}>{children}</ToastContext.Provider>;
}

export function useToastContext(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider');
  return ctx;
}
