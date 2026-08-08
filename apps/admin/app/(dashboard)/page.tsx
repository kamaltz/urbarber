'use client';

import { useAdminAuth } from '@/features/auth/AdminAuthProvider';

export default function DashboardPage() {
  const { admin } = useAdminAuth();

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>
        Dashboard
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Selamat datang kembali, {admin?.displayName || admin?.email}
      </p>

      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>
          Fondasi Admin Web
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem', lineHeight: '1.5' }}>
          Aplikasi Admin Web Foundation telah berhasil di-deploy. Dashboard ini menampilkan informasi administratif platform.
        </p>

        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem' }}>
          <p style={{ color: '#1e40af', fontSize: '0.875rem' }}>
            <strong>ℹ️ Informasi:</strong> Fitur bisnis Admin (Verifikasi Barber, Manajemen Pengguna, Booking, Kategori, Transaksi) akan ditambahkan di Batch 06 - Admin Operations.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div style={{ backgroundColor: '#f3f4f6', borderRadius: '0.5rem', padding: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              Status Autentikasi
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
              ✓ Aktif
            </p>
          </div>
          <div style={{ backgroundColor: '#f3f4f6', borderRadius: '0.5rem', padding: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              Role
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#208aef' }}>
              Admin
            </p>
          </div>
          <div style={{ backgroundColor: '#f3f4f6', borderRadius: '0.5rem', padding: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              Email
            </p>
            <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937', wordBreak: 'break-all' }}>
              {admin?.email}
            </p>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '2rem', marginTop: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>
          Menu Navigasi
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Fitur tambahan tersedia di sidebar navigasi sebelah kiri. Beberapa fitur masih dalam tahap pengembangan.
        </p>
      </div>
    </div>
  );
}
