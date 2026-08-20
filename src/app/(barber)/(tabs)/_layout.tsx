import { Stack } from 'expo-router';

/**
 * Plain route group, not a Tabs navigator: the Barber app's actual tab
 * switching is handled by BarberBottomNavigation, rendered once at the
 * (barber)/_layout.tsx root so it stays visible across every main screen
 * (Dashboard, these four, and analysis/reviews/booking detail) -- an inner
 * Tabs navigator here would render a second, competing 4-item tab bar with
 * no Dashboard entry.
 */
export default function BarberTabsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="bookings" />
      <Stack.Screen name="services" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
