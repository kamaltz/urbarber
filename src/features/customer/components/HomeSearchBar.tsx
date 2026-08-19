/**
 * HomeSearchBar
 * Prominent, tappable search entry point for Customer Home. Tapping the field
 * opens Explore (the real search+map+results screen) so Home doesn't
 * duplicate search logic; the adjacent filter button opens HomeFilterSheet.
 */
import { Pressable, Text, View } from 'react-native';

interface HomeSearchBarProps {
  onPressSearch: () => void;
  onPressFilter: () => void;
  hasActiveFilter?: boolean;
}

export function HomeSearchBar({ onPressSearch, onPressFilter, hasActiveFilter }: HomeSearchBarProps) {
  return (
    <View className="mx-4 mb-5 flex-row items-center gap-2">
      <Pressable
        onPress={onPressSearch}
        accessibilityRole="button"
        accessibilityLabel="Cari barber, layanan, atau lokasi"
        className="flex-1 flex-row items-center rounded-2xl bg-white px-4 py-3.5 border border-slate-200 shadow-sm"
      >
        <Text className="mr-2 text-slate-400">🔍</Text>
        <Text className="text-sm font-medium text-slate-400">Cari barber, layanan, atau lokasi...</Text>
      </Pressable>

      <Pressable
        onPress={onPressFilter}
        accessibilityRole="button"
        accessibilityLabel="Buka filter pencarian"
        className={[
          'h-[52px] w-[52px] items-center justify-center rounded-2xl border shadow-sm',
          hasActiveFilter ? 'bg-[#363062] border-[#363062]' : 'bg-white border-slate-200',
        ].join(' ')}
      >
        <Text className="text-lg">{hasActiveFilter ? '⚙️' : '🎚️'}</Text>
      </Pressable>
    </View>
  );
}
