/**
 * CustomerProfileHeader Component
 * Displays customer profile information at top of profile screen
 */

import { Image, Text, View } from 'react-native';
import type { CustomerProfile } from '../types/customer';

interface CustomerProfileHeaderProps {
  profile: CustomerProfile;
  backgroundColor?: string;
}

export function CustomerProfileHeader({
  profile,
  backgroundColor = 'bg-orange-600',
}: CustomerProfileHeaderProps) {
  return (
    <View className={`${backgroundColor} items-center gap-4 px-4 py-8`}>
      {profile.profileImageUrl && (
        <Image
          source={{ uri: profile.profileImageUrl }}
          className="h-24 w-24 rounded-full border-4 border-white"
          resizeMode="cover"
        />
      )}

      <View className="items-center gap-2">
        <Text className="text-2xl font-bold text-white">{profile.name}</Text>

        <Text className="text-sm text-orange-100">{profile.email}</Text>

        {profile.location && <Text className="text-sm text-orange-100">📍 {profile.location}</Text>}
      </View>
    </View>
  );
}
