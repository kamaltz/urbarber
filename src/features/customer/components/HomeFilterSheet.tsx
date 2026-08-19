/**
 * HomeFilterSheet
 * Lightweight bottom-sheet filter for Customer Home's search entry point.
 * Only wires parameters the discovery layer actually supports today
 * (category, service type, and the recommendation-rule sorts backed by real
 * signals: nearest/highest_rating/most_popular) -- no price filter, since no
 * price field exists anywhere in the Barber data model yet.
 */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import type { CategoryChip } from '../types/customer';
import type { CategoryRecommendationRule } from '@/features/location/services/recommendation-rules';

export type HomeServiceTypeFilter = 'barbershop' | 'customer_home' | undefined;

export interface HomeFilterValues {
  category?: string;
  serviceType: HomeServiceTypeFilter;
  sort?: CategoryRecommendationRule;
}

interface HomeFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  categories: CategoryChip[];
  onApply: (values: HomeFilterValues) => void;
}

const SORT_OPTIONS: { value: CategoryRecommendationRule; label: string }[] = [
  { value: 'nearest', label: 'Terdekat' },
  { value: 'highest_rating', label: 'Rating Tertinggi' },
  { value: 'most_popular', label: 'Terpopuler' },
];

const SERVICE_TYPE_OPTIONS: { value: HomeServiceTypeFilter; label: string }[] = [
  { value: undefined, label: 'Semua' },
  { value: 'barbershop', label: 'Di Tempat' },
  { value: 'customer_home', label: 'Datang ke Rumah' },
];

export function HomeFilterSheet({ visible, onClose, categories, onApply }: HomeFilterSheetProps) {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [serviceType, setServiceType] = useState<HomeServiceTypeFilter>(undefined);
  const [sort, setSort] = useState<CategoryRecommendationRule | undefined>(undefined);

  const handleReset = () => {
    setCategory(undefined);
    setServiceType(undefined);
    setSort(undefined);
  };

  const handleApply = () => {
    onApply({ category, serviceType, sort });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View className="rounded-t-3xl bg-white px-5 pt-5 pb-8">
        <View className="mb-4 self-center h-1.5 w-12 rounded-full bg-slate-200" />
        <Text className="text-lg font-bold text-slate-900 mb-4">Filter Pencarian</Text>

        <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipe Layanan</Text>
        <View className="flex-row gap-2 mb-5">
          {SERVICE_TYPE_OPTIONS.map((opt) => {
            const active = serviceType === opt.value;
            return (
              <Pressable
                key={opt.label}
                onPress={() => setServiceType(opt.value)}
                className={[
                  'flex-1 items-center rounded-xl border py-2.5',
                  active ? 'bg-[#363062] border-[#363062]' : 'bg-white border-slate-200',
                ].join(' ')}
              >
                <Text className={['text-xs font-semibold', active ? 'text-white' : 'text-slate-700'].join(' ')}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Urutkan</Text>
        <View className="flex-row flex-wrap gap-2 mb-5">
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setSort(active ? undefined : opt.value)}
                className={[
                  'rounded-full border px-4 py-2',
                  active ? 'bg-[#D2691E] border-[#D2691E]' : 'bg-white border-slate-200',
                ].join(' ')}
              >
                <Text className={['text-xs font-semibold', active ? 'text-white' : 'text-slate-700'].join(' ')}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {categories.length > 0 ? (
          <>
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kategori</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mb-6">
              {categories.map((cat) => {
                const active = category === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setCategory(active ? undefined : cat.id)}
                    className={[
                      'rounded-full border px-4 py-2 mr-2',
                      active ? 'bg-[#D2691E] border-[#D2691E]' : 'bg-white border-slate-200',
                    ].join(' ')}
                  >
                    <Text className={['text-xs font-semibold', active ? 'text-white' : 'text-slate-700'].join(' ')}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        <View className="flex-row gap-3">
          <AppButton label="Reset" onPress={handleReset} variant="secondary" className="flex-1" />
          <AppButton label="Terapkan Filter" onPress={handleApply} variant="primary" className="flex-1" />
        </View>
      </View>
    </Modal>
  );
}
