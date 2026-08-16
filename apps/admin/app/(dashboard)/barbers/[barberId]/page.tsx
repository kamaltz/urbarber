'use client';

import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import { AdminApiClient, type AdminBarberDetail } from '@/lib/api-client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function BarberDetailPage() {
  const router = useRouter();
  const { admin } = useAdminAuth();
  const params = useParams();
  const barberId = params.barberId as string;

  const [barber, setBarber] = useState<AdminBarberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suspendModal, setSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Load barber detail
  useEffect(() => {
    async function load() {
      if (!admin) return;
      try {
        const data = await AdminApiClient.getBarberDetail(barberId);
        setBarber(data);
      } catch (err: any) {
        setError(err.message || 'Gagal load detail.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [barberId, admin]);

  // Handle suspend
  const handleSuspend = async () => {
    if (!barber || !suspendReason.trim()) {
      alert('Alasan suspensi diperlukan.');
      return;
    }
    setSuspending(true);
    try {
      await AdminApiClient.suspendBarber(barberId, suspendReason);
      alert('Barber berhasil disuspensus.');
      router.push('/barbers');
    } catch (err: any) {
      alert(`Gagal suspend: ${err.message}`);
    } finally {
      setSuspending(false);
      setSuspendModal(false);
    }
  };

  // Handle reactivate
  const handleReactivate = async () => {
    try {
      await AdminApiClient.reactivateBarber(barberId);
      alert('Barber berhasil diaktifkan kembali.');
      // Reload page
      setLoading(true);
      const data = await AdminApiClient.getBarberDetail(barberId);
      setBarber(data);
      setLoading(false);
    } catch (err: any) {
      alert(`Gagal reactivate: ${err.message}`);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (deleteConfirmation !== 'HAPUS') {
      alert('Ketik "HAPUS" untuk mengkonfirmasi penghapusan.');
      return;
    }
    setDeleting(true);
    try {
      await AdminApiClient.deleteBarber(barberId);
      alert('Barber berhasil dihapus.');
      router.push('/barbers');
    } catch (err: any) {
      // Check if error is about active bookings
      if (err.code === 'CONFLICT') {
        alert(`Gagal delete: Barber masih memiliki booking aktif. Pastikan semua booking selesai atau dibatalkan terlebih dahulu.`);
      } else {
        alert(`Gagal delete: ${err.message}`);
      }
    } finally {
      setDeleting(false);
      setDeleteModal(false);
      setDeleteConfirmation('');
    }
  };

  if (loading) {
    return <div className="p-8">Memuat...</div>;
  }

  if (error || !barber) {
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'pending_verification':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isSuspended = barber.accountStatus === 'suspended';

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">{barber.displayName}</h1>
            <p className="text-gray-600">{barber.businessName}</p>
          </div>
          <span className={`px-4 py-2 rounded font-semibold ${getStatusColor(barber.accountStatus)}`}>
            {barber.accountStatus === 'active' ? 'Aktif' : barber.accountStatus === 'suspended' ? 'Disuspensus' : 'Pending'}
          </span>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Informasi Pribadi</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="text-lg">{barber.email || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nomor Telepon</label>
            <p className="text-lg">{barber.phoneNumber || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Bergabung</label>
            <p className="text-lg">
              {barber.createdAt ? new Date(barber.createdAt).toLocaleDateString('id-ID') : '-'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Disetujui</label>
            <p className="text-lg">
              {barber.approvedAt ? new Date(barber.approvedAt).toLocaleDateString('id-ID') : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Business Information */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Informasi Bisnis</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Alamat Bisnis</label>
            <p className="text-lg">{barber.businessAddress || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Area Layanan</label>
            <p className="text-lg">{barber.serviceArea || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status Verifikasi</label>
            <p className="text-lg">
              <span className={`px-3 py-1 rounded ${getStatusColor(barber.verificationStatus)}`}>
                {barber.verificationStatus}
              </span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status Listing</label>
            <p className="text-lg">{barber.listingStatus || '-'}</p>
          </div>
        </div>
      </div>

      {/* Performance */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Performa</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Rating Rata-rata</label>
            <p className="text-lg">
              {barber.ratingAverage ? barber.ratingAverage.toFixed(1) : '-'} ★
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Jumlah Review</label>
            <p className="text-lg">{barber.reviewCount || 0}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Menerima Pemesanan Baru</label>
            <p className="text-lg">
              {barber.acceptingNewBookings ? '✓ Ya' : '✗ Tidak'}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        {isSuspended ? (
          <>
            <button
              onClick={handleReactivate}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              Aktifkan Kembali
            </button>
            <button
              onClick={() => setDeleteModal(true)}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
            >
              Hapus Akun
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setSuspendModal(true)}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
            >
              Suspensus
            </button>
            <button
              onClick={() => setDeleteModal(true)}
              className="px-6 py-3 bg-red-800 text-white rounded-lg hover:bg-red-900 font-semibold"
            >
              Hapus Akun
            </button>
          </>
        )}
      </div>

      {/* Suspend Modal */}
      {suspendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md">
            <h3 className="text-2xl font-semibold mb-4">Bekukan Akun Barber?</h3>
            <p className="text-gray-600 mb-4">
              Barber tidak akan dapat login atau menerima booking baru. Riwayat booking dan transaksi tetap tersimpan.
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Masukkan alasan suspensi (opsional)..."
              className="w-full p-3 border rounded mb-4 h-20"
            />
            <div className="flex gap-4">
              <button
                onClick={() => setSuspendModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                onClick={handleSuspend}
                disabled={suspending || !suspendReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {suspending ? 'Memproses...' : 'Bekukan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md">
            <h3 className="text-2xl font-semibold mb-4 text-red-600">Hapus Akun Barber?</h3>
            <p className="text-gray-600 mb-4">
              Tindakan ini tidak dapat dibatalkan. Akun barber akan dihapus dan tidak dapat digunakan kembali.
            </p>
            <p className="text-gray-600 mb-4">
              Riwayat booking dan transaksi akan tetap disimpan untuk keperluan audit.
            </p>
            <p className="text-gray-700 font-semibold mb-4">
              Ketik "HAPUS" untuk mengkonfirmasi:
            </p>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder='Ketik "HAPUS"'
              className="w-full p-3 border rounded mb-4 font-mono text-center"
            />
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirmation !== 'HAPUS'}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 font-semibold"
              >
                {deleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
