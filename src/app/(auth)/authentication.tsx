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
        ? '/(admin)/dashboard'
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
          <View className="flex-1 px-[18px] pt-14 pb-8 justify-between">
            <View>
              <AuthHeaderBlock
                title="Verifikasi Email"
                description="Verifikasi email Anda untuk melanjutkan"
              />

              <View className="mt-8 rounded-2xl bg-slate-50 p-5 border border-slate-200 gap-3">
                <Text className="text-sm text-slate-600">
                  Email terdaftar:
                </Text>
                <Text className="text-base font-bold text-slate-900">
                  {user?.email || '-'}
                </Text>
                <Text className="text-xs leading-5 text-slate-500 mt-1">
                  Kami telah mengirimkan link verifikasi ke email di atas. Silakan buka email Anda dan klik link verifikasi, lalu tekan tombol di bawah ini.
                </Text>
              </View>

              {message ? (
                <View className="mt-4 rounded-xl bg-emerald-50 p-4 border border-emerald-200">
                  <Text className="text-center text-sm font-medium text-emerald-800">
                    {message}
                  </Text>
                </View>
              ) : null}

              {error ? (
                <View className="mt-4 rounded-xl bg-rose-50 p-4 border border-rose-200">
                  <Text className="text-center text-sm font-medium text-rose-800">
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
                  className="h-[54px] rounded-lg"
                />

                <AppButton
                  label="Kirim Ulang Email Verifikasi"
                  variant="secondary"
                  loading={resending}
                  disabled={checking}
                  onPress={handleResend}
                  className="h-[54px] rounded-lg"
                />
              </View>
            </View>

            <View className="items-center pt-6">
              <Pressable onPress={logout} disabled={checking || resending}>
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
