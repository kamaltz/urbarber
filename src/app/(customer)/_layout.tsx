import { Loading } from '@/components/ui/Loading';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

export default function CustomerLayout() {
  const { isAuthenticated, emailVerified, user, role, loading } = useAuth();

  const isValidCustomer =
    !loading &&
    isAuthenticated &&
    !user?.isUninitialized &&
    emailVerified &&
    user?.status !== 'suspended' &&
    role === 'customer';

  useEffect(() => {
    if (loading) return;

    let dest: string | undefined;

    if (!isAuthenticated) dest = '/(auth)/login';
    else if (user?.isUninitialized) dest = '/(auth)/complete-account-setup';
    else if (!emailVerified) dest = '/(auth)/verification-email';
    else if (user?.status === 'suspended') dest = '/(auth)/login';
    else if (role === 'barber') {
      dest = user?.status === 'pending_verification'
        ? '/(barber-onboarding)/status'
        : '/(barber)/home';
    } else if (role === 'admin') dest = '/(auth)/admin-web-only';

    if (!dest) return; // valid customer — no redirect needed

    const tid = setTimeout(() => router.replace(dest as any), 0);
    return () => clearTimeout(tid);
  }, [loading, isAuthenticated, emailVerified, user?.isUninitialized, user?.status, role]);

  if (!isValidCustomer) return <Loading />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        presentation: 'card',
      }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="explore" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
