'use client';

import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import { AdminApiClient, type AdminBarberSummary } from '@/lib/api-client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function BarbersPage() {
  const { admin } = useAdminAuth();

  const [barbers, setBarbers] = useState<AdminBarberSummary[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'approved' | 'pending' | 'rejected'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load barbers
  useEffect(() => {
    async function load() {
      if (!admin) return;
      try {
        const result = await AdminApiClient.getBarbers(filter);
        setBarbers(result.items);
      } catch (err: any) {
        setError(err.message || 'Gagal load barbers.');
      } finally {
        setLoading(false);
      }
    }
    setLoading(true);
    load();
  }, [filter, admin]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-8">Manajemen Barber</h1>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {(['all', 'active', 'suspended', 'approved', 'pending', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded font-medium transition ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && <div className="text-center py-8">Memuat...</div>}

      {/* Error State */}
      {error && <div className="bg-red-100 text-red-800 p-4 rounded mb-4">{error}</div>}

      {/* Barbers Table */}
      {!loading && barbers.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Nama Barber</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Bisnis</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status Verifikasi</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status Akun</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Rating</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {barbers.map((barber) => (
                <tr key={barber.uid} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4">{barber.displayName}</td>
                  <td className="px-6 py-4">{barber.businessName || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(barber.verificationStatus)}`}>
                      {barber.verificationStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(barber.accountStatus)}`}>
                      {barber.accountStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {barber.ratingAverage ? (
                      <span>
                        {barber.ratingAverage.toFixed(1)} ★ ({barber.reviewCount || 0})
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/barbers/${barber.uid}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && barbers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Tidak ada barber untuk filter ini.
        </div>
      )}
    </div>
  );
}
