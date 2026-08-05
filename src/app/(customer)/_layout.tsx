import { Loading } from '@/components/ui/Loading';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Redirect, Stack } from 'expo-router';

export default function CustomerLayout() {
  const { isAuthenticated, emailVerified, role, loading } = useAuth();

  if (loading) return <Loading />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!emailVerified) return <Redirect href="/(auth)/authentication" />;
  if (role !== 'customer') {
    return <Redirect href="/(customer)/home" />;
  }

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
