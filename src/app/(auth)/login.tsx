import { router } from 'expo-router';
import { useState } from 'react';
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
import { AppInput } from '@/components/ui/AppInput';
import { AuthHeaderBlock } from '@/features/auth/components/AuthHeaderBlock';
import { SocialLoginButton } from '@/features/auth/components/SocialLoginButton';
import { authService } from '@/features/auth/services/auth.service';
import { validateLoginForm } from '@/features/auth/validation/auth.validation';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    const validationErrors = validateLoginForm(email);

    if (validationErrors.length > 0) {
      setError(validationErrors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.requestOtp(email);

      if (response.success) {
        router.push({
          pathname: '/(auth)/otp-verification',
          params: { identifier: email, purpose: 'login' },
        });
      } else {
        setError(response.error?.message || 'Gagal mengirim kode OTP');
      }
    } catch (err) {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading('google');
    try {
      const response = await authService.loginWithGoogle();

      if (response.success && response.user) {
        // In real implementation with Firebase, this would create/link account
        // For now, navigate directly to home
        router.replace('/(customer)/home');
      } else {
        setError(response.error?.message || 'Gagal login dengan Google');
      }
    } catch (err) {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  const handleRegister = () => {
    router.push('/(auth)/register-customer');
  };

  const isEmailValid = email.includes('@');
  const isSocialLoading = socialLoading !== null;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}>
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 px-[18px] pt-14">
            <View className="flex-1">
              <AuthHeaderBlock
                title="Masuk"
                description="Masukkan email Anda untuk memulai"
              />

              <View className="mt-12 gap-6">
                <AppInput
                  label="Email"
                  placeholder="nama@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading && !isSocialLoading}
                />

                {error ? (
                  <Text className="text-center text-sm text-rose-600">{error}</Text>
                ) : null}

                <AppButton
                  label="Masuk"
                  loading={isLoading}
                  disabled={!isEmailValid || isSocialLoading}
                  onPress={handleLogin}
                  className="h-[54px] rounded-lg"
                />

                {/* Divider */}
                <View className="flex-row items-center gap-3">
                  <View className="flex-1 h-px bg-slate-300" />
                  <Text className="text-sm text-slate-600">atau</Text>
                  <View className="flex-1 h-px bg-slate-300" />
                </View>

                {/* Social Login */}
                <View className="gap-3">
                  <SocialLoginButton
                    provider="google"
                    onPress={handleGoogleLogin}
                    loading={socialLoading === 'google'}
                    disabled={isLoading || (socialLoading !== null && socialLoading !== 'google')}
                  />
                </View>
              </View>

              <View className="mt-8 gap-4">
                <View className="items-center">
                  <Pressable onPress={handleForgotPassword} disabled={isLoading || isSocialLoading}>
                    <Text className="text-sm font-semibold text-[#D2691E] underline">
                      Lupa password?
                    </Text>
                  </Pressable>
                </View>

                <View className="flex-row items-center justify-center gap-2">
                  <Text className="text-sm text-slate-600">Belum punya akun?</Text>
                  <Pressable onPress={handleRegister} disabled={isLoading || isSocialLoading}>
                    <Text className="text-sm font-semibold text-[#D2691E] underline">
                      Daftar
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
