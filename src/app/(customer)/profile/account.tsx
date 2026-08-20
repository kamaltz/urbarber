import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useCustomerProfile } from '@/features/customer/hooks/use-customer-profile';
import { pickImage, storageService } from '@/features/services/storage.service';
import { firebaseAuth } from '@/lib/firebase';
import { updateProfile as updateFirebaseProfile } from 'firebase/auth';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function AccountScreen() {
  const { user, reloadUser } = useAuth();
  const customerId = user?.uid || '';

  const { profile, loading, updating, updateProfile, refresh } = useCustomerProfile(customerId);

  const [name, setName] = useState(profile?.name || user?.displayName || '');
  const [phone, setPhone] = useState(profile?.phone || user?.phoneNumber || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    profile?.profileImageUrl || user?.photoURL || undefined
  );
  const [avatarPath, setAvatarPath] = useState<string | undefined>(
    profile?.profileImagePath || undefined
  );

  // profile resolves asynchronously after mount (useCustomerProfile's getDoc),
  // so the useState initializers above capture stale/blank values on first
  // render. Resync local form state once the canonical profile arrives --
  // done here (adjusting state during render, comparing against the last
  // profile reference seen) rather than in a useEffect, per React's own
  // guidance for "resetting/deriving state when a value changes": an Effect
  // would call setState synchronously on its first run, causing an extra
  // render pass; this bails out in the same render instead.
  const [lastSyncedProfile, setLastSyncedProfile] = useState<typeof profile>(null);
  if (profile && profile !== lastSyncedProfile) {
    setLastSyncedProfile(profile);
    setName(profile.name || user?.displayName || '');
    setPhone(profile.phone || user?.phoneNumber || '');
    setLocation(profile.location || '');
    setAvatarUrl(profile.profileImageUrl || user?.photoURL || undefined);
    setAvatarPath(profile.profileImagePath || undefined);
  }

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAvatarUpload = async () => {
    if (uploadingAvatar) return;
    setFormError(null);
    setSuccessMsg(null);

    try {
      const picked = await pickImage();
      if (!picked) return;

      setUploadingAvatar(true);
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        throw new Error('Pengguna tidak terautentikasi.');
      }

      await currentUser.getIdToken(true);
      const uploadResult = await storageService.uploadAvatar(
        picked.uri,
        picked.mimeType ?? 'image/jpeg'
      );

      const cacheBustedUrl = `${uploadResult.profileImageUrl}?t=${Date.now()}`;
      setAvatarUrl(cacheBustedUrl);
      setAvatarPath(uploadResult.profileImagePath);

      try {
        await updateFirebaseProfile(currentUser, { photoURL: cacheBustedUrl });
      } catch (authErr) {
        if (__DEV__) {
          console.warn('[AccountScreen] Update Firebase Auth photoURL error');
        }
      }

      setSuccessMsg('Foto profil baru berhasil diunggah!');
    } catch (err: any) {
      setFormError(err?.message || 'Gagal mengunggah foto profil.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async () => {
    setFormError(null);
    setSuccessMsg(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedLocation = location.trim();

    if (!trimmedName) {
      setFormError('Nama lengkap wajib diisi.');
      return;
    }

    if (trimmedName.length < 2) {
      setFormError('Nama lengkap minimal 2 karakter.');
      return;
    }

    if (trimmedPhone && (trimmedPhone.length < 9 || trimmedPhone.length > 15)) {
      setFormError('Nomor telepon harus antara 9-15 digit.');
      return;
    }

    const res = await updateProfile({
      name: trimmedName,
      phone: trimmedPhone,
      location: trimmedLocation,
      profileImageUrl: avatarUrl,
      profileImagePath: avatarPath,
    });

    if (res && res.success) {
      setSuccessMsg('Informasi akun berhasil diperbarui!');
      void refresh();
      void reloadUser();
    } else {
      setFormError(res?.error?.message || 'Gagal memperbarui informasi akun.');
    }
  };

  if (loading) {
    return (
      <CustomerScreen title="Edit Akun">
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#D2691E" />
        </View>
      </CustomerScreen>
    );
  }

  return (
    <CustomerScreen title="Edit Akun" description="Kelola nama, telepon, alamat, dan foto profil Anda." scroll={false}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Avatar Upload Card */}
        <AppCard className="mb-4 p-5 items-center">
          <Pressable
            onPress={handleAvatarUpload}
            disabled={uploadingAvatar}
            className="relative items-center justify-center"
          >
            <Avatar
              name={name || 'Pelanggan'}
              source={avatarUrl ? { uri: avatarUrl } : undefined}
              size="xl"
            />
            {uploadingAvatar ? (
              <View className="absolute inset-0 items-center justify-center rounded-full bg-black/40">
                <ActivityIndicator color="#FFFFFF" size="small" />
              </View>
            ) : (
              <View className="absolute bottom-0 right-0 rounded-full bg-[#D2691E] p-1.5 border-2 border-white">
                <Text className="text-xs text-white">📷</Text>
              </View>
            )}
          </Pressable>

          <Pressable onPress={handleAvatarUpload} disabled={uploadingAvatar} className="mt-3">
            <Text className="text-xs font-bold text-[#D2691E] underline">
              {uploadingAvatar ? 'Mengunggah Foto...' : 'Ganti Foto Profil'}
            </Text>
          </Pressable>
        </AppCard>

        {/* Read-Only Identity Card */}
        <AppCard className="mb-4 p-4 bg-slate-50 border-slate-200">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Informasi Terkunci
          </Text>
          <View className="mb-2">
            <Text className="text-xs text-slate-500">Email Utama (Login)</Text>
            <Text className="text-sm font-semibold text-slate-700">{user?.email}</Text>
          </View>
          <View>
            <Text className="text-xs text-slate-500">User ID (UID)</Text>
            <Text className="text-xs font-mono text-slate-600">{customerId}</Text>
          </View>
        </AppCard>

        {/* Editable Fields Form */}
        <View className="gap-4 mb-6">
          <View>
            <Text className="text-xs font-bold text-slate-700 mb-1">Nama Lengkap *</Text>
            <TextInput
              className="rounded-xl bg-white p-3.5 border border-slate-200 text-sm font-medium text-slate-900"
              value={name}
              onChangeText={setName}
              placeholder="Masukkan nama lengkap"
              placeholderTextColor="#94A3B8"
              maxLength={60}
            />
          </View>

          <View>
            <Text className="text-xs font-bold text-slate-700 mb-1">Nomor Telepon / WhatsApp</Text>
            <TextInput
              className="rounded-xl bg-white p-3.5 border border-slate-200 text-sm font-medium text-slate-900"
              value={phone}
              onChangeText={setPhone}
              placeholder="Contoh: 08123456789"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>

          <View>
            <Text className="text-xs font-bold text-slate-700 mb-1">Alamat Utama (Garut)</Text>
            <TextInput
              className="rounded-xl bg-white p-3.5 border border-slate-200 text-sm font-medium text-slate-900"
              value={location}
              onChangeText={setLocation}
              placeholder="Contoh: Jl. Ahmad Yani No. 12, Tarogong Kaler, Garut"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={2}
              maxLength={150}
            />
          </View>

          {/* Feedback Messages */}
          {formError ? (
            <View className="rounded-xl bg-red-50 p-3 border border-red-200">
              <Text className="text-xs text-red-700 text-center font-medium">{formError}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View className="rounded-xl bg-emerald-50 p-3 border border-emerald-200">
              <Text className="text-xs text-emerald-700 text-center font-medium">{successMsg}</Text>
            </View>
          ) : null}

          {/* Submit Button */}
          <AppButton
            label={updating ? 'Menyimpan...' : 'Simpan Perubahan'}
            onPress={handleSubmit}
            variant="primary"
            disabled={updating || uploadingAvatar}
          />
        </View>
      </ScrollView>
    </CustomerScreen>
  );
}
