import { router } from 'expo-router';
import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    Text,
    View,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AuthHeaderBlock } from '@/features/auth/components/AuthHeaderBlock';
import { authService } from '@/features/auth/services/auth.service';
import { validateForgotPasswordForm } from '@/features/auth/validation/auth.validation';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    setError('');
    setIsSuccess(false);
    const validationErrors = validateForgotPasswordForm(email);

    if (validationErrors.length > 0) {
      setError(validationErrors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.requestPasswordReset(email);

      if (response.success) {
        setIsSuccess(true);
      } else {
        setError(response.error?.message || 'Gagal mengirim email reset password');
      }
    } catch (err) {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  const isEmailValid = email.includes('@');

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
                title="Lupa Password?"
                description="Masukkan email Anda untuk reset password"
              />

                            <View className="mt-12 gap-6">
                {isSuccess ? (
                  <View className="rounded-xl bg-emerald-50 p-4 border border-emerald-200">
                    <Text className="text-center font-semibold text-emerald-800">
                      Link reset password telah dikirim ke email Anda.
                    </Text>
                    <Text className="mt-1 text-center text-xs text-emerald-700">
                      Silakan periksa kotak masuk atau folder spam email Anda.
                    </Text>
                  </View>
                ) : (
                  <>
                    <AppInput
                      label="Email"
                      placeholder="email@example.com"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                    />

                    {error ? (
                      <Text className="text-center text-sm text-rose-600">{error}</Text>
                    ) : null}

                    <AppButton
                      label="Kirim Link Reset"
                      loading={isLoading}
                      disabled={!isEmailValid}
                      onPress={handleReset}
                      className="h-[54px] rounded-lg"
                    />
                  </>
                )}
              </View>

              <View className="mt-8 items-center">
                <Text
                  onPress={handleBackToLogin}
                  className="text-sm font-semibold text-[#D2691E] underline">
                  Kembali ke login
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
