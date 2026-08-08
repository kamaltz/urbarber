'use client';

import type { AdminIdentity } from '@/lib/api-client';
import Link from 'next/link';

export function AdminSidebar({ admin }: { admin: AdminIdentity | null }) {
  const menuItems = [
    { label: 'Dashboard', href: '/', icon: '📊' },
    { label: 'Verifikasi Barber', href: '/barber-verification', icon: '✅' },
    { label: 'Pengguna', href: '/users', icon: '👥' },
    { label: 'Booking', href: '#', icon: '📅', disabled: true },
    { label: 'Kategori', href: '#', icon: '📂', disabled: true },
    { label: 'Transaksi', href: '#', icon: '💰', disabled: true },
    { label: 'Pengaturan', href: '#', icon: '⚙️', disabled: true },
  ];

  return (
    <aside style={{
      width: '280px',
      backgroundColor: '#1f2937',
      color: 'white',
      padding: '2rem 0',
      overflowY: 'auto',
      boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
    }}>
      <div style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>URBarber</h2>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>Admin Portal</p>
      </div>

      <nav>
        {menuItems.map((item) => (
          <div key={item.label}>
            {item.disabled ? (
              <div
                style={{
                  padding: '0.75rem 1.5rem',
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  cursor: 'not-allowed',
                  opacity: 0.5,
                }}
              >
                <span style={{ marginRight: '0.5rem' }}>{item.icon}</span>
                {item.label}
              </div>
            ) : (
              <Link
                href={item.href}
                style={{
                  display: 'block',
                  padding: '0.75rem 1.5rem',
                  color: '#f3f4f6',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  transition: 'background-color 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#374151';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
                }}
              >
                <span style={{ marginRight: '0.5rem' }}>{item.icon}</span>
                {item.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      <div style={{
        borderTop: '1px solid #374151',
        marginTop: '2rem',
        paddingTop: '1.5rem',
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem',
      }}>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
          Batch 06 - Phase 1 (Admin Operations)
        </p>
        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          Dashboard, Verifikasi Barber, Manajemen Pengguna
        </p>
      </div>
    </aside>
  );
}
