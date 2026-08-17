'use client';

import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import { AdminApiClient, type DashboardMetrics } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/errors';
import { shortId } from '@/lib/format';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { admin } = useAdminAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await AdminApiClient.getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal memuat data dashboard. Silakan coba lagi.'));
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
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

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string, type: 'booking' | 'payment' | 'user' | 'verification') => {
    let bg = '#f3f4f6';
    let color = '#374151';
    let label = status;

    if (type === 'booking') {
      switch (status) {
        case 'pending':
          bg = '#fef3c7'; color = '#92400e'; label = 'Menunggu'; break;
        case 'accepted':
          bg = '#dbeafe'; color = '#1e40af'; label = 'Diterima'; break;
        case 'in_progress':
        case 'en_route':
        case 'arrived':
          bg = '#e0e7ff'; color = '#3730a3'; label = 'Berlangsung'; break;
        case 'completed':
          bg = '#dcfce7'; color = '#166534'; label = 'Selesai'; break;
        case 'cancelled':
          bg = '#f3f4f6'; color = '#4b5563'; label = 'Dibatalkan'; break;
        case 'rejected':
          bg = '#fee2e2'; color = '#991b1b'; label = 'Ditolak'; break;
      }
    } else if (type === 'payment') {
      switch (status) {
        case 'paid':
          bg = '#dcfce7'; color = '#166534'; label = 'Lunas (Paid)'; break;
        case 'pending':
        case 'initiated':
          bg = '#fef3c7'; color = '#92400e'; label = 'Pending'; break;
        case 'failed':
        case 'expired':
        case 'cancelled':
          bg = '#fee2e2'; color = '#991b1b'; label = 'Gagal'; break;
        case 'not_required':
          bg = '#e0e7ff'; color = '#3730a3'; label = 'Cash on Service'; break;
        default:
          label = status;
      }
    } else if (type === 'verification') {
      switch (status) {
        case 'pending':
          bg = '#fef3c7'; color = '#92400e'; label = 'Menunggu Verifikasi'; break;
        case 'approved':
          bg = '#dcfce7'; color = '#166534'; label = 'Disetujui'; break;
        case 'rejected':
          bg = '#fee2e2'; color = '#991b1b'; label = 'Ditolak'; break;
      }
    } else if (type === 'user') {
      switch (status) {
        case 'active':
          bg = '#dcfce7'; color = '#166534'; label = 'Aktif'; break;
        case 'suspended':
          bg = '#fee2e2'; color = '#991b1b'; label = 'Ditangguhkan'; break;
        case 'pending_verification':
          bg = '#fef3c7'; color = '#92400e'; label = 'Pending'; break;
      }
    }

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '0.25rem 0.625rem',
          borderRadius: '0.375rem',
          fontSize: '0.75rem',
          fontWeight: '600',
          backgroundColor: bg,
          color: color,
        }}
      >
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            URBarber Admin Dashboard
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Memuat metrics platform...
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                height: '110px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div style={{ width: '60%', height: '14px', backgroundColor: '#e5e7eb', borderRadius: '4px', marginBottom: '0.75rem' }} />
              <div style={{ width: '40%', height: '28px', backgroundColor: '#e5e7eb', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', marginBottom: '1.5rem' }}>
          URBarber Admin Dashboard
        </h1>
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div>
            <strong style={{ fontSize: '1rem' }}>Gagal Memuat Dashboard</strong>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', margin: 0 }}>{error}</p>
          </div>
          <button
            onClick={() => loadMetrics(false)}
            style={{
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const suspendedBarbersCount = metrics?.suspendedBarbers ?? metrics?.suspendedAccounts ?? 0;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
            URBarber Admin Dashboard
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem', margin: 0 }}>
            Selamat datang kembali, <strong>{admin?.displayName || admin?.email}</strong>
          </p>
        </div>
        <button
          onClick={() => loadMetrics(true)}
          disabled={refreshing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: refreshing ? '#9ca3af' : '#2563eb',
            color: 'white',
            border: 'none',
            padding: '0.625rem 1.25rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'background-color 0.2s',
          }}
        >
          <span>{refreshing ? '🔄 Memperbarui...' : '🔄 Segarkan Data'}</span>
        </button>
      </div>

      {/* Primary KPI Grid (5 Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* 1. Pelanggan Aktif */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '4px solid #10b981' }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
            Pelanggan Aktif
          </p>
          <p style={{ fontSize: '2.25rem', fontWeight: '800', color: '#10b981', margin: 0, lineHeight: 1.1 }}>
            {metrics?.totalActiveCustomers || 0}
          </p>
        </div>

        {/* 2. Barber Aktif */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '4px solid #3b82f6' }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
            Barber Aktif
          </p>
          <p style={{ fontSize: '2.25rem', fontWeight: '800', color: '#3b82f6', margin: 0, lineHeight: 1.1 }}>
            {metrics?.totalApprovedBarbers || 0}
          </p>
        </div>

        {/* 3. Barber Ditangguhkan */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '4px solid #ef4444' }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
            Barber Ditangguhkan
          </p>
          <p style={{ fontSize: '2.25rem', fontWeight: '800', color: '#ef4444', margin: 0, lineHeight: 1.1 }}>
            {suspendedBarbersCount}
          </p>
        </div>

        {/* 4. Booking Aktif */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '4px solid #8b5cf6' }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
            Booking Aktif
          </p>
          <p style={{ fontSize: '2.25rem', fontWeight: '800', color: '#8b5cf6', margin: 0, lineHeight: 1.1 }}>
            {metrics?.activeBookings || 0}
          </p>
        </div>

        {/* 5. Pendapatan Bulan Ini */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '4px solid #059669' }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
            Pendapatan Bulan Ini
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: '800', color: '#059669', margin: 0, lineHeight: 1.2, wordBreak: 'break-word' }}>
            {formatCurrency(metrics?.currentMonthServiceValue || 0)}
          </p>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: '#f8fafc', borderRadius: '0.5rem', padding: '0.875rem 1.25rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: '500' }}>Booking Hari Ini</span>
          <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>{metrics?.todayBookings ?? 0}</span>
        </div>
        <div style={{ backgroundColor: '#f8fafc', borderRadius: '0.5rem', padding: '0.875rem 1.25rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: '500' }}>Verifikasi Barber Menunggu</span>
          <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#d97706' }}>{metrics?.pendingBarberRegistrations || 0}</span>
        </div>
        <div style={{ backgroundColor: '#f8fafc', borderRadius: '0.5rem', padding: '0.875rem 1.25rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: '500' }}>Total Booking Selesai</span>
          <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0284c7' }}>{metrics?.completedBookings || 0}</span>
        </div>
      </div>

      {/* Quick Actions (Subsection E) */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
          Aksi Cepat (Quick Actions)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <Link
            href="/barbers"
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              border: '1px solid #e5e7eb',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              transition: 'transform 0.15s, boxShadow 0.15s',
            }}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '0.5rem', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              💇
            </div>
            <div>
              <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.9375rem' }}>Kelola Barber</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>Status & account freeze</div>
            </div>
          </Link>

          <Link
            href="/barber-verification"
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              border: '1px solid #e5e7eb',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '0.5rem', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              ✅
            </div>
            <div>
              <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.9375rem' }}>Verifikasi Barber</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>Tinjau pendaftaran baru</div>
            </div>
          </Link>

          <Link
            href="/bookings"
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              border: '1px solid #e5e7eb',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '0.5rem', backgroundColor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              📅
            </div>
            <div>
              <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.9375rem' }}>Monitoring Booking</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>Pantau pesanan aktif</div>
            </div>
          </Link>

          <Link
            href="/transactions"
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              border: '1px solid #e5e7eb',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '0.5rem', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              💰
            </div>
            <div>
              <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.9375rem' }}>Monitoring Transaksi</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>Pantau pembayaran Midtrans</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Main Lists Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        {/* Subsection A: Barber Menunggu Verifikasi */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              A. Barber Menunggu Verifikasi
            </h2>
            <Link
              href="/barber-verification"
              style={{ color: '#2563eb', fontSize: '0.875rem', fontWeight: '600', textDecoration: 'none' }}
            >
              Lihat Semua →
            </Link>
          </div>

          {metrics?.recentBarberRegistrations && metrics.recentBarberRegistrations.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Nama Bisnis</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Pemilik</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Telepon</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Tanggal Daftar</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentBarberRegistrations.map((reg) => (
                    <tr key={reg.barberId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>
                        {reg.businessName || '-'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#334155' }}>
                        {reg.ownerName || '-'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>
                        {reg.phoneNumber || '-'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>
                        {formatDateTime(reg.submittedAt)}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {getStatusBadge(reg.verificationStatus, 'verification')}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <Link
                          href={`/barber-verification/${reg.barberId}`}
                          style={{
                            color: '#2563eb',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            textDecoration: 'none',
                          }}
                        >
                          Tinjau Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
              Tidak ada pendaftaran barber yang sedang menunggu verifikasi.
            </div>
          )}
        </div>

        {/* Subsection B: Booking Terbaru */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              B. Booking Terbaru
            </h2>
            <Link
              href="/bookings"
              style={{ color: '#2563eb', fontSize: '0.875rem', fontWeight: '600', textDecoration: 'none' }}
            >
              Lihat Semua →
            </Link>
          </div>

          {metrics?.recentBookings && metrics.recentBookings.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Booking ID</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Pelanggan</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Barber</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Tanggal & Waktu</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Harga</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentBookings.map((b) => (
                    <tr key={b.bookingId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontFamily: 'monospace', color: '#334155' }}>
                        {shortId(b.bookingId)}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>
                        {b.customerName || 'Pelanggan'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#334155' }}>
                        {b.barberName || 'Barber'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>
                        {formatDateTime(b.date)} {b.startTime ? `(${b.startTime})` : ''}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {getStatusBadge(b.status, 'booking')}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: '700', color: '#0f172a' }}>
                        {formatCurrency(b.price || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
              Tidak ada booking terbaru.
            </div>
          )}
        </div>

        {/* Subsection C: Barber Ditangguhkan */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              C. Barber Ditangguhkan (Suspended)
            </h2>
            <Link
              href="/barbers?filter=suspended"
              style={{ color: '#2563eb', fontSize: '0.875rem', fontWeight: '600', textDecoration: 'none' }}
            >
              Lihat Semua →
            </Link>
          </div>

          {metrics?.suspendedBarbersList && metrics.suspendedBarbersList.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Nama Barber</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Bisnis</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Email</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Alasan</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.suspendedBarbersList.map((b) => (
                    <tr key={b.uid} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>
                        {b.displayName}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#334155' }}>
                        {b.businessName || '-'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>
                        {b.email || '-'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#b91c1c' }}>
                        {b.statusReason || 'Ditangguhkan oleh Admin'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {getStatusBadge(b.status, 'user')}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <Link
                          href={`/barbers/${b.uid}`}
                          style={{
                            color: '#2563eb',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            textDecoration: 'none',
                          }}
                        >
                          Kelola / Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
              Tidak ada akun barber yang sedang ditangguhkan.
            </div>
          )}
        </div>

        {/* Subsection D: Transaksi Terbaru */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              D. Transaksi Terbaru
            </h2>
            <Link
              href="/transactions"
              style={{ color: '#2563eb', fontSize: '0.875rem', fontWeight: '600', textDecoration: 'none' }}
            >
              Lihat Semua →
            </Link>
          </div>

          {metrics?.recentTransactions && metrics.recentTransactions.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>ID Transaksi</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Booking ID</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Provider</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Jumlah</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Status Pembayaran</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentTransactions.map((tx) => (
                    <tr key={tx.transactionId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontFamily: 'monospace', color: '#334155' }}>
                        {shortId(tx.transactionId)}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontFamily: 'monospace', color: '#64748b' }}>
                        {tx.bookingId ? shortId(tx.bookingId) : '-'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>
                        {tx.provider === 'midtrans_sandbox' ? 'Midtrans Sandbox' : 'Cash on Service'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: '700', color: '#0f172a' }}>
                        {formatCurrency(tx.grossAmount || 0)}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {getStatusBadge(tx.status, 'payment')}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>
                        {formatDateTime(tx.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
              Tidak ada transaksi terbaru.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
