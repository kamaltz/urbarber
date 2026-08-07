import { Loading } from '@/components/ui/Loading';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Redirect, Stack } from 'expo-router';

export default function BarberOnboardingLayout() {
  const { isAuthenticated, emailVerified, role, loading } = useAuth();

  if (loading) return <Loading />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!emailVerified) return <Redirect href={"/(auth)/verification-email" as any} />;

  if (role === 'customer') return <Redirect href="/(customer)/home" />;
  if (role === 'admin') return <Redirect href="/(admin)/dashboard" />;

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
