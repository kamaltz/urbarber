'use client';

import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import { AdminApiClient, type DashboardMetrics } from '@/lib/api-client';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { admin } = useAdminAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await AdminApiClient.getDashboardMetrics();
        setMetrics(data);
      } catch (err: any) {
        setError(err.message || 'Gagal memuat dashboard');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', color: '#1f2937' }}>
          Dashboard
        </h1>
        <div style={{ color: '#6b7280' }}>Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', color: '#1f2937' }}>
          Dashboard
        </h1>
        <div
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            padding: '1rem',
            color: '#7f1d1d',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>
        Dashboard
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Selamat datang kembali, {admin?.displayName || admin?.email}
      </p>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Active Customers */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            Pelanggan Aktif
          </p>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981' }}>
            {metrics?.totalActiveCustomers || 0}
          </p>
        </div>

        {/* Approved Barbers */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            Barber Terverifikasi
          </p>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
            {metrics?.totalApprovedBarbers || 0}
          </p>
        </div>

        {/* Pending Registrations */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            Registrasi Menunggu
          </p>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
            {metrics?.pendingBarberRegistrations || 0}
          </p>
        </div>

        {/* Suspended Accounts */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            Akun Ditangguhkan
          </p>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444' }}>
            {metrics?.suspendedAccounts || 0}
          </p>
        </div>

        {/* Active Bookings */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            Booking Aktif
          </p>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#8b5cf6' }}>
            {metrics?.activeBookings || 0}
          </p>
        </div>

        {/* Completed Bookings */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            Booking Selesai
          </p>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#06b6d4' }}>
            {metrics?.completedBookings || 0}
          </p>
        </div>

        {/* Cancelled Bookings */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            Booking Dibatalkan
          </p>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#6b7280' }}>
            {metrics?.cancelledBookings || 0}
          </p>
        </div>

        {/* Monthly Service Value */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            Nilai Transaksi Bulan Ini
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669', wordBreak: 'break-word' }}>
            {formatCurrency(metrics?.currentMonthServiceValue || 0)}
          </p>
        </div>
      </div>

      {/* Recent Registrations */}
      {metrics?.recentBarberRegistrations && metrics.recentBarberRegistrations.length > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>
            Registrasi Terbaru
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Nama Bisnis
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Pemilik
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Status
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Tanggal Daftar
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentBarberRegistrations.map((reg) => (
                  <tr key={reg.barberId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem', color: '#1f2937' }}>{reg.businessName}</td>
                    <td style={{ padding: '0.75rem', color: '#1f2937' }}>{reg.ownerName}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          backgroundColor:
                            reg.verificationStatus === 'pending'
                              ? '#fef3c7'
                              : reg.verificationStatus === 'approved'
                                ? '#dcfce7'
                                : '#fee2e2',
                          color:
                            reg.verificationStatus === 'pending'
                              ? '#92400e'
                              : reg.verificationStatus === 'approved'
                                ? '#166534'
                                : '#991b1b',
                        }}
                      >
                        {reg.verificationStatus === 'pending'
                          ? 'Menunggu'
                          : reg.verificationStatus === 'approved'
                            ? 'Disetujui'
                            : 'Ditolak'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#1f2937' }}>
                      {new Date(reg.submittedAt).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Bookings */}
      {metrics?.recentBookings && metrics.recentBookings.length > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>
            Booking Terbaru
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Booking ID
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Tanggal
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Status
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
                    Harga
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentBookings.map((booking) => (
                  <tr key={booking.bookingId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem', color: '#1f2937', fontSize: '0.875rem' }}>
                      {booking.bookingId.slice(0, 8)}...
                    </td>
                    <td style={{ padding: '0.75rem', color: '#1f2937' }}>
                      {new Date(booking.date).toLocaleDateString('id-ID')}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          backgroundColor:
                            booking.status === 'in_progress'
                              ? '#bfdbfe'
                              : booking.status === 'completed'
                                ? '#dcfce7'
                                : '#fecaca',
                          color:
                            booking.status === 'in_progress'
                              ? '#1e40af'
                              : booking.status === 'completed'
                                ? '#166534'
                                : '#991b1b',
                        }}
                      >
                        {booking.status === 'in_progress'
                          ? 'Berlangsung'
                          : booking.status === 'completed'
                            ? 'Selesai'
                            : 'Dibatalkan'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#1f2937', fontWeight: '500' }}>
                      {formatCurrency(booking.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

