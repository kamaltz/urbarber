/**
 * Service List Component - Display services with pricing
 */

import { Image, Text, View } from 'react-native';
import { Service } from '../types/booking';

export type ServiceListProps = {
  services: Service[];
  showImages?: boolean;
  showDuration?: boolean;
};

export function ServiceList({
  services,
  showImages = false,
  showDuration = true,
}: ServiceListProps) {
  return (
    <View className="gap-3">
      {services.map((service) => (
        <View key={service.id} className="flex-row items-center gap-3 pb-3 border-b border-slate-200">
          {showImages && service.imageUrl && (
            <Image
              source={{ uri: service.imageUrl }}
              className="h-12 w-12 rounded-lg bg-slate-200"
            />
          )}

          <View className="flex-1">
            <Text className="font-semibold text-slate-900">{service.name}</Text>
            {service.description && (
              <Text className="mt-1 text-sm text-slate-600">{service.description}</Text>
            )}
            {showDuration && service.durationMinutes && (
              <Text className="mt-1 text-xs text-slate-500">{service.durationMinutes} menit</Text>
            )}
          </View>

          <Text className="font-semibold text-slate-900">Rp {service.price.toLocaleString('id-ID')}</Text>
        </View>
      ))}
    </View>
  );
}
