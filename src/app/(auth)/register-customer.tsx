import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AuthHeaderBlock } from '@/features/auth/components/AuthHeaderBlock';
import { SocialLoginButton } from '@/features/auth/components/SocialLoginButton';
import { TermsAgreement } from '@/features/auth/components/TermsAgreement';
import { authService } from '@/features/auth/services/auth.service';
import {
  configureGoogleSignIn,
  isGoogleAuthConfigured,
  registerGoogleAccount,
} from '@/features/auth/services/google-auth.service';
import { validateRegisterForm } from '@/features/auth/validation/auth.validation';
import type { PublicRegistrationRole } from '@/types/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/hooks/use-auth';

export default function RegisterCustomerScreen() {
  const { reloadUser } = useAuth();
  const { role: initialRole } = useLocalSearchParams<{ role?: string }>();
  const [selectedRole, setSelectedRole] = useState<PublicRegistrationRole>(
    initialRole === 'barber' ? 'barber' : 'customer',
  );

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleRegister = async () => {
    setError('');
    setSuccessMessage('');
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
      const response =
        selectedRole === 'customer'
          ? await authService.registerCustomer({
              fullName: fullName.trim(),
              email: email.trim(),
              phoneNumber: phoneNumber.trim(),
              password,
              acceptedTerms,
            })
          : await authService.registerBarber({
              fullName: fullName.trim(),
              email: email.trim(),
              phoneNumber: phoneNumber.trim(),
              password,
              acceptedTerms,
            });

      if (response.success) {
        setSuccessMessage('🎉 Registrasi berhasil! Email verifikasi telah dikirim. Mengalihkan...');
        setTimeout(() => {
          router.replace('/(auth)/verification-email' as any);
        }, 1200);
      } else {
        setError(response.error?.message || 'Gagal melakukan pendaftaran.');
      }
    } catch (err: any) {
      setError('Terjadi kesalahan saat pendaftaran. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setSuccessMessage('');

    if (!acceptedTerms) {
      setError('Anda harus menyetujui syarat dan ketentuan sebelum mendaftar.');
      return;
    }

    setIsLoading(true);
    try {
      configureGoogleSignIn();
      const result = await registerGoogleAccount(selectedRole);
      if (result.success) {
        await reloadUser();
        setSuccessMessage('🎉 Berhasil mendaftar dengan Akun Google! Mengalihkan...');
        setTimeout(() => {
          router.replace('/');
        }, 1000);
      } else if (result.error.code !== 'USER_CANCELLED') {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError('Terjadi kesalahan saat mendaftar dengan Google.');
    } finally {
      setIsLoading(false);
    }
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
          <View className="flex-1 px-[18px] pt-10 pb-6">
            <View>
              <AuthHeaderBlock
                title={selectedRole === 'barber' ? 'Daftar Mitra Barber' : 'Daftar Akun Pelanggan'}
                description={
                  selectedRole === 'barber'
                    ? 'Lengkapi data Anda untuk mendaftar sebagai Mitra Barber URBarber'
                    : 'Lengkapi data Anda untuk memesan layanan cukur rambut'
                }
              />

              <View className="mt-6 gap-4">
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

                {successMessage ? (
                  <View className="rounded-xl bg-emerald-50 p-3 border border-emerald-200">
                    <Text className="text-center text-xs font-semibold text-emerald-800">
                      {successMessage}
                    </Text>
                  </View>
                ) : null}

                {error ? (
                  <Text className="text-center text-sm text-rose-600 font-medium">{error}</Text>
                ) : null}

                <AppButton
                  label={
                    selectedRole === 'customer'
                      ? 'Daftar Sebagai Pelanggan'
                      : 'Daftar Sebagai Mitra Barber'
                  }
                  loading={isLoading}
                  disabled={!isFormValid}
                  onPress={handleRegister}
                  className={`h-[54px] rounded-lg ${
                    selectedRole === 'barber' ? 'bg-[#D2691E]' : 'bg-slate-900'
                  }`}
                />

                {isGoogleAuthConfigured() ? (
                  <>
                    {/* Divider */}
                    <View className="flex-row items-center gap-3">
                      <View className="flex-1 h-px bg-slate-300" />
                      <Text className="text-sm text-slate-600">atau</Text>
                      <View className="flex-1 h-px bg-slate-300" />
                    </View>

                    {/* Social SignUp */}
                    <View className="gap-3">
                      <SocialLoginButton
                        provider="google"
                        onPress={handleGoogleSignUp}
                        disabled={isLoading || !acceptedTerms}
                      />
                    </View>
                  </>
                ) : null}
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
