import { colors } from '@/constants/colors';
import { SymbolIcon } from '@/components/ui/SymbolIcon';
import { Tabs } from 'expo-router';

export default function AdminTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.slate[400],
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.slate[100],
          backgroundColor: '#FFFFFF',
          paddingTop: 6,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <SymbolIcon name="chart.bar.fill" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="barbers"
        options={{
          title: 'Barber',
          tabBarIcon: ({ color }) => <SymbolIcon name="scissors" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Pengguna',
          tabBarIcon: ({ color }) => <SymbolIcon name="person.2.fill" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Booking',
          tabBarIcon: ({ color }) => <SymbolIcon name="calendar.badge.clock" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Pengaturan',
          tabBarIcon: ({ color }) => <SymbolIcon name="gearshape.fill" color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
