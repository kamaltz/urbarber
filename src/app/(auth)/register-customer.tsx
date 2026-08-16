import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { routes } from '@/constants/routes';
import { BrandText } from '@/components/ui/BrandText';
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
      const result = await registerGoogleAccount(selectedRole, acceptedTerms);
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
    router.push(routes.legal.terms);
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
          <View className="flex-1 px-6 pt-6 pb-8">
            <View className="flex-1">
              <BrandText size="md" className="mb-3" />

              <AuthHeaderBlock
                title={selectedRole === 'barber' ? 'Daftar Mitra Barber' : 'Daftar Pelanggan'}
                description={
                  selectedRole === 'barber'
                    ? 'Lengkapi data Anda untuk mendaftar sebagai Mitra Barber profesional.'
                    : 'Lengkapi data Anda untuk menikmati layanan pesan cukur rambut.'
                }
              />

              {/* Role Switcher Pill Tabs */}
              <View className="mt-6 flex-row rounded-2xl bg-slate-100 p-1.5 border border-slate-200">
                <Pressable
                  onPress={() => setSelectedRole('customer')}
                  disabled={isLoading}
                  className={`flex-1 py-2.5 rounded-xl items-center justify-center transition-all ${
                    selectedRole === 'customer'
                      ? 'bg-[#363062] shadow-xs'
                      : 'bg-transparent'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      selectedRole === 'customer' ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    Pelanggan
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSelectedRole('barber')}
                  disabled={isLoading}
                  className={`flex-1 py-2.5 rounded-xl items-center justify-center transition-all ${
                    selectedRole === 'barber'
                      ? 'bg-[#D2691E] shadow-xs'
                      : 'bg-transparent'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      selectedRole === 'barber' ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    Mitra Barber
                  </Text>
                </Pressable>
              </View>

              {/* Registration Form Fields */}
              <View className="mt-6 gap-4">
                <AppInput
                  label="Nama Lengkap"
                  placeholder="Nama lengkap Anda"
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

                {/* Terms Agreement Component */}
                <View className="mt-1 rounded-xl bg-slate-50 p-3 border border-slate-200/80">
                  <TermsAgreement
                    checked={acceptedTerms}
                    onToggle={setAcceptedTerms}
                    onTermsPress={handleTermsPress}
                    disabled={isLoading}
                  />
                </View>

                {successMessage ? (
                  <View className="rounded-xl bg-emerald-50 p-3.5 border border-emerald-200">
                    <Text className="text-center text-xs font-semibold text-emerald-800">
                      {successMessage}
                    </Text>
                  </View>
                ) : null}

                {error ? (
                  <View className="rounded-xl bg-rose-50 p-3.5 border border-rose-200">
                    <Text className="text-center text-xs font-medium text-rose-700">{error}</Text>
                  </View>
                ) : null}

                {/* Submit Action Button */}
                <AppButton
                  label={
                    selectedRole === 'customer'
                      ? 'Daftar Akun Pelanggan'
                      : 'Daftar Mitra Barber'
                  }
                  loading={isLoading}
                  disabled={!isFormValid}
                  onPress={handleRegister}
                  className={`h-[54px] rounded-xl active:opacity-90 ${
                    selectedRole === 'barber' ? 'bg-[#D2691E]' : 'bg-[#363062]'
                  }`}
                />

                {isGoogleAuthConfigured() ? (
                  <>
                    {/* Divider */}
                    <View className="flex-row items-center gap-3 my-1">
                      <View className="flex-1 h-px bg-slate-200" />
                      <Text className="text-xs text-slate-400 font-medium">atau daftar dengan</Text>
                      <View className="flex-1 h-px bg-slate-200" />
                    </View>

                    {/* Social Sign Up */}
                    <SocialLoginButton
                      provider="google"
                      onPress={handleGoogleSignUp}
                      disabled={isLoading || !acceptedTerms}
                    />
                  </>
                ) : null}
              </View>

              {/* Login Link */}
              <View className="mt-8 items-center pb-2">
                <Text className="text-xs text-slate-500 font-medium">Sudah memiliki akun URBarber?</Text>
                <Pressable onPress={handleLoginLink} disabled={isLoading} className="py-1">
                  <Text className="text-sm font-bold text-[#D2691E] underline">
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
