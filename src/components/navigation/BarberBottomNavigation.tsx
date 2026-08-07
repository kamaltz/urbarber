import { BottomNavigation } from '@/components/ui/BottomNavigation';
import { SymbolIcon } from '@/components/ui/SymbolIcon';
import { router, usePathname } from 'expo-router';

const barberTabs = [
  { key: 'home', label: 'Dashboard', path: '/(barber)/home', iconName: 'chart.bar.fill' },
  { key: 'bookings', label: 'Pesanan', path: '/(barber)/(tabs)/bookings', iconName: 'scissors' },
  { key: 'services', label: 'Layanan', path: '/(barber)/(tabs)/services', iconName: 'list.bullet' },
  { key: 'schedule', label: 'Jadwal', path: '/(barber)/(tabs)/schedule', iconName: 'calendar' },
  { key: 'profile', label: 'Profil', path: '/(barber)/(tabs)/profile', iconName: 'person.fill' },
] as const;

export function BarberBottomNavigation() {
  const pathname = usePathname();

  const activeKey = (() => {
    if (pathname.includes('/bookings')) return 'bookings';
    if (pathname.includes('/services')) return 'services';
    if (pathname.includes('/schedule')) return 'schedule';
    if (pathname.includes('/profile')) return 'profile';
    return 'home';
  })();

  return (
    <BottomNavigation
      activeKey={activeKey}
      items={barberTabs.map((tab) => ({
        key: tab.key,
        label: tab.label,
        icon: (
          <SymbolIcon
            name={tab.iconName as any}
            size={20}
            color={activeKey === tab.key ? '#D2691E' : '#64748b'}
          />
        ),
      }))}
      onChange={(key) => {
        const destination = barberTabs.find((tab) => tab.key === key);
        if (destination && destination.key !== activeKey) {
          router.replace(destination.path as any);
        }
      }}
    />
  );
}
