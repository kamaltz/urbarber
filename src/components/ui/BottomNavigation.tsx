import React from 'react';
import { Pressable, Text, View } from 'react-native';

export type BottomNavigationItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  badgeCount?: number;
};

export type BottomNavigationProps = {
  items: BottomNavigationItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
};

export function BottomNavigation({ items, activeKey, onChange, className }: BottomNavigationProps) {
  return (
    <View className={['w-full flex-row items-center justify-around border-t border-slate-200 bg-white py-2', className ?? ''].join(' ')}>
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            accessibilityRole="button"
            className="min-w-[64px] items-center justify-center gap-1 px-2 py-1">
            <View className="relative items-center justify-center">
              {item.icon ?? <Text className={active ? 'text-[#D2691E]' : 'text-slate-500'}>•</Text>}
              {item.badgeCount && item.badgeCount > 0 ? (
                <View className="absolute -right-2 -top-1 min-w-4 rounded-full bg-[#D2691E] px-1">
                  <Text className="text-center text-[10px] font-semibold text-white">{item.badgeCount > 99 ? '99+' : item.badgeCount}</Text>
                </View>
              ) : null}
            </View>
            <Text className={['text-xs', active ? 'font-semibold text-[#D2691E]' : 'text-slate-500'].join(' ')}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
