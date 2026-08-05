import { Loading } from '@/components/ui/Loading';
import { routes } from '@/constants/routes';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Redirect } from 'expo-router';

export default function IndexScreen() {
  const { isAuthenticated, emailVerified, loading } = useAuth();

  if (loading) return <Loading />;

  if (isAuthenticated && !emailVerified) {
    return <Redirect href="/(auth)/authentication" />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(customer)/home" />;
  }

  return <Redirect href={routes.auth.onboarding(0)} />;
}
