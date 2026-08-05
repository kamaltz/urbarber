import { Loading } from '@/components/ui/Loading';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Redirect, Stack } from 'expo-router';

export default function BarberLayout() {
  const { isAuthenticated, emailVerified, user, role, loading } = useAuth();

  if (loading) return <Loading />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!emailVerified) return <Redirect href="/(auth)/authentication" />;
  if (user?.status === 'suspended') return <Redirect href="/(auth)/login" />;

  if (role === 'customer') {
    return <Redirect href="/(customer)/home" />;
  }
  if (role === 'admin') {
    return <Redirect href="/(admin)/dashboard" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="home" />
    </Stack>
  );
}
