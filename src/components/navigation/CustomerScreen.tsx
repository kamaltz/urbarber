import { CustomerBottomNavigation } from '@/components/navigation/CustomerBottomNavigation';
import { AppButton } from '@/components/ui/AppButton';
import { backOrReplace } from '@/lib/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

type CustomerScreenProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  action?: { label: string; onPress: () => void };
  showTabs?: boolean;
  /**
   * Screens that own their own scrollable content (ScrollView/FlatList/map) must pass
   * scroll={false} -- a nested vertical ScrollView-in-ScrollView is a known Fabric
   * "addViewAt: child already has a parent" crash trigger on Android New Architecture.
   */
  scroll?: boolean;
};

export function CustomerScreen({ title, description, children, action, showTabs = false, scroll = true }: CustomerScreenProps) {
  useEffect(() => {
    if (__DEV__) console.log('[FABRIC_TRACE]', { event: 'mount', screen: title });
    return () => {
      if (__DEV__) console.log('[FABRIC_TRACE]', { event: 'unmount', screen: title });
    };
  }, [title]);

  const body = (
    <>
      {description ? <Text className="mb-6 text-base leading-6 text-slate-600">{description}</Text> : null}
      {children}
      {action ? <AppButton label={action.label} onPress={action.onPress} className="mt-6 h-14 rounded-lg" /> : null}
    </>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header bar with Back button */}
      <View className="flex-row items-center border-b border-slate-200 bg-white px-4 py-4">
        <Pressable
          onPress={() => backOrReplace('/(customer)/home')}
          className="mr-3 rounded-full p-1 active:bg-slate-100"
          accessibilityRole="button"
          accessibilityLabel="Kembali ke Home"
        >
          <Text className="text-2xl font-bold text-slate-900">←</Text>
        </Pressable>
        <Text className="text-xl font-bold text-slate-900">{title}</Text>
      </View>

      {scroll ? (
        <ScrollView className="flex-1" contentContainerClassName="flex-grow px-4 py-6">
          {body}
        </ScrollView>
      ) : (
        <View className="flex-1 px-4 py-6">{body}</View>
      )}

      {/* Bottom navigation bar */}
      {showTabs ? <CustomerBottomNavigation /> : null}
    </SafeAreaView>
  );
}
