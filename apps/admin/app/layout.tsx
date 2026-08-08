import type { Metadata } from 'next';
import { AdminAuthProvider } from '@/features/auth/AdminAuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'URBarber Admin',
  description: 'URBarber Administration Portal',
};

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
