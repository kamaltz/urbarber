import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AuthHeaderBlock } from '@/features/auth/components/AuthHeaderBlock';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { authService } from '@/features/auth/services/auth.service';

const OTP_LENGTH = 4;
const RESEND_COOLDOWN_SECONDS = 30;

type VerifyState = 'idle' | 'loading' | 'error' | 'success';

type OtpInputGroupProps = {
  value: string;
  length?: number;
  disabled?: boolean;
  hasError?: boolean;
  onChange: (next: string) => void;
};

function OtpInputGroup({
  value,
  length = OTP_LENGTH,
  disabled = false,
  hasError = false,
  onChange,
}: OtpInputGroupProps) {
  const refs = useRef<(TextInput | null)[]>([]);
  const chars = useMemo(() => Array.from({ length }, (_, i) => value[i] ?? ''), [length, value]);

  const setCharAt = (index: number, char: string) => {
    const numericChar = char.replace(/\D/g, '').slice(-1);
    const nextArray = [...chars];
    nextArray[index] = numericChar;
    const next = nextArray.join('').slice(0, length);
    onChange(next);

    if (numericChar && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key !== 'Backspace') return;

    if (chars[index]) {
      const nextArray = [...chars];
      nextArray[index] = '';
      onChange(nextArray.join(''));
      return;
    }

    if (index > 0) {
      refs.current[index - 1]?.focus();
      const nextArray = [...chars];
      nextArray[index - 1] = '';
      onChange(nextArray.join(''));
    }
  };

  const handlePaste = (rawText: string, startIndex: number) => {
    const digits = rawText.replace(/\D/g, '');
    if (!digits) return;

    const nextArray = [...chars];
    for (let i = 0; i < digits.length && startIndex + i < length; i += 1) {
      nextArray[startIndex + i] = digits[i];
    }

    const next = nextArray.join('').slice(0, length);
    onChange(next);

    const nextFocusIndex = Math.min(startIndex + digits.length, length - 1);
    refs.current[nextFocusIndex]?.focus();
  };

  return (
    <View className="w-full flex-row items-center justify-center gap-3">
      {chars.map((char, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            refs.current[index] = ref;
          }}
          value={char}
          editable={!disabled}
          maxLength={1}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          returnKeyType="done"
          onChangeText={(text) => {
            if (text.length > 1) {
              handlePaste(text, index);
              return;
            }
            setCharAt(index, text);
          }}
          onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
          className={[
            'h-[62px] w-[62px] rounded-2xl border bg-slate-50/50 text-center text-2xl font-bold text-[#363062] shadow-xs',
            hasError
              ? 'border-rose-400 bg-rose-50/30 text-rose-600'
              : char
                ? 'border-[#363062] bg-white'
                : 'border-slate-200',
            disabled ? 'bg-slate-100 text-slate-400 border-slate-200' : '',
          ].join(' ')}
        />
      ))}
    </View>
  );
}

export default function OtpVerificationScreen() {
  const { identifier, purpose } = useLocalSearchParams<{ identifier: string; purpose: string }>();
  const { completeOtpLogin } = useAuth();

  const [otpCode, setOtpCode] = useState('');
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  const [errorText, setErrorText] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const isComplete = otpCode.length === OTP_LENGTH;

  if (!identifier) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <View className="rounded-2xl bg-rose-50 p-4 border border-rose-200">
          <Text className="text-rose-700 font-semibold text-center">
            Error: Identifikasi tidak ditemukan
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleVerify = async () => {
    if (!isComplete || verifyState === 'loading') return;

    setVerifyState('loading');
    setErrorText('');

    try {
      const response = await authService.verifyOtp(identifier, otpCode);

      if (response.success) {
        setVerifyState('success');
        if (purpose === 'reset') {
          router.replace('/(auth)/login');
        } else {
          await completeOtpLogin?.(identifier);
          router.replace('/(customer)/home');
        }
      } else {
        setVerifyState('error');
        setErrorText(response.error?.message || 'Kode OTP tidak valid');
      }
    } catch (error) {
      setVerifyState('error');
      setErrorText('Terjadi kesalahan. Coba lagi.');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || verifyState === 'loading') return;

    setVerifyState('loading');
    setErrorText('');

    try {
      const response = await authService.requestOtp(identifier);
      if (response.success) {
        setOtpCode('');
        setVerifyState('idle');
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setVerifyState('error');
        setErrorText(response.error?.message || 'Gagal mengirim ulang kode');
      }
    } catch (error) {
      setVerifyState('error');
      setErrorText('Terjadi kesalahan saat mengirim ulang');
    }
  };

  const handleChangeIdentifier = () => {
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}>
        <View className="flex-1 px-6 pt-6 pb-6">
          {/* Top Navigation Back Button */}
          <Pressable
            onPress={handleChangeIdentifier}
            className="mb-4 flex-row items-center gap-1 rounded-full py-1 self-start active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Ubah email"
          >
            <Text className="text-xl font-bold text-[#363062]">←</Text>
            <Text className="text-sm font-semibold text-[#363062]">Kembali</Text>
          </Pressable>

          <View className="flex-1">
            <AuthHeaderBlock
              title="Verifikasi OTP"
              description={`Masukkan 4 digit kode verifikasi yang dikirim ke ${identifier}`}
            />

            <View className="mt-8">
              <OtpInputGroup
                value={otpCode}
                onChange={(next) => {
                  setOtpCode(next);
                  if (verifyState !== 'idle') setVerifyState('idle');
                  if (errorText) setErrorText('');
                }}
                disabled={verifyState === 'loading'}
                hasError={verifyState === 'error'}
              />
            </View>

            {errorText ? (
              <View className="mt-4 rounded-xl bg-rose-50 p-3 border border-rose-200">
                <Text className="text-center text-xs font-medium text-rose-700">{errorText}</Text>
              </View>
            ) : null}

            <View className="mt-8">
              <AppButton
                label="Verifikasi Kode"
                loading={verifyState === 'loading'}
                disabled={!isComplete}
                onPress={handleVerify}
                className="h-[54px] rounded-xl bg-[#D2691E] active:bg-[#b85a19]"
              />
            </View>

            <View className="mt-8 items-center">
              <Pressable
                accessibilityRole="button"
                disabled={cooldown > 0 || verifyState === 'loading'}
                onPress={handleResend}
                className="rounded-full px-4 py-2 bg-slate-50 border border-slate-200 active:bg-slate-100"
              >
                <Text
                  className={[
                    'text-sm font-semibold',
                    cooldown > 0 || verifyState === 'loading' ? 'text-slate-400' : 'text-[#363062]',
                  ].join(' ')}>
                  {cooldown > 0 ? `Kirim ulang kode (${cooldown}s)` : 'Belum menerima kode? Kirim Ulang'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
