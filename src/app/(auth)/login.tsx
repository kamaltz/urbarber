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
    } catch (err) {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('Google Login memerlukan konfigurasi native.');
  };

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  const handleRegister = () => {
    router.push('/(auth)/register-customer');
  };

  const isFormValid = email.includes('@') && password.length >= 6;

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
                  <Text className="text-center text-sm text-rose-600">{error}</Text>
                ) : null}

                <AppButton
                  label="Masuk"
                  loading={isLoading}
                  disabled={!isFormValid}
                  onPress={handleLogin}
                  className="h-[54px] rounded-lg"
                />

                {/* Divider */}
                <View className="flex-row items-center gap-3">
                  <View className="flex-1 h-px bg-slate-300" />
                  <Text className="text-sm text-slate-600">atau</Text>
                  <View className="flex-1 h-px bg-slate-300" />
                </View>

                {/* Social Login (Disabled until native configuration) */}
                <View className="gap-3">
                  <SocialLoginButton
                    provider="google"
                    onPress={handleGoogleLogin}
                    disabled={true}
                  />
                </View>
              </View>

              <View className="mt-8 gap-4">
                <View className="items-center">
                  <Pressable onPress={handleForgotPassword} disabled={isLoading}>
                    <Text className="text-sm font-semibold text-[#D2691E] underline">
                      Lupa password?
                    </Text>
                  </Pressable>
                </View>

                <View className="flex-row items-center justify-center gap-2">
                  <Text className="text-sm text-slate-600">Belum punya akun?</Text>
                  <Pressable onPress={handleRegister} disabled={isLoading}>
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
