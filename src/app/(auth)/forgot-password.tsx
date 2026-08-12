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
          <View className="flex-1 px-6 pt-6 pb-6">
            {/* Top Navigation Back Button */}
            <Pressable
              onPress={handleBackToLogin}
              className="mb-4 flex-row items-center gap-1 rounded-full py-1 self-start active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Kembali ke Login"
            >
              <Text className="text-xl font-bold text-[#363062]">←</Text>
              <Text className="text-sm font-semibold text-[#363062]">Kembali</Text>
            </Pressable>

            <View className="flex-1">
              <AuthHeaderBlock
                title="Lupa Password?"
                description="Masukkan email terdaftar Anda. Kami akan mengirimkan instruksi untuk reset password."
              />

              <View className="mt-8 gap-5">
                {isSuccess ? (
                  <View className="rounded-2xl bg-emerald-50 p-5 border border-emerald-200 gap-2">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-lg">✉️</Text>
                      <Text className="font-bold text-emerald-900 text-sm">
                        Link Reset Terkirim!
                      </Text>
                    </View>
                    <Text className="text-xs leading-5 text-emerald-700">
                      Link reset password telah dikirim ke <Text className="font-bold">{email}</Text>. Silakan periksa inbox atau folder spam email Anda.
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
                      <View className="rounded-xl bg-rose-50 p-3 border border-rose-200">
                        <Text className="text-center text-xs font-medium text-rose-700">{error}</Text>
                      </View>
                    ) : null}

                    <AppButton
                      label="Kirim Link Reset"
                      loading={isLoading}
                      disabled={!isEmailValid}
                      onPress={handleReset}
                      className="h-[54px] rounded-xl bg-[#D2691E] active:bg-[#b85a19]"
                    />
                  </>
                )}
              </View>
            </View>

            <View className="mt-8 items-center">
              <Pressable onPress={handleBackToLogin} className="py-2">
                <Text className="text-sm font-semibold text-[#363062]">
                  Sudah ingat password? <Text className="text-[#D2691E] underline">Masuk di sini</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
