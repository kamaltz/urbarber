/**
 * ServicePriceListItem Component
 * Displays a service with price, duration, and active toggle
 */

import React from 'react';
import { Pressable, Text, View, Switch, Image } from 'react-native';
import type { BarberService } from '../types/barber';

interface ServicePriceListItemProps {
  service: BarberService;
  onPress?: () => void;
  onToggleActive?: (serviceId: string, isActive: boolean) => void;
  onDelete?: (serviceId: string) => void;
  editable?: boolean;
  showDuration?: boolean;
}

export function ServicePriceListItem({
  service,
  onPress,
  onToggleActive,
  onDelete,
  editable = true,
  showDuration = true,
}: ServicePriceListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white border border-slate-100 rounded-lg p-4 mb-3 flex-row items-center gap-4"
    >
      {service.imageUrl && (
        <Image
          source={{ uri: service.imageUrl }}
          className="w-16 h-16 rounded-lg"
        />
      )}

      <View className="flex-1">
        <Text className="text-slate-900 font-semibold text-base mb-1">
          {service.name}
        </Text>
        <Text className="text-slate-500 text-sm mb-2">
          {service.description}
        </Text>
        <View className="flex-row gap-2 items-center">
          <Text className="text-orange-600 font-semibold">
            Rp {service.price.toLocaleString('id-ID')}
          </Text>
          {showDuration && (
            <Text className="text-slate-400 text-xs">
              • {service.durationMinutes} menit
            </Text>
          )}
        </View>
      </View>

      {editable && (
        <Switch
          value={service.isActive}
          onValueChange={(value) =>
            onToggleActive?.(service.serviceId, value)
          }
          trackColor={{ false: '#e5e7eb', true: '#fed7aa' }}
          thumbColor={service.isActive ? '#d2691e' : '#9ca3af'}
        />
      )}
    </Pressable>
  );
}
