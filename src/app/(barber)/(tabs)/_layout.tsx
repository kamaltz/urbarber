import { colors } from '@/constants/colors';
import { SymbolIcon } from '@/components/ui/SymbolIcon';
import { Tabs } from 'expo-router';

export default function BarberTabsLayout() {
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
        name="bookings"
        options={{
          title: 'Pesanan',
          tabBarIcon: ({ color }) => <SymbolIcon name="scissors" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Layanan',
          tabBarIcon: ({ color }) => <SymbolIcon name="list.bullet" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Jadwal',
          tabBarIcon: ({ color }) => <SymbolIcon name="calendar" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <SymbolIcon name="person.fill" color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
