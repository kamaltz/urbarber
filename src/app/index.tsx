import { Loading } from '@/components/ui/Loading';
import { routes } from '@/constants/routes';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function IndexScreen() {
  const { isAuthenticated, emailVerified, user, role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    let dest: any;

    if (isAuthenticated && user?.status === 'suspended') {
      dest = routes.auth.login;
    } else if (isAuthenticated && !emailVerified) {
      dest = routes.auth.verificationEmail;
    } else if (isAuthenticated && user?.isUninitialized) {
      dest = routes.auth.completeAccountSetup;
    } else if (isAuthenticated) {
      if (role === 'barber') dest = '/(barber)/home';
      else if (role === 'admin') dest = '/admin-web-only';
      else dest = '/(customer)/home';
    } else {
      dest = routes.auth.onboarding(0);
    }

    const tid = setTimeout(() => router.replace(dest as any), 0);
    return () => clearTimeout(tid);
  }, [loading, isAuthenticated, emailVerified, user?.status, user?.isUninitialized, role]);

  return <Loading />;
}
