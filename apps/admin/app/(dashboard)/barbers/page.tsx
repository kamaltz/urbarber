'use client';

import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import { AdminApiClient, type AdminBarberSummary, type DashboardMetrics } from '@/lib/api-client';
import { getAdminErrorMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Filter = 'all' | 'active' | 'suspended' | 'approved' | 'pending' | 'rejected';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'rejected', label: 'Rejected' },
];

function statusBadgeClass(status: string) {
  switch (status) {
    case 'active':
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'suspended':
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'pending':
    case 'pending_verification':
      return 'bg-amber-100 text-amber-800';
    case 'deleted':
      return 'bg-slate-200 text-slate-500';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function formatDate(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BarbersPage() {
  const { admin } = useAdminAuth();
  const { showToast, toastElement } = useToast();

  const [barbers, setBarbers] = useState<AdminBarberSummary[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminBarberSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadBarbers = async () => {
    if (!admin) return;
    try {
      setError(null);
      const result = await AdminApiClient.getBarbers(filter);
      setBarbers(result.items);
      setHasMore(result.hasMore);
      setNextCursor(result.nextPageStartAfter);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadBarbers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, admin]);

  useEffect(() => {
    if (!admin) return;
    AdminApiClient.getDashboardMetrics()
      .then(setMetrics)
      .catch(() => {
        // Summary cards are supplementary -- a failure here shouldn't block the list.
      });
  }, [admin]);

  const handleLoadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const result = await AdminApiClient.getBarbers(filter, undefined, nextCursor);
      setBarbers((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setNextCursor(result.nextPageStartAfter);
    } catch (err) {
      showToast(getAdminErrorMessage(err), 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const filteredBarbers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return barbers;
    return barbers.filter((b) =>
      [b.displayName, b.businessName, b.email].some((field) => field?.toLowerCase().includes(q))
    );
  }, [barbers, search]);

  const runAction = async (barberId: string, action: () => Promise<{ message?: string }>, successMessage: string) => {
    setActionLoadingId(barberId);
    setOpenMenuId(null);
    try {
      await action();
      showToast(successMessage);
      await loadBarbers();
    } catch (err) {
      showToast(getAdminErrorMessage(err), 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await AdminApiClient.deleteBarber(deleteTarget.uid);
      let message = `Barber "${deleteTarget.displayName}" berhasil dihapus.`;
      if (result.cancelledBookingsCount > 0) {
        message += ` ${result.cancelledBookingsCount} booking aktif dibatalkan.`;
      }
      if (result.paidBookingsNeedingReviewCount > 0) {
        message += ` ${result.paidBookingsNeedingReviewCount} transaksi lunas memerlukan tinjauan refund manual.`;
      }
      showToast(message);
      setDeleteTarget(null);
      setBarbers((prev) => prev.filter((b) => b.uid !== deleteTarget.uid));
    } catch (err) {
      setDeleteError(getAdminErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const summaryCards = [
    { label: 'Total Barber', value: metrics?.totalBarbers, color: 'text-slate-900', border: 'border-l-slate-400' },
    { label: 'Aktif', value: metrics?.totalApprovedBarbers, color: 'text-green-600', border: 'border-l-green-500' },
    { label: 'Menunggu Verifikasi', value: metrics?.pendingBarberRegistrations, color: 'text-amber-600', border: 'border-l-amber-500' },
    { label: 'Ditangguhkan', value: metrics?.suspendedBarbers, color: 'text-red-600', border: 'border-l-red-500' },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Manajemen Barber</h1>
        <p className="mt-1 text-sm text-slate-500">Kelola akun, status, dan verifikasi barber.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className={`rounded-xl border-l-4 bg-white p-4 shadow-sm ${card.border}`}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value ?? '-'}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, usaha, atau email..."
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:w-64"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                filter === f.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <span>{error}</span>
          <button onClick={loadBarbers} className="font-semibold underline">Coba lagi</button>
        </div>
      )}

      {loading && (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-4 border-b border-slate-100 p-4">
              <div className="h-10 w-10 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-slate-200" />
                <div className="h-3 w-1/5 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && filteredBarbers.length > 0 && (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Barber</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Kontak</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status Akun</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Verifikasi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Rating</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Bergabung</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredBarbers.map((barber) => (
                <tr key={barber.uid} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                        {barber.displayName?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{barber.displayName}</p>
                        <p className="text-xs text-slate-500">{barber.businessName || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <p>{barber.email || '-'}</p>
                    <p className="text-slate-400">{barber.phoneNumber || ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(barber.accountStatus)}`}>
                      {barber.accountStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(barber.verificationStatus)}`}>
                      {barber.verificationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {barber.ratingAverage ? (
                      <span>{barber.ratingAverage.toFixed(1)} ★ <span className="text-slate-400">({barber.reviewCount || 0})</span></span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(barber.createdAt)}</td>
                  <td className="relative px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/barbers/${barber.uid}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                        Detail
                      </Link>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === barber.uid ? null : barber.uid)}
                        disabled={actionLoadingId === barber.uid}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                        aria-label="Menu aksi"
                      >
                        {actionLoadingId === barber.uid ? '...' : '⋮'}
                      </button>
                    </div>

                    {openMenuId === barber.uid && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-4 top-full z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                          {barber.accountStatus === 'suspended' ? (
                            <button
                              onClick={() =>
                                runAction(
                                  barber.uid,
                                  () => AdminApiClient.reactivateBarber(barber.uid),
                                  `Barber "${barber.displayName}" diaktifkan kembali.`
                                )
                              }
                              className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                            >
                              Reactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const reason = window.prompt('Alasan penangguhan (wajib diisi):');
                                if (!reason || !reason.trim()) return;
                                runAction(
                                  barber.uid,
                                  () => AdminApiClient.suspendBarber(barber.uid, reason.trim()),
                                  `Barber "${barber.displayName}" ditangguhkan.`
                                );
                              }}
                              className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                            >
                              Suspend
                            </button>
                          )}
                          <div className="my-1 border-t border-slate-100" />
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              setDeleteError(null);
                              setDeleteTarget(barber);
                            }}
                            className="block w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                          >
                            Hapus Barber
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && filteredBarbers.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
          <p className="text-3xl">💇</p>
          <p className="mt-2 font-medium">
            {search ? 'Tidak ada barber yang cocok dengan pencarian.' : 'Tidak ada barber untuk filter ini.'}
          </p>
        </div>
      )}

      {!loading && !error && hasMore && !search && (
        <div className="mt-6 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="rounded-lg bg-slate-100 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          >
            {loadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
          </button>
        </div>
      )}

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title="Hapus Akun Barber"
        confirmWord="HAPUS"
        confirmLabel="Hapus Barber"
        loading={deleting}
        error={deleteError}
        description={
          <>
            <p>
              Anda akan menghapus akun <strong>{deleteTarget?.displayName}</strong>
              {deleteTarget?.businessName ? ` (${deleteTarget.businessName})` : ''}.
            </p>
            <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              Menghapus barber akan menonaktifkan akun dan membatalkan booking yang masih aktif.
              Riwayat booking dan transaksi tetap disimpan.
            </p>
          </>
        }
        onCancel={() => {
          if (deleting) return;
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
      />

      {toastElement}
    </div>
  );
}
