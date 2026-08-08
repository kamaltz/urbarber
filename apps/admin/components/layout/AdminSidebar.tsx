'use client';

import type { AdminIdentity } from '@/lib/api-client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AdminSidebar({ admin }: { admin: AdminIdentity | null }) {
  const pathname = usePathname();

  const menuItems = [
    { label: 'Dashboard', href: '/', icon: '📊' },
    { label: 'Verifikasi Barber', href: '/barber-verification', icon: '✅' },
    { label: 'Manajemen Barber', href: '/barbers', icon: '💇' },
    { label: 'Pengguna', href: '/users', icon: '👥' },
    { label: 'Booking', href: '/bookings', icon: '📅' },
    { label: 'Kategori', href: '/categories', icon: '📂' },
    { label: 'Transaksi', href: '/transactions', icon: '💰' },
    { label: 'Pengaturan', href: '/settings', icon: '⚙️' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

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
          <Link
            key={item.label}
            href={item.href}
            style={{
              display: 'block',
              padding: '0.75rem 1.5rem',
              color: isActive(item.href) ? '#fff' : '#f3f4f6',
              textDecoration: 'none',
              fontSize: '0.875rem',
              transition: 'background-color 0.2s',
              cursor: 'pointer',
              backgroundColor: isActive(item.href) ? '#374151' : 'transparent',
              borderLeft: isActive(item.href) ? '3px solid #3b82f6' : '3px solid transparent',
            }}
            onMouseEnter={(e) => {
              if (!isActive(item.href)) {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(item.href)) {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
              }
            }}
          >
            <span style={{ marginRight: '0.5rem' }}>{item.icon}</span>
            {item.label}
          </Link>
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
          URBarber Admin Operations
        </p>
        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          Batch 06 - Phase 3 Complete
        </p>
      </div>
    </aside>
  );
}
