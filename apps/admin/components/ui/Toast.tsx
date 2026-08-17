'use client';

import { useCallback, useState } from 'react';

type ToastType = 'success' | 'error';

interface ToastState {
  message: string;
  type: ToastType;
  id: number;
}

/**
 * Minimal, dependency-free toast for admin mutations. Every admin page in
 * this app previously used browser alert()/confirm() for feedback -- this is
 * the shared replacement so mutation results (and errors) surface as a
 * dismissable, non-blocking notification instead.
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToast({ message, type, id });
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4000);
  }, []);

  const toastElement = toast ? (
    <div
      role="status"
      className={`fixed bottom-6 right-6 z-[100] flex max-w-sm items-start gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
        toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
      }`}
    >
      <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
      <span>{toast.message}</span>
    </div>
  ) : null;

  return { showToast, toastElement };
}
