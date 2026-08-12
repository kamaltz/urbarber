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
                  className="h-[54px] bg-slate-900 rounded-lg"
                />

                <Pressable onPress={handleForgotPassword}>
                  <Text className="text-center text-[#D2691E] font-semibold text-sm">
                    Lupa Password?
                  </Text>
                </Pressable>

                <View className="flex-row items-center justify-between mt-2">
                  <Pressable onPress={handleRegister}>
                    <Text className="text-[#D2691E] font-semibold text-sm">
                      Daftar Pelanggan
                    </Text>
                  </Pressable>

                  <Text className="text-slate-300">|</Text>

                  <Pressable onPress={handleRegisterBarber}>
                    <Text className="text-[#D2691E] font-semibold text-sm">
                      Daftar Mitra Barber
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {isGoogleAuthConfigured() ? (
              <View className="mt-8 mb-8">
                <SocialLoginButton
                  provider="google"
                  onPress={handleGoogleLogin}
                  disabled={isLoading}
                />
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
