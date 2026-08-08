/**
 * CategoryChips Component
 * Displays filterable category chips
 */

import { Pressable, ScrollView, Text } from 'react-native';
import type { CategoryChip } from '../types/customer';

interface CategoryChipsProps {
  chips: CategoryChip[];
  onSelectCategory?: (categoryId: string) => void;
}

export function CategoryChips({ chips, onSelectCategory }: CategoryChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="flex-row gap-2">
      {chips.map((chip, idx) => (
        <Pressable
          key={chip.id ? `chip-${chip.id}` : `chip-idx-${idx}`}
          onPress={() => onSelectCategory?.(chip.id)}
          className={`rounded-full border px-4 py-2 ${
            chip.isActive
              ? 'border-orange-600 bg-white'
              : 'border-slate-200 bg-slate-50'
          }`}>
          <Text
            className={`text-sm font-medium ${
              chip.isActive ? 'text-orange-600' : 'text-slate-600'
            }`}>
            {chip.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
