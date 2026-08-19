import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { AppButton } from '@/components/ui/AppButton';
import { Avatar } from '@/components/ui/Avatar';
import { SymbolIcon } from '@/components/ui/SymbolIcon';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useCustomerProfile } from '@/features/customer/hooks/use-customer-profile';
import { pickImage, storageService } from '@/features/services/storage.service';
import { firebaseAuth } from '@/lib/firebase';
import { router } from 'expo-router';
import { updateProfile as updateFirebaseProfile } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

const MENU_ITEMS = [
  { label: 'Informasi Akun', path: '/(customer)/profile/account', icon: 'person.fill', description: 'Lihat & edit data diri' },
  { label: 'Ubah Password', path: '/(customer)/profile/change-password', icon: 'lock', description: 'Keamanan akun & sandi' },
  { label: 'Bantuan & FAQ', path: '/(customer)/profile/help', icon: 'questionmark.circle', description: 'Pusat bantuan & panduan' },
  { label: 'Tentang Aplikasi', path: '/(customer)/profile/about', icon: 'info.circle', description: 'Versi & informasi URBarber' },
] as const;

export default function ProfileScreen() {
  const { user, logout, reloadUser } = useAuth();
  const customerId = user?.uid || '';

  const { profile, updateProfile, refresh } = useCustomerProfile(customerId);
  const [uploading, setUploading] = useState(false);
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const displayName = profile?.name || user?.displayName || 'Pelanggan URBarber';
  const avatarUrl =
    uploadedAvatarUrl ||
    profile?.profileImageUrl ||
    user?.photoURL ||
    firebaseAuth.currentUser?.photoURL;

  const handleAvatarPress = async () => {
    if (uploading) return;
    setStatusMessage(null);
    setIsError(false);

    try {
      const picked = await pickImage();
      if (!picked) return;

      setUploading(true);
      setStatusMessage('Memeriksa izin token...');

      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        throw new Error('Pengguna belum terautentikasi. Silakan login kembali.');
      }

      await currentUser.getIdToken(true);
      const tokenResult = await currentUser.getIdTokenResult();

      if (tokenResult.claims.role !== 'authenticated') {
        throw new Error(
          `Custom claim Firebase (role: authenticated) belum aktif untuk UID ${currentUser.uid}.\nJalankan: node scripts/assign-firebase-custom-claims.js --uid=${currentUser.uid} --app_role=customer`,
        );
      }

      if (tokenResult.claims.app_role !== 'customer') {
        throw new Error(
          `Claim app_role tidak valid: ${String(tokenResult.claims.app_role)}. Harus 'customer'.`,
        );
      }

      setStatusMessage('Mengunggah avatar ke Supabase Storage...');

      const uploadResult = await storageService.uploadAvatar(
        picked.uri,
        picked.mimeType ?? 'image/jpeg',
      );

      const cacheBustedUrl = `${uploadResult.profileImageUrl}?t=${Date.now()}`;
      setUploadedAvatarUrl(cacheBustedUrl);

      setStatusMessage('Menyimpan metadata profil...');

      // Update Firebase Auth user photoURL
      try {
        await updateFirebaseProfile(currentUser, {
          photoURL: cacheBustedUrl,
        });
      } catch (authErr: any) {
        if (__DEV__) {
          console.warn('[ProfileScreen] Update Firebase Auth photoURL error:', authErr?.message);
        }
      }

      // Update Firestore customer & user document with canonical avatar metadata fields
      const updateRes = await updateProfile({
        profileImageUrl: cacheBustedUrl,
        profileImagePath: uploadResult.profileImagePath,
      });

      if (updateRes && !updateRes.success) {
        throw new Error(updateRes.error?.message || 'Gagal menyimpan data profil ke Firestore.');
      }

      setStatusMessage('Foto profil berhasil diperbarui!');
      setIsError(false);

      void refresh();
      void reloadUser();
    } catch (err: any) {
      if (__DEV__) {
        console.warn('[ProfileScreen] Upload error:', err?.message || err);
      }
      setStatusMessage(err?.message || 'Gagal mengunggah foto profil.');
      setIsError(true);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <CustomerScreen title="Profil Saya" showTabs>
      {/* Profile Header Hero Card */}
      <View className="mb-6 items-center rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
        <Pressable
          onPress={handleAvatarPress}
          disabled={uploading}
          className="relative items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Ganti foto profil"
        >
          <View className="rounded-full p-1 border-2 border-[#D2691E]/30 bg-slate-50">
            <Avatar
              name={displayName}
              source={avatarUrl ? { uri: avatarUrl } : undefined}
              size="xl"
              status="online"
            />
          </View>

          {uploading ? (
            <View className="absolute inset-0 items-center justify-center rounded-full bg-black/40">
              <ActivityIndicator color="#ffffff" size="small" />
            </View>
          ) : (
            <View className="absolute bottom-1 right-1 rounded-full bg-[#D2691E] p-2 border-2 border-white shadow-sm">
              <Text className="text-xs text-white">📷</Text>
            </View>
          )}
        </Pressable>

        <Pressable onPress={handleAvatarPress} disabled={uploading} className="mt-3">
          <Text className="text-xs font-bold text-[#D2691E]">
            {uploading ? 'Mengunggah Foto...' : 'Ubah Foto Profil'}
          </Text>
        </Pressable>

        <Text className="mt-3 text-xl font-bold text-[#363062]">{displayName}</Text>
        <Text className="mt-0.5 text-xs text-slate-500">{user?.email || 'Akun Pelanggan Terverifikasi'}</Text>

        {statusMessage ? (
          <View
            className={`mt-4 rounded-xl p-3 w-full border ${
              isError ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <Text
              className={`text-center text-xs font-semibold ${
                isError ? 'text-rose-700' : 'text-emerald-800'
              }`}
            >
              {statusMessage}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Menu Cards List */}
      <View className="mb-6 rounded-2xl bg-white border border-slate-200/80 p-2 shadow-xs gap-1">
        {MENU_ITEMS.map((item) => (
          <Pressable
            key={item.path}
            onPress={() => router.push(item.path as any)}
            className="flex-row items-center justify-between p-3.5 rounded-xl active:bg-slate-50"
          >
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#EDEFFB]">
                <SymbolIcon name={item.icon} size={20} color="#363062" />
              </View>
              <View>
                <Text className="font-bold text-[#363062] text-sm">{item.label}</Text>
                <Text className="text-xs text-slate-400">{item.description}</Text>
              </View>
            </View>
            <Text className="text-lg text-slate-300 font-bold">›</Text>
          </Pressable>
        ))}
      </View>

      {/* Logout Action Button */}
      <View className="pb-6">
        <AppButton
          label="Keluar dari Akun"
          variant="destructive"
          onPress={handleLogout}
          className="h-[54px] rounded-xl"
        />
      </View>
    </CustomerScreen>
  );
}
