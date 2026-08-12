import { AuthProvider } from '@/features/auth/context/auth-context';
import { Stack, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import * as SplashScreen from 'expo-splash-screen';

import "../../global.css";

SplashScreen.preventAutoHideAsync();

/** DEV-only route-change tracer for diagnosing Fabric view-mounting crashes. No PII logged. */
function RouteTracer() {
  const pathname = usePathname();
  const previousRef = useRef<string | null>(null);

  useEffect(() => {
    if (__DEV__) {
      console.log('[FABRIC_TRACE]', { event: 'route', from: previousRef.current, to: pathname });
    }
    previousRef.current = pathname;
  }, [pathname]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RouteTracer />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </AuthProvider>
  );
}