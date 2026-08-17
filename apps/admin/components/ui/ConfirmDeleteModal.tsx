'use client';

import { useState } from 'react';

interface ConfirmDeleteModalProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmWord?: string;
  confirmLabel?: string;
  loading?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Shared destructive-confirmation modal for account deletion (barbers,
 * users). When confirmWord is set, the confirm button stays disabled until
 * the operator types it exactly -- used for force-delete flows where
 * skipping confirmation would be costly (Firebase Auth deletion, active
 * bookings force-cancelled).
 */
export function ConfirmDeleteModal({
  open,
  title,
  description,
  confirmWord,
  confirmLabel = 'Hapus',
  loading = false,
  error,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const [typed, setTyped] = useState('');

  if (!open) return null;

  const canConfirm = !loading && (!confirmWord || typed.trim().toUpperCase() === confirmWord.toUpperCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <div className="mt-2 text-sm leading-relaxed text-slate-600">{description}</div>

        {confirmWord && (
          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Ketik <span className="font-mono font-bold text-red-600">{confirmWord}</span> untuk konfirmasi
            </label>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
              placeholder={confirmWord}
              autoComplete="off"
            />
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        )}

        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
