import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        presentation: 'card',
      }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="otp-verification" />
      <Stack.Screen name="register-customer" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="onboarding/[step]" options={{ animation: 'fade' }} />
    </Stack>
  );
}
