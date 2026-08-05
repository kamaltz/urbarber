import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useCustomerProfile } from '@/features/customer/hooks/use-customer-profile';
import { pickImage, storageService } from '@/features/services/storage.service';
import { firebaseAuth } from '@/lib/firebase';
import { updateProfile as updateFirebaseProfile } from 'firebase/auth';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

const items = [
  ['Akun', '/(customer)/profile/account'],
  ['Ubah Password', '/(customer)/profile/change-password'],
  ['Bantuan', '/(customer)/profile/help'],
  ['Tentang', '/(customer)/profile/about'],
] as const;

export default function ProfileScreen() {
  const { user, logout, reloadUser } = useAuth();
  const customerId = user?.uid || '';

  const { profile, updateProfile, refresh } = useCustomerProfile(customerId);
  const [uploading, setUploading] = useState(false);
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const displayName = profile?.name || user?.displayName || 'Customer URBarber';
  const avatarUrl =
    uploadedAvatarUrl ||
    profile?.profileImageUrl ||
    (profile as any)?.profileImage ||
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
      if (!currentUser) throw new Error('Pengguna belum login.');

      const tokenResult = await currentUser.getIdTokenResult(true);
      const userRole = tokenResult.claims.role;

      if (userRole !== 'authenticated') {
        throw new Error(
          `Custom claim Firebase (role: authenticated) belum aktif untuk UID ${currentUser.uid}.\nJalankan perintah:\nnode scripts/assign-firebase-custom-claims.js --uid=${currentUser.uid} --app_role=customer`,
        );
      }

      setStatusMessage('Mengunggah foto ke Supabase Storage...');

      // Upload image to fixed single profile path in public-media with upsert=true (overwrites existing file)
      const uploadResult = await storageService.uploadPublicFile(
        picked.uri,
        'avatars',
        {
          filename: 'avatar',
          contentType: picked.mimeType ?? 'image/jpeg',
          upsert: true,
        },
      );

      // Append timestamp query parameter to bypass browser/client image cache
      const cacheBustedUrl = `${uploadResult.publicUrl}?t=${Date.now()}`;

      // Immediately point avatar URL on screen to the new Supabase URL
      setUploadedAvatarUrl(cacheBustedUrl);
      setStatusMessage('Memperbarui profil...');

      // 1. Persist photoURL natively to Firebase Auth User Account
      try {
        await updateFirebaseProfile(currentUser, {
          photoURL: cacheBustedUrl,
        });
      } catch (authErr) {
        console.warn('Unable to update Firebase Auth user photoURL:', authErr);
      }

      // 2. Persist profileImageUrl and profileImagePath to Firestore
      const updateRes = await updateProfile({
        profileImageUrl: cacheBustedUrl,
        profileImagePath: uploadResult.path,
      });

      if (updateRes && !updateRes.success) {
        throw new Error(updateRes.error?.message || 'Gagal memperbarui data profil di Firestore.');
      }

      setStatusMessage('Avatar berhasil diperbarui!');
      setIsError(false);

      // Background refresh
      void refresh();
      void reloadUser();
    } catch (err: any) {
      console.error('Upload avatar error:', err);
      setStatusMessage(err?.message || 'Gagal mengunggah avatar.');
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
    <CustomerScreen title="Profil" showTabs>
      <View className="mb-6 items-center rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <Pressable
          onPress={handleAvatarPress}
          disabled={uploading}
          className="relative items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Ganti foto profil"
        >
          <Avatar
            name={displayName}
            source={avatarUrl ? { uri: avatarUrl } : undefined}
            size="xl"
            status="online"
          />

          {uploading ? (
            <View className="absolute inset-0 items-center justify-center rounded-full bg-black/40">
              <ActivityIndicator color="#ffffff" size="small" />
            </View>
          ) : (
            <View className="absolute bottom-0 right-0 rounded-full bg-[#D2691E] p-1.5 border-2 border-white shadow-sm">
              <Text className="text-xs text-white">📷</Text>
            </View>
          )}
        </Pressable>

        <Pressable onPress={handleAvatarPress} disabled={uploading} className="mt-2">
          <Text className="text-xs font-semibold text-[#D2691E] underline">
            {uploading ? 'Mengunggah...' : 'Ganti Foto Profil'}
          </Text>
        </Pressable>

        <Text className="mt-3 text-xl font-bold text-slate-900">{displayName}</Text>
        <Text className="mt-1 text-sm text-slate-500">{user?.email || 'Lengkapi informasi akun Anda'}</Text>

        {statusMessage ? (
          <View
            className={`mt-4 rounded-xl p-3 w-full border ${
              isError ? 'bg-[#FFF5F5] border-[#FEB2B2]' : 'bg-[#F0FFF4] border-[#9AE6B4]'
            }`}
          >
            <Text
              className={`text-center text-xs font-medium ${
                isError ? 'text-[#9B2C2C]' : 'text-[#22543D]'
              }`}
            >
              {statusMessage}
            </Text>
          </View>
        ) : null}
      </View>

      {items.map(([label, path]) => (
        <AppCard key={path} onPress={() => router.push(path)} className="mb-3 flex-row items-center justify-between p-4">
          <Text className="font-semibold text-slate-900">{label}</Text>
          <Text className="text-xl text-slate-400">›</Text>
        </AppCard>
      ))}

      <View className="mt-6 pb-4">
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
