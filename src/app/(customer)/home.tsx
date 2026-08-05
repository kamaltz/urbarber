import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Header } from '@/components/ui/Header';
import { Loading } from '@/components/ui/Loading';
import { Rating } from '@/components/ui/Rating';
import { CustomerBottomNavigation } from '@/components/navigation/CustomerBottomNavigation';
import { routes } from '@/constants/routes';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useCustomerHome } from '@/features/customer/hooks/use-customer-home';
import { useCustomerProfile } from '@/features/customer/hooks/use-customer-profile';
import { firebaseAuth } from '@/lib/firebase';
import { router } from 'expo-router';
import { useCallback } from 'react';
import {
    Image,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    Text,
    View,
} from 'react-native';

export default function HomeScreen() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const customerId = user?.uid;

  const { profile } = useCustomerProfile(customerId || '');
  const { homeData, refresh } = useCustomerHome(customerId || '');

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  if (authLoading) {
    return <Loading />;
  }

  if (!isAuthenticated || !customerId) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-2xl font-bold text-[#D2691E] mb-4">Welcome to URBarber</Text>
          <Text className="text-center text-slate-600 mb-6">
            Please sign in to continue
          </Text>
          <AppButton
            label="Go to Login"
            onPress={() => router.replace(routes.auth.login)}
            variant="primary"
          />
        </View>
      </SafeAreaView>
    );
  }

  const displayName = profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Pelanggan';
  const avatarUrl =
    profile?.profileImageUrl ||
    (profile as any)?.profileImage ||
    user?.photoURL ||
    firebaseAuth.currentUser?.photoURL;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Header title="Home" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} />}
      >
        {/* User Greeting Section */}
        <View className="px-4 pt-6 pb-4">
          <View className="flex-row items-center gap-3">
            <Avatar
              size="lg"
              name={displayName}
              source={avatarUrl ? { uri: avatarUrl } : undefined}
            />
            <View className="flex-1">
              <Text className="text-2xl font-bold text-slate-900">
                Hello, {displayName.split(' ')[0]}! 👋
              </Text>
              <Text className="text-sm text-slate-600 mt-1">
                Ready to look your best?
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Stats Cards */}
        <View className="px-4 pb-4">
          <View className="flex-row gap-3">
            <AppCard className="flex-1 p-4">
              <Text className="text-sm text-slate-600">Upcoming</Text>
              <Text className="text-2xl font-bold text-[#D2691E] mt-1">0</Text>
              <Text className="text-xs text-slate-500 mt-1">Bookings</Text>
            </AppCard>
            <AppCard className="flex-1 p-4">
              <Text className="text-sm text-slate-600">Favorites</Text>
              <Text className="text-2xl font-bold text-[#D2691E] mt-1">
                {homeData?.barberSuggestions?.length || 0}
              </Text>
              <Text className="text-xs text-slate-500 mt-1">Barbers</Text>
            </AppCard>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-4 pb-4">
          <Text className="text-lg font-bold text-slate-900 mb-3">Quick Actions</Text>
          <AppButton
            label="Book an Appointment"
            onPress={() => router.push(routes.customer.explore)}
            variant="primary"
            className="mb-2"
          />
          <View className="flex-row gap-2">
            <AppButton
              label="Favorites"
              onPress={() => router.push(routes.customer.favorites)}
              variant="secondary"
              className="flex-1"
            />
            <AppButton
              label="Messages"
              onPress={() => router.push(routes.customer.chats)}
              variant="secondary"
              className="flex-1"
            />
          </View>
        </View>

        {/* Featured Services */}
        {homeData?.featuredServices && homeData.featuredServices.length > 0 && (
          <View className="px-4 pb-4">
            <Text className="text-lg font-bold text-slate-900 mb-3">Featured Services</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-3">
              {homeData.featuredServices.map((service) => (
                <AppCard key={service.id} className="w-40 p-3">
                  {service.imageUrl && (
                    <Image
                      source={{ uri: service.imageUrl }}
                      className="w-full h-24 rounded-md mb-2"
                    />
                  )}
                  <Text className="font-semibold text-slate-900 text-sm">{service.title}</Text>
                  <Text className="text-xs text-slate-600 mt-1">{service.subtitle}</Text>
                </AppCard>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Suggested Barbers */}
        {homeData?.barberSuggestions && homeData.barberSuggestions.length > 0 && (
          <View className="px-4 pb-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold text-slate-900">Suggested Barbers</Text>
              <Pressable onPress={() => router.push(routes.customer.explore)}>
                <Text className="text-sm text-[#D2691E] font-semibold">View All</Text>
              </Pressable>
            </View>
            {homeData.barberSuggestions.slice(0, 3).map((barber) => (
              <AppCard
                key={barber.barberId}
                onPress={() =>
                  router.push({
                    pathname: '/(customer)/barber/[barberId]',
                    params: { barberId: barber.barberId },
                  })
                }
                className="mb-3 p-3"
              >
                <View className="flex-row items-center gap-3">
                  {barber.imageUrl && (
                    <Image
                      source={{ uri: barber.imageUrl }}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <View className="flex-1">
                    <Text className="font-semibold text-slate-900">{barber.name}</Text>
                    <Text className="text-xs text-slate-600 mt-1">{barber.status}</Text>
                    {barber.rating !== undefined && (
                      <View className="mt-1">
                        <Rating value={barber.rating} size="sm" />
                      </View>
                    )}
                  </View>
                </View>
              </AppCard>
            ))}
          </View>
        )}

        {/* Empty State */}
        {!homeData?.barberSuggestions?.length && !homeData?.featuredServices?.length && (
          <View className="px-4 py-8">
            <EmptyState
              title="No suggestions yet"
              description="Complete your profile to get personalized barber recommendations"
              actionLabel="Complete Profile"
              onActionPress={() => router.push(routes.customer.profile)}
            />
          </View>
        )}

        <View className="h-6" />
      </ScrollView>
      <CustomerBottomNavigation />
    </SafeAreaView>
  );
}
