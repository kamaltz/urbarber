import { AppButton } from '@/components/ui/AppButton';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { authService } from '@/features/auth/services/auth.service';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView, Text, View } from 'react-native';

export default function VerificationEmailScreen() {
  const { user, reloadUser, logout } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleCheckStatus = async () => {
    setIsRefreshing(true);
    setStatusMessage(null);
    setIsError(false);

    try {
      const isVerified = await reloadUser();
      if (isVerified) {
        setStatusMessage('Email Anda berhasil terverifikasi!');
        setIsError(false);
        // AuthProvider or Layout guard will route user to appropriate flow
      } else {
        setStatusMessage('Email belum terverifikasi. Silakan periksa inbox atau folder spam email Anda.');
        setIsError(true);
      }
    } catch (err: any) {
      setStatusMessage('Gagal memperbarui status verifikasi. Periksa koneksi internet.');
      setIsError(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleResendEmail = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    setStatusMessage(null);
    setIsError(false);

    try {
      const res = await authService.resendVerificationEmail();
      if (res.success) {
        if (res.emailVerified) {
          setStatusMessage('Email Anda sudah terverifikasi!');
          setIsError(false);
        } else {
          setStatusMessage('Email verifikasi baru berhasil dikirim. Silakan cek email Anda.');
          setIsError(false);
          setCooldown(60);
        }
      } else {
        setStatusMessage(res.error?.message || 'Gagal mengirim email verifikasi.');
        setIsError(true);
      }
    } catch (err: any) {
      setStatusMessage('Terjadi kesalahan saat mengirim email verifikasi.');
      setIsError(true);
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center px-6 py-8">
        <View className="items-center rounded-2xl bg-amber-50 p-6 border border-amber-200">
          <Text className="text-4xl mb-2">✉️</Text>
          <Text className="text-xl font-bold text-amber-900 text-center">Verifikasi Email Anda</Text>
          <Text className="mt-2 text-center text-sm text-slate-700">
            Kami telah mengirimkan tautan verifikasi ke email:
          </Text>
          <Text className="mt-1 font-bold text-slate-900 text-base text-center">{user?.email || 'email@anda.com'}</Text>
          <Text className="mt-3 text-xs text-slate-500 text-center">
            Silakan buka tautan di email Anda untuk mengaktifkan seluruh fitur akun URBarber.
          </Text>
        </View>

        {statusMessage ? (
          <View
            className={`mt-4 rounded-xl p-3 border ${
              isError ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <Text className={`text-center text-xs font-medium ${isError ? 'text-rose-700' : 'text-emerald-800'}`}>
              {statusMessage}
            </Text>
          </View>
        ) : null}

        <View className="mt-6 gap-3">
          <AppButton
            label={isRefreshing ? 'Memeriksa Status...' : 'Saya Sudah Verifikasi Email'}
            onPress={handleCheckStatus}
            loading={isRefreshing}
            className="h-[54px] rounded-xl bg-slate-900"
          />

          <AppButton
            label={
              cooldown > 0
                ? `Kirim Ulang Email (${cooldown}s)`
                : isResending
                ? 'Mengirim Email...'
                : 'Kirim Ulang Email Verifikasi'
            }
            onPress={handleResendEmail}
            disabled={cooldown > 0 || isResending}
            variant="secondary"
            className="h-[54px] rounded-xl"
          />

          <AppButton
            label="Keluar & Masuk dengan Akun Lain"
            onPress={handleLogout}
            variant="secondary"
            className="h-[54px] rounded-xl mt-2"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
