/**
 * BarberServiceHero Component
 * Displays barber profile with shop image, name, edit action
 */

import React from 'react';
import { Pressable, Text, View, Image } from 'react-native';
import { AppButton } from '../../ui/app-button';
import type { BarberProfile } from '../types/barber';

interface BarberServiceHeroProps {
  profile: BarberProfile;
  onEdit?: () => void;
  showEditButton?: boolean;
}

export function BarberServiceHero({
  profile,
  onEdit,
  showEditButton = true,
}: BarberServiceHeroProps) {
  return (
    <View className="bg-white rounded-lg overflow-hidden mb-4">
      {profile.shopImageUrl && (
        <Image
          source={{ uri: profile.shopImageUrl }}
          className="w-full h-48"
        />
      )}

      <View className="p-4">
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1">
            <Text className="text-slate-900 font-bold text-lg mb-1">
              {profile.shopName}
            </Text>
            <Text className="text-slate-500 text-sm mb-2">
              {profile.shopAddress}
            </Text>
            <Text className="text-slate-600 text-xs">
              ☎️ {profile.phone}
            </Text>
          </View>

          {showEditButton && (
            <AppButton
              title="Edit"
              size="sm"
              variant="secondary"
              onPress={onEdit}
            />
          )}
        </View>

        {profile.shopDescription && (
          <Text className="text-slate-600 text-sm leading-5 mt-3">
            {profile.shopDescription}
          </Text>
        )}

        {profile.isVerified && (
          <View className="bg-green-50 flex-row items-center gap-2 rounded-lg p-2 mt-3">
            <Text className="text-green-600">✓</Text>
            <Text className="text-green-600 text-xs font-semibold">
              Terverifikasi
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
