/**
 * HomeSection
 * Titled horizontal-scroll section wrapper used by Customer Home for each
 * barber list (nearest / recommended / home service). Handles its own
 * loading skeleton and empty state so Home stays readable during partial
 * data loads instead of collapsing to a blank block.
 */
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import type { NearbyBarber } from '../types/customer';
import { HomeBarberCard } from './HomeBarberCard';

interface HomeSectionProps {
  title: string;
  barbers: NearbyBarber[];
  loading?: boolean;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onSeeAll?: () => void;
  onPressBarber?: (barberId: string) => void;
}

export function HomeSection({
  title,
  barbers,
  loading,
  emptyMessage,
  emptyActionLabel,
  onEmptyAction,
  onSeeAll,
  onPressBarber,
}: HomeSectionProps) {
  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between px-4 mb-3">
        <Text className="text-base font-bold text-slate-900">{title}</Text>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll}>
            <Text className="text-xs font-semibold text-[#D2691E]">Lihat Semua ›</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View className="flex-row px-4 gap-3">
          {[0, 1].map((i) => (
            <View key={i} className="h-52 w-60 rounded-2xl bg-slate-100" />
          ))}
        </View>
      ) : barbers.length === 0 ? (
        <View className="mx-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 items-center">
          <Text className="text-xs text-slate-500 text-center">
            {emptyMessage || 'Belum ada barber untuk ditampilkan di sini.'}
          </Text>
          {emptyActionLabel && onEmptyAction ? (
            <AppButton
              label={emptyActionLabel}
              onPress={onEmptyAction}
              variant="ghost"
              fullWidth={false}
              className="mt-3"
            />
          ) : null}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {barbers.map((barber, idx) => (
            <HomeBarberCard
              key={barber.barberId || `${title}-${idx}`}
              barber={barber}
              onPress={() => onPressBarber?.(barber.barberId)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
