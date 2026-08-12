import { useState } from 'react';
import { router } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AuthHeaderBlock } from '@/features/auth/components/AuthHeaderBlock';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { authService } from '@/features/auth/services/auth.service';

export default function AuthenticationStatusScreen() {
  const { user, role, reloadUser, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const targetHomeRoute =
    role === 'barber'
      ? '/(barber)/home'
      : role === 'admin'
        ? '/(auth)/admin-web-only'
        : '/(customer)/home';

  const handleCheckStatus = async () => {
    setChecking(true);
    setMessage('');
    setError('');
    try {
      const verified = await reloadUser();
      if (verified) {
        setMessage('Email berhasil diverifikasi. Mengalihkan ke beranda...');
        router.replace(targetHomeRoute);
      } else {
        setError('Email belum terverifikasi. Buka link terbaru di email, lalu coba lagi.');
      }
    } catch {
      setError('Gagal memperbarui status. Coba lagi.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setMessage('');
    setError('');
    try {
      const res = await authService.resendVerificationEmail();
      if (res.success) {
        if (res.emailVerified) {
          await reloadUser();
          router.replace(targetHomeRoute);
        } else {
          setMessage('Email verifikasi baru telah dikirim. Periksa Inbox, Spam, dan Promosi.');
        }
      } else {
        setError(res.error?.message || 'Gagal mengirim ulang email verifikasi.');
      }
    } catch {
      setError('Terjadi kesalahan saat mengirim email verifikasi.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 px-6 pt-8 pb-8 justify-between">
            <View>
              {/* Brand Badge */}
              <View className="mb-6 flex-row items-center gap-2">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#363062]">
                  <Text className="text-lg text-[#D2691E]">✉️</Text>
                </View>
                <View className="rounded-full bg-[#EDEFFB] px-3 py-1">
                  <Text className="text-xs font-bold text-[#363062]">
                    VERIFIKASI AKUN
                  </Text>
                </View>
              </View>

              <AuthHeaderBlock
                title="Verifikasi Email"
                description="Buka email Anda dan klik link verifikasi untuk melanjutkan."
              />

              <View className="mt-8 rounded-2xl bg-slate-50 p-5 border border-slate-200/80 gap-3 shadow-xs">
                <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Email Terdaftar:
                </Text>
                <Text className="text-base font-bold text-[#363062]">
                  {user?.email || '-'}
                </Text>
                <Text className="text-xs leading-5 text-slate-500 mt-1">
                  Kami telah mengirimkan link verifikasi ke email di atas. Silakan periksa inbox atau folder spam Anda.
                </Text>
              </View>

              {message ? (
                <View className="mt-4 rounded-xl bg-emerald-50 p-4 border border-emerald-200">
                  <Text className="text-center text-xs font-medium text-emerald-800">
                    {message}
                  </Text>
                </View>
              ) : null}

              {error ? (
                <View className="mt-4 rounded-xl bg-rose-50 p-4 border border-rose-200">
                  <Text className="text-center text-xs font-medium text-rose-800">
                    {error}
                  </Text>
                </View>
              ) : null}

              <View className="mt-8 gap-4">
                <AppButton
                  label="Cek Status Verifikasi"
                  loading={checking}
                  disabled={resending}
                  onPress={handleCheckStatus}
                  className="h-[54px] rounded-xl bg-[#D2691E] active:bg-[#b85a19]"
                />

                <AppButton
                  label="Kirim Ulang Email Verifikasi"
                  variant="secondary"
                  loading={resending}
                  disabled={checking}
                  onPress={handleResend}
                  className="h-[54px] rounded-xl bg-slate-100 border border-slate-200 active:bg-slate-200"
                />
              </View>
            </View>

            <View className="items-center pt-8">
              <Pressable onPress={logout} disabled={checking || resending} className="py-2">
                <Text className="text-sm font-semibold text-rose-600 underline">
                  Keluar dari Akun
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
