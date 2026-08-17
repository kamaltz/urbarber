import type { Metadata } from 'next';
import { AdminAuthProvider } from '@/features/auth/AdminAuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'URBarber Admin',
  description: 'URBarber Administration Portal',
};

// Every route in this app is a client-rendered, Firebase-auth-gated admin
// screen with no server-fetchable content -- there is nothing meaningful to
// statically prerender, and doing so forces build-time evaluation of the
// Firebase client SDK (which correctly throws when config is absent). Force
// dynamic rendering so all routes are only ever evaluated per-request.
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <AdminAuthProvider>
          {children}
        </AdminAuthProvider>
      </body>
    </html>
  );
}
