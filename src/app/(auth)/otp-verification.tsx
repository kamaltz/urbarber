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
            'h-[62px] w-[62px] rounded-xl border bg-white text-center text-2xl font-semibold text-slate-900',
            hasError ? 'border-rose-500' : 'border-slate-300',
            disabled ? 'bg-slate-100 text-slate-400' : '',
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

  const isComplete = otpCode.length === OTP_LENGTH;

  if (!identifier) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-red-600">Error: Identifier not provided</Text>
      </SafeAreaView>
    );
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

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
        <View className="flex-1 px-[18px] pt-14">
          <View className="flex-1">
            <AuthHeaderBlock
              title="Verifikasi"
              description={`Masukkan kode OTP yang dikirim ke ${identifier}`}
            />

            <View className="mt-12">
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

            {errorText ? <Text className="mt-3 text-center text-sm text-rose-600">{errorText}</Text> : null}

            <View className="mt-8">
              <AppButton
                label="Verifikasi"
                loading={verifyState === 'loading'}
                disabled={!isComplete}
                onPress={handleVerify}
                className="h-[54px] rounded-lg"
              />
            </View>

            <View className="mt-10 items-center">
              <Pressable
                accessibilityRole="button"
                disabled={cooldown > 0 || verifyState === 'loading'}
                onPress={handleResend}>
                <Text
                  className={[
                    'text-xl font-semibold',
                    cooldown > 0 || verifyState === 'loading' ? 'text-slate-400' : 'text-[#363062]',
                  ].join(' ')}>
                  {cooldown > 0 ? `Kirim ulang (${cooldown})` : 'Tidak menerima kode?'}
                </Text>
              </Pressable>
            </View>

            <View className="mt-6 items-center">
              <Pressable onPress={handleChangeIdentifier} disabled={verifyState === 'loading'}>
                <Text className="text-base font-semibold text-slate-600 underline">
                  Ubah email
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
