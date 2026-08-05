import { Loading } from '@/components/ui/Loading';
import { routes } from '@/constants/routes';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Redirect } from 'expo-router';

export default function IndexScreen() {
  const { isAuthenticated, emailVerified, user, role, loading } = useAuth();

  if (loading) return <Loading />;

  if (isAuthenticated && user?.status === 'suspended') {
    return <Redirect href="/(auth)/login" />;
  }

  if (isAuthenticated && !emailVerified) {
    return <Redirect href="/(auth)/authentication" />;
  }

  if (isAuthenticated) {
    if (role === 'barber') return <Redirect href="/(barber)/home" />;
    if (role === 'admin') return <Redirect href="/(admin)/dashboard" />;
    return <Redirect href="/(customer)/home" />;
  }

  return <Redirect href={routes.auth.onboarding(0)} />;
}
