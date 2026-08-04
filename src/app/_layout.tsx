import { AuthProvider } from '@/features/auth/context/auth-context';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import "../../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </AuthProvider>
  );
}