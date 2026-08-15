import { Loading } from '@/components/ui/Loading';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

export default function AuthLayout() {
  const { isAuthenticated, emailVerified, user, role, loading } = useAuth();

  const isSuspended = isAuthenticated && user?.status === 'suspended';
  const isUninitialized = user?.isUninitialized;
  const shouldRedirectAway = isAuthenticated && !isSuspended && !isUninitialized && emailVerified;

  useEffect(() => {
    if (loading || !shouldRedirectAway) return;

    // P1-1 (FINAL_THESIS_READINESS_AUDIT.md HIGH finding): admin-web-only used to
    // live inside this same (auth) route group, so redirecting an authenticated
    // admin here meant this layout's own render-gate below (shouldRedirectAway ->
    // <Loading/>, Stack never mounts) blocked the very screen it was redirecting
    // to -- an admin on mobile got stuck on an infinite spinner and could never
    // reach Logout. admin-web-only now lives at the app root (src/app/admin-web-only.tsx),
    // outside any auth-gated group, so this redirect always lands on a route this
    // layout has no control over mounting.
    let dest: string;
    if (role === 'barber') dest = '/(barber)/home';
    else if (role === 'admin') dest = '/admin-web-only';
    else dest = '/(customer)/home';

    const tid = setTimeout(() => router.replace(dest as any), 0);
    return () => clearTimeout(tid);
  }, [loading, shouldRedirectAway, role]);

  if (loading || shouldRedirectAway) return <Loading />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        presentation: 'card',
      }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="authentication" />
      <Stack.Screen name="otp-verification" />
      <Stack.Screen name="register-customer" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="verification-email" />
      <Stack.Screen name="complete-account-setup" />
      <Stack.Screen name="onboarding/[step]" options={{ animation: 'fade' }} />
    </Stack>
  );
}
