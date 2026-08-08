import { Loading } from '@/components/ui/Loading';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

export default function BarberOnboardingLayout() {
  const { isAuthenticated, emailVerified, role, loading } = useAuth();

  const isValidBarber =
    !loading && isAuthenticated && emailVerified && role === 'barber';

  useEffect(() => {
    if (loading) return;

    let dest: string | undefined;

    if (!isAuthenticated) dest = '/(auth)/login';
    else if (!emailVerified) dest = '/(auth)/verification-email';
    else if (role === 'customer') dest = '/(customer)/home';
    else if (role === 'admin') dest = '/(auth)/admin-web-only';

    if (!dest) return; // valid barber — no redirect needed

    const tid = setTimeout(() => router.replace(dest as any), 0);
    return () => clearTimeout(tid);
  }, [loading, isAuthenticated, emailVerified, role]);

  if (!isValidBarber) return <Loading />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="profile" />
      <Stack.Screen name="business" />
      <Stack.Screen name="documents" />
      <Stack.Screen name="review" />
      <Stack.Screen name="status" />
    </Stack>
  );
}
