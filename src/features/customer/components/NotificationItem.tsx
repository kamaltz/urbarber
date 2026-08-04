/**
 * NotificationItem Component
 * Displays a single notification
 */

import { Pressable, Text, View } from 'react-native';
import type { CustomerNotification } from '../types/customer';

interface NotificationItemProps {
  notification: CustomerNotification;
  onPress?: () => void;
  onMarkAsRead?: (id: string) => void;
}

const getNotificationIcon = (type: string): string => {
  switch (type) {
    case 'booking':
      return '📅';
    case 'chat':
      return '💬';
    case 'promo':
      return '🎉';
    case 'update':
      return '📢';
    default:
      return '📬';
  }
};

export function NotificationItem({
  notification,
  onPress,
  onMarkAsRead,
}: NotificationItemProps) {
  return (
    <Pressable
      onPress={() => {
        if (!notification.read && onMarkAsRead) {
          onMarkAsRead(notification.id);
        }
        onPress?.();
      }}
      className={`flex-row gap-3 border-b border-slate-100 px-4 py-3 ${
        notification.read ? 'bg-white' : 'bg-blue-50'
      }`}>
      <Text className="mt-1 text-2xl">{getNotificationIcon(notification.type)}</Text>

      <View className="flex-1 justify-center gap-1">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 font-semibold text-slate-900">{notification.title}</Text>

          {!notification.read && (
            <View className="ml-2 h-3 w-3 rounded-full bg-orange-600" />
          )}
        </View>

        <Text className="text-sm text-slate-600">{notification.message}</Text>

        <Text className="text-xs text-slate-500">
          {new Date(notification.createdAt).toLocaleDateString('id-ID', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </Pressable>
  );
}
