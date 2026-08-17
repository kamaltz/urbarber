'use client';

import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import { AdminApiClient, type AdminBarberDetail } from '@/lib/api-client';
import { getAdminErrorMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function formatDate(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BarberDetailPage() {
  const router = useRouter();
  const { admin } = useAdminAuth();
  const params = useParams();
  const barberId = params.barberId as string;
  const { showToast, toastElement } = useToast();

  const [barber, setBarber] = useState<AdminBarberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suspendModal, setSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadDetail = async () => {
    if (!admin) return;
    try {
      setError(null);
      const data = await AdminApiClient.getBarberDetail(barberId);
      setBarber(data);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barberId, admin]);

  const handleSuspend = async () => {
    if (!suspendReason.trim()) return;
    setSuspending(true);
    try {
      await AdminApiClient.suspendBarber(barberId, suspendReason.trim());
      showToast('Barber berhasil ditangguhkan.');
      setSuspendModal(false);
      setSuspendReason('');
      await loadDetail();
    } catch (err) {
      showToast(getAdminErrorMessage(err), 'error');
    } finally {
      setSuspending(false);
    }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      await AdminApiClient.reactivateBarber(barberId);
      showToast('Barber berhasil diaktifkan kembali.');
      await loadDetail();
    } catch (err) {
      showToast(getAdminErrorMessage(err), 'error');
    } finally {
      setReactivating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await AdminApiClient.deleteBarber(barberId);
      let message = 'Barber berhasil dihapus.';
      if (result.cancelledBookingsCount > 0) {
        message += ` ${result.cancelledBookingsCount} booking aktif dibatalkan.`;
      }
      if (result.paidBookingsNeedingReviewCount > 0) {
        message += ` ${result.paidBookingsNeedingReviewCount} transaksi lunas memerlukan tinjauan refund manual.`;
      }
      showToast(message);
      router.push('/barbers');
    } catch (err) {
      setDeleteError(getAdminErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-6 h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="h-40 animate-pulse rounded-xl bg-white shadow-sm" />
      </div>
    );
  }

  if (error || !barber) {
    return (
      <div className="p-8">
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error || 'Barber tidak ditemukan.'}</div>
        <Link href="/barbers" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
          ← Kembali ke Manajemen Barber
        </Link>
      </div>
    );
  }

  const isSuspended = barber.accountStatus === 'suspended';
  const isDeleted = barber.accountStatus === 'deleted';

  return (
    <div className="max-w-4xl p-8">
      <Link href="/barbers" className="mb-4 inline-block text-sm font-medium text-blue-600 hover:underline">
        ← Manajemen Barber
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
            {barber.displayName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{barber.displayName}</h1>
            <p className="text-sm text-slate-500">{barber.businessName || '-'}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(barber.accountStatus)}`}>
            {barber.accountStatus}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(barber.verificationStatus)}`}>
            {barber.verificationStatus}
          </span>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-900">Informasi Pribadi</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-slate-500">Email</p>
            <p className="mt-0.5 text-slate-800">{barber.email || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Nomor Telepon</p>
            <p className="mt-0.5 text-slate-800">{barber.phoneNumber || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Bergabung</p>
            <p className="mt-0.5 text-slate-800">{formatDate(barber.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Disetujui</p>
            <p className="mt-0.5 text-slate-800">{formatDate(barber.approvedAt)}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-900">Informasi Bisnis</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-slate-500">Alamat Bisnis</p>
            <p className="mt-0.5 text-slate-800">{barber.businessAddress || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Area Layanan</p>
            <p className="mt-0.5 text-slate-800">{barber.serviceArea || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Status Listing</p>
            <p className="mt-0.5 text-slate-800">{barber.listingStatus || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Menerima Pemesanan Baru</p>
            <p className="mt-0.5 text-slate-800">{barber.acceptingNewBookings ? '✓ Ya' : '✗ Tidak'}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-900">Performa</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-slate-500">Rating Rata-rata</p>
            <p className="mt-0.5 text-slate-800">{barber.ratingAverage ? `${barber.ratingAverage.toFixed(1)} ★` : '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Jumlah Review</p>
            <p className="mt-0.5 text-slate-800">{barber.reviewCount || 0}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Booking Aktif</p>
            <p className="mt-0.5 text-slate-800">{barber.activeBookingsCount ?? 0}</p>
          </div>
        </div>
      </div>

      {!isDeleted && (
        <div className="flex gap-3">
          {isSuspended ? (
            <button
              onClick={handleReactivate}
              disabled={reactivating}
              className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
            >
              {reactivating ? 'Memproses...' : 'Aktifkan Kembali'}
            </button>
          ) : (
            <button
              onClick={() => setSuspendModal(true)}
              className="rounded-lg border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100"
            >
              Suspend
            </button>
          )}
          <button
            onClick={() => {
              setDeleteError(null);
              setDeleteModal(true);
            }}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            Hapus Akun
          </button>
        </div>
      )}

      {suspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Bekukan Akun Barber?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Barber tidak akan dapat login atau menerima booking baru. Riwayat booking dan transaksi tetap tersimpan.
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              disabled={suspending}
              placeholder="Masukkan alasan suspensi (wajib diisi)..."
              className="mt-4 h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  setSuspendModal(false);
                  setSuspendReason('');
                }}
                disabled={suspending}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSuspend}
                disabled={suspending || !suspendReason.trim()}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {suspending ? 'Memproses...' : 'Bekukan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={deleteModal}
        title="Hapus Akun Barber"
        confirmWord="HAPUS"
        confirmLabel="Hapus Akun"
        loading={deleting}
        error={deleteError}
        description={
          <>
            <p>
              Anda akan menghapus <strong>{barber.displayName}</strong>
              {barber.businessName ? ` (${barber.businessName})` : ''}.
            </p>
            {(barber.activeBookingsCount ?? 0) > 0 && (
              <p className="mt-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
                Barber ini memiliki <strong>{barber.activeBookingsCount}</strong> booking aktif
                {(barber.paidActiveBookingsCount ?? 0) > 0 && (
                  <> ({barber.paidActiveBookingsCount} sudah lunas)</>
                )}
                . Semua akan dibatalkan secara otomatis.
              </p>
            )}
            <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              Menghapus barber akan menonaktifkan akun dan membatalkan booking yang masih aktif.
              Riwayat booking dan transaksi tetap disimpan.
            </p>
          </>
        }
        onCancel={() => {
          if (deleting) return;
          setDeleteModal(false);
        }}
        onConfirm={handleDelete}
      />

      {toastElement}
    </div>
  );
}
