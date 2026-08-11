/**
 * Booking History Screen
 * Shows active bookings and booking history with tab switcher
 */

import { router } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  Text,
  View,
  Pressable,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { CustomerBottomNavigation } from '@/components/navigation/CustomerBottomNavigation';
import { routes } from '@/constants/routes';
import { Loading } from '@/components/ui/Loading';
import { BookingCard } from '@/features/bookings/components/BookingCard';
import { useBookingList } from '@/features/bookings/hooks/use-booking-list';
import { useAuth } from '@/features/auth/hooks/use-auth';

export default function BookingHistoryScreen() {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const customerId = user?.uid || '';

  const { bookings, loading, error } = useBookingList(customerId, activeTab);

  const handleBookingPress = (bookingId: string) => {
    if (activeTab === 'active') {
      router.push(`/(customer)/booking/detail/${bookingId}`);
    } else {
      router.push(`/(customer)/booking/history/${bookingId}`);
    }
  };

  if (authLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Loading />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated || !customerId) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-lg font-semibold text-slate-900">
            Silakan masuk untuk melihat pemesanan Anda
          </Text>
          <AppButton
            label="Ke Halaman Login"
            onPress={() => router.replace(routes.auth.login)}
            className="mt-6 h-12 rounded-lg px-8"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        {/* Header */}
        <View className="border-b border-slate-200 px-4 py-4">
          <Text className="text-2xl font-bold text-slate-900">Pemesanan</Text>
        </View>

        {/* Tab Control */}
        <View className="flex-row gap-3 border-b border-slate-200 px-4 py-4">
          <Pressable
            onPress={() => setActiveTab('active')}
            className={`flex-1 items-center rounded-full py-2 ${
              activeTab === 'active' ? 'bg-orange-100' : 'bg-slate-100'
            }`}>
            <Text
              className={`font-semibold ${
                activeTab === 'active' ? 'text-orange-700' : 'text-slate-600'
              }`}>
              Pemesanan Aktif
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('history')}
            className={`flex-1 items-center rounded-full py-2 ${
              activeTab === 'history' ? 'bg-orange-100' : 'bg-slate-100'
            }`}>
            <Text
              className={`font-semibold ${
                activeTab === 'history' ? 'text-orange-700' : 'text-slate-600'
              }`}>
              Riwayat
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        {loading ? (
          <Loading />
        ) : error ? (
          <View className="flex-1 items-center justify-center px-4">
            <Text className="text-center text-slate-600">{error}</Text>
          </View>
        ) : (bookings?.length ?? 0) === 0 ? (
          <View className="flex-1 items-center justify-center px-4">
            <Text className="text-center text-lg font-semibold text-slate-900">
              {activeTab === 'active' ? 'Tidak ada pemesanan aktif' : 'Belum ada riwayat pemesanan'}
            </Text>
            <Text className="mt-2 text-center text-slate-600">
              {activeTab === 'active'
                ? 'Mulai pesan layanan barbershop sekarang'
                : 'Riwayat pemesanan Anda akan muncul di sini'}
            </Text>

            {activeTab === 'active' && (
              <AppButton
                label="Cari Barbershop"
                onPress={() => router.push(routes.customer.explore)}
                className="mt-6 h-12 rounded-lg px-8"
              />
            )}
          </View>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View className="px-4">
                <BookingCard booking={item} onPress={() => handleBookingPress(item.id)} />
              </View>
            )}
            scrollEnabled={false}
            contentContainerStyle={{ paddingVertical: 16 }}
          />
        )}
      </View>
      <CustomerBottomNavigation />
    </SafeAreaView>
  );
}
