import { BottomNavigation } from '@/components/ui/BottomNavigation';
import { routes } from '@/constants/routes';
import { router, usePathname } from 'expo-router';
import { Text } from 'react-native';

const tabs = [
  { key: 'home', label: 'Home', path: routes.customer.home, icon: '⌂' },
  { key: 'explore', label: 'Cari', path: routes.customer.explore, icon: '⌕' },
  { key: 'booking', label: 'Booking', path: routes.customer.bookingHistory, icon: '▣' },
  { key: 'chat', label: 'Chat', path: routes.customer.chats, icon: '◌' },
  { key: 'profile', label: 'Profil', path: routes.customer.profile, icon: '○' },
] as const;

export function CustomerBottomNavigation() {
  const pathname = usePathname();
  const activeKey =
    tabs.find((tab) => {
      const tabPath = tab.path.replace('/(customer)', '').replace(/\/index$/, '');
      return pathname === tabPath || pathname.startsWith(tabPath + '/');
    })?.key ??
    'home';

  return (
    <BottomNavigation
      activeKey={activeKey}
      items={tabs.map((tab) => ({
        key: tab.key,
        label: tab.label,
        icon: <Text className={activeKey === tab.key ? 'text-xl text-[#D2691E]' : 'text-xl text-slate-500'}>{tab.icon}</Text>,
      }))}
      onChange={(key) => {
        const destination = tabs.find((tab) => tab.key === key);
        if (destination && destination.key !== activeKey) router.replace(destination.path);
      }}
    />
  );
}
