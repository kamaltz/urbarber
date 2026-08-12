import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AuthHeaderBlock } from '@/features/auth/components/AuthHeaderBlock';
import { SocialLoginButton } from '@/features/auth/components/SocialLoginButton';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { authService } from '@/features/auth/services/auth.service';
import {
  configureGoogleSignIn,
  isGoogleAuthConfigured,
  loginExistingGoogleAccount,
} from '@/features/auth/services/google-auth.service';
import { validateLoginForm } from '@/features/auth/validation/auth.validation';

export default function LoginScreen() {
  const { reloadUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    const validationErrors = validateLoginForm(email, password);

    if (validationErrors.length > 0) {
      setError(validationErrors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.loginWithEmail(email, password);

      if (response.success) {
        router.replace(
          response.emailVerified ? '/(customer)/home' : '/(auth)/authentication',
        );
      } else {
        setError(response.error?.message || 'Email atau password salah');
      }
    } catch (err: any) {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      configureGoogleSignIn();
      const result = await loginExistingGoogleAccount();
      if (result.success) {
        await reloadUser();
        router.replace('/');
      } else if (result.error.code !== 'USER_CANCELLED') {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError('Terjadi kesalahan saat masuk dengan Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  const handleRegister = () => {
    router.push({ pathname: '/(auth)/register-customer', params: { role: 'customer' } });
  };

  const handleRegisterBarber = () => {
    router.push({ pathname: '/(auth)/register-customer', params: { role: 'barber' } });
  };

  const isFormValid = email.includes('@') && password.length >= 6;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}>
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 px-6 pt-8 pb-6">
            <View className="flex-1">
              {/* Brand Header Icon Badge */}
              <View className="mb-6 flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#363062] shadow-sm">
                  <Text className="text-xl text-[#D2691E]">✂</Text>
                </View>
                <View className="rounded-full bg-[#EDEFFB] px-3 py-1">
                  <Text className="text-xs font-bold tracking-wider text-[#363062]">
                    URBARBER
                  </Text>
                </View>
              </View>

              <AuthHeaderBlock
                title="Masuk"
                description="Masukkan email dan password Anda untuk mengakses layanan URBarber."
              />

              <View className="mt-8 gap-5">
                <AppInput
                  label="Email"
                  placeholder="nama@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />

                <AppInput
                  label="Password"
                  placeholder="Masukkan password Anda"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isLoading}
                />

                {error ? (
                  <View className="rounded-xl bg-rose-50 p-3 border border-rose-200">
                    <Text className="text-center text-xs font-medium text-rose-700">{error}</Text>
                  </View>
                ) : null}

                <View className="items-end">
                  <Pressable onPress={handleForgotPassword} className="py-1">
                    <Text className="text-sm font-semibold text-[#D2691E]">
                      Lupa Password?
                    </Text>
                  </Pressable>
                </View>

                <AppButton
                  label="Masuk"
                  loading={isLoading}
                  disabled={!isFormValid}
                  onPress={handleLogin}
                  className="h-[54px] rounded-xl bg-[#D2691E] active:bg-[#b85a19]"
                />
              </View>
            </View>

            {/* Social & Registration Links */}
            <View className="mt-8 gap-6">
              {isGoogleAuthConfigured() ? (
                <>
                  <View className="flex-row items-center gap-3">
                    <View className="flex-1 h-[1px] bg-slate-200" />
                    <Text className="text-xs font-medium text-slate-400">atau</Text>
                    <View className="flex-1 h-[1px] bg-slate-200" />
                  </View>

                  <SocialLoginButton
                    provider="google"
                    onPress={handleGoogleLogin}
                    disabled={isLoading}
                  />
                </>
              ) : null}

              <View className="rounded-2xl bg-slate-50 p-4 border border-slate-200/60">
                <Text className="text-center text-xs text-slate-500 mb-3 font-medium">
                  Belum punya akun? Daftar sebagai:
                </Text>
                <View className="flex-row items-center justify-center gap-3">
                  <Pressable
                    onPress={handleRegister}
                    className="flex-1 items-center justify-center rounded-xl bg-white py-2.5 px-3 border border-slate-200 shadow-xs active:bg-slate-100"
                  >
                    <Text className="text-xs font-bold text-[#363062]">
                      Pelanggan
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleRegisterBarber}
                    className="flex-1 items-center justify-center rounded-xl bg-white py-2.5 px-3 border border-slate-200 shadow-xs active:bg-slate-100"
                  >
                    <Text className="text-xs font-bold text-[#D2691E]">
                      Mitra Barber
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
