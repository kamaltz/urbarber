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
import { TermsAgreement } from '@/features/auth/components/TermsAgreement';
import { authService } from '@/features/auth/services/auth.service';
import { validateRegisterForm } from '@/features/auth/validation/auth.validation';

export default function RegisterCustomerScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');
    const validationErrors = validateRegisterForm(
      fullName,
      email,
      phoneNumber,
      password,
      confirmPassword,
      acceptedTerms,
    );

    if (validationErrors.length > 0) {
      setError(validationErrors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.registerCustomer({
        fullName,
        email,
        phoneNumber,
        password,
        acceptedTerms,
      });

            if (response.success) {
        router.push('/(auth)/authentication' as any);
      } else {
        setError(response.error?.message || 'Gagal mendaftar');
      }
    } catch (err) {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('Google Sign-Up memerlukan konfigurasi native.');
  };

  const handleLoginLink = () => {
    router.push('/(auth)/login');
  };

  const handleTermsPress = () => {
    router.push('/(customer)/terms-condition');
  };

    const isFormValid =
    fullName.trim().length > 0 &&
    email.includes('@') &&
    phoneNumber.trim().length > 0 &&
    password.length >= 6 &&
    password === confirmPassword &&
    acceptedTerms;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}>
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 px-[18px] pt-14 pb-6">
            <View>
              <AuthHeaderBlock
                title="Daftar"
                description="Buat akun pelanggan Anda"
              />

              <View className="mt-12 gap-4">
                <AppInput
                  label="Nama Lengkap"
                  placeholder="Nama Anda"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!isLoading}
                />

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

                <AppInput
                  label="Nomor Telepon"
                  placeholder="+62 812 3456 7890"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  editable={!isLoading}
                />

                <AppInput
                  label="Password"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isLoading}
                />

                <AppInput
                  label="Konfirmasi Password"
                  placeholder="Ulangi password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  editable={!isLoading}
                />

                <View className="mt-2">
                  <TermsAgreement
                    checked={acceptedTerms}
                    onToggle={setAcceptedTerms}
                    onTermsPress={handleTermsPress}
                    disabled={isLoading}
                  />
                </View>

                {error ? (
                  <Text className="text-center text-sm text-rose-600">{error}</Text>
                ) : null}

                <AppButton
                  label="Daftar"
                  loading={isLoading}
                  disabled={!isFormValid}
                  onPress={handleRegister}
                  className="h-[54px] rounded-lg"
                />

                {/* Divider */}
                <View className="flex-row items-center gap-3">
                  <View className="flex-1 h-px bg-slate-300" />
                  <Text className="text-sm text-slate-600">atau</Text>
                  <View className="flex-1 h-px bg-slate-300" />
                </View>

                {/* Social SignUp (Disabled until native configuration) */}
                <View className="gap-3">
                  <SocialLoginButton
                    provider="google"
                    onPress={handleGoogleSignUp}
                    disabled={true}
                  />
                </View>
              </View>

              <View className="mt-6 items-center">
                <Text className="text-sm text-slate-600">Sudah punya akun?</Text>
                <Pressable onPress={handleLoginLink} disabled={isLoading}>
                  <Text className="mt-1 text-sm font-semibold text-[#D2691E] underline">
                    Masuk di sini
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
