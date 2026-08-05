import { Loading } from '@/components/ui/Loading';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Redirect, Stack, useSegments } from 'expo-router';

export default function AuthLayout() {
  const { isAuthenticated, emailVerified, role, loading } = useAuth();
  const segments = useSegments();

  if (loading) return <Loading />;

  if (isAuthenticated && emailVerified) {
    return <Redirect href="/(customer)/home" />;
  }

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
      <Stack.Screen name="onboarding/[step]" options={{ animation: 'fade' }} />
    </Stack>
  );
}
