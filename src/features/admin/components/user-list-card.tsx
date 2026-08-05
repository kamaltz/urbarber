/**
 * UserListCard Component
 * Displays a system user with verification and status controls
 */

import { AppButton } from '@/components/ui/AppButton';
import { Image, Pressable, Text, View } from 'react-native';
import type { SystemUser } from '../types/admin';

interface UserListCardProps {
  user: SystemUser;
  onPress?: () => void;
  onVerify?: (userId: string, approve: boolean) => void;
  onStatusChange?: (userId: string, status: 'active' | 'suspended') => void;
  showActions?: boolean;
}

const verificationBadges: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-600', label: 'Tertunda' },
  approved: { bg: 'bg-green-50', text: 'text-green-600', label: 'Disetujui' },
  rejected: { bg: 'bg-red-50', text: 'text-red-600', label: 'Ditolak' },
};

const statusBadges: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-50', text: 'text-green-600', label: 'Aktif' },
  suspended: { bg: 'bg-red-50', text: 'text-red-600', label: 'Dibekukan' },
  inactive: { bg: 'bg-slate-50', text: 'text-slate-600', label: 'Inaktif' },
};

export function UserListCard({
  user,
  onPress,
  onVerify,
  onStatusChange,
  showActions = true,
}: UserListCardProps) {
  const verificationBadge = verificationBadges[user.verificationStatus];
  const statusBadge = statusBadges[user.status];
  const roleLabel = user.userRole === 'customer' ? 'Pelanggan' : 'Barber';

  return (
    <Pressable
      onPress={onPress}
      className="bg-white border border-slate-100 rounded-lg p-4 mb-3"
    >
      <View className="flex-row gap-3">
        {user.profileImageUrl && (
          <Image
            source={{ uri: user.profileImageUrl }}
            className="w-12 h-12 rounded-full"
          />
        )}

        <View className="flex-1">
          <View className="flex-row justify-between mb-1">
            <Text className="text-slate-900 font-semibold text-base">
              {user.name}
            </Text>
            <Text className="text-slate-500 text-xs">
              {roleLabel}
            </Text>
          </View>

          <Text className="text-slate-500 text-sm mb-2">
            {user.email}
          </Text>

          <View className="flex-row gap-2 flex-wrap">
            <View className={`${verificationBadge.bg} px-2 py-1 rounded`}>
              <Text className={`${verificationBadge.text} text-xs font-medium`}>
                {verificationBadge.label}
              </Text>
            </View>

            <View className={`${statusBadge.bg} px-2 py-1 rounded`}>
              <Text className={`${statusBadge.text} text-xs font-medium`}>
                {statusBadge.label}
              </Text>
            </View>
          </View>
        </View>
      </View>

            {showActions && user.verificationStatus === 'pending' && (
        <View className="flex-row gap-2 mt-3">
          <AppButton
            label="Setujui"
            size="sm"
            onPress={() => onVerify?.(user.userId, true)}
            className="flex-1"
          />
          <AppButton
            label="Tolak"
            size="sm"
            variant="secondary"
            onPress={() => onVerify?.(user.userId, false)}
            className="flex-1"
          />
        </View>
      )}

      {showActions && user.status === 'active' && (
        <AppButton
          label="Bekukan Akun"
          size="sm"
          variant="secondary"
          onPress={() => onStatusChange?.(user.userId, 'suspended')}
          className="mt-2"
        />
      )}
    </Pressable>
  );
}
