import { Loading } from '@/components/ui/Loading';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Redirect, Stack } from 'expo-router';

export default function AuthLayout() {
  const { isAuthenticated, emailVerified, user, role, loading } = useAuth();

  if (loading) return <Loading />;

  if (isAuthenticated && user?.status === 'suspended') {
    // Keep user on auth screens with suspended block rather than advancing to app routes
    return (
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          presentation: 'card',
        }}>
        <Stack.Screen name="login" />
      </Stack>
    );
  }

  if (isAuthenticated && emailVerified) {
    if (role === 'barber') {
      return <Redirect href="/(barber)/home" />;
    }
    if (role === 'admin') {
      return <Redirect href="/(admin)/dashboard" />;
    }
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
