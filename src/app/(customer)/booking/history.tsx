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
import { EmptyState } from '@/components/ui/EmptyState';
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
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1">
        {/* Header Bar */}
        <View className="border-b border-slate-200 bg-white px-5 py-4 shadow-xs">
          <Text className="text-xl font-bold text-[#363062]">Pemesanan Saya</Text>
          <Text className="text-xs text-slate-500 mt-0.5">Kelola janji pemesanan & riwayat cukur</Text>
        </View>

        {/* Tab Control Switcher */}
        <View className="bg-white px-5 py-3 border-b border-slate-200/80">
          <View className="flex-row rounded-2xl bg-slate-100 p-1.5 border border-slate-200/60">
            <Pressable
              onPress={() => setActiveTab('active')}
              className={`flex-1 items-center justify-center rounded-xl py-2.5 transition-all ${
                activeTab === 'active'
                  ? 'bg-[#363062] shadow-xs'
                  : 'bg-transparent'
              }`}>
              <Text
                className={`text-xs font-bold ${
                  activeTab === 'active' ? 'text-white' : 'text-slate-600'
                }`}>
                Pemesanan Aktif
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('history')}
              className={`flex-1 items-center justify-center rounded-xl py-2.5 transition-all ${
                activeTab === 'history'
                  ? 'bg-[#363062] shadow-xs'
                  : 'bg-transparent'
              }`}>
              <Text
                className={`text-xs font-bold ${
                  activeTab === 'history' ? 'text-white' : 'text-slate-600'
                }`}>
                Riwayat Cukur
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Main Content Area */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <Loading />
          </View>
        ) : error ? (
          <View className="p-5 rounded-2xl bg-rose-50 border border-rose-200 m-5">
            <Text className="text-sm font-bold text-rose-800 text-center mb-1">
              Gagal Memuat Pemesanan
            </Text>
            <Text className="text-xs text-rose-600 text-center">{error}</Text>
          </View>
        ) : (bookings?.length ?? 0) === 0 ? (
          <View className="flex-1 items-center justify-center px-6 py-10">
            <EmptyState
              title={activeTab === 'active' ? 'Belum Ada Pemesanan Aktif' : 'Belum Ada Riwayat Pemesanan'}
              description={
                activeTab === 'active'
                  ? 'Pesan layanan barbershop atau panggil barber ke rumah sekarang secara mudah.'
                  : 'Riwayat pemesanan layanan yang telah selesai akan tercatat di sini.'
              }
              icon={
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#EDEFFB] border border-[#363062]/10">
                  <Text className="text-3xl">{activeTab === 'active' ? '📅' : '📜'}</Text>
                </View>
              }
              actionLabel={activeTab === 'active' ? 'Cari Barber Terdekat' : undefined}
              onActionPress={activeTab === 'active' ? () => router.push(routes.customer.explore) : undefined}
              className="bg-white border-slate-200/80 shadow-xs"
            />
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
            contentContainerStyle={{ paddingVertical: 16 }}
          />
        )}
      </View>
      <CustomerBottomNavigation />
    </SafeAreaView>
  );
}
