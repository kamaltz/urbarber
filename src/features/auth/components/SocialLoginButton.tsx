import { Pressable, Text } from 'react-native';

export type SocialLoginButtonProps = {
  provider: 'google' | 'apple';
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function SocialLoginButton({ provider, onPress, loading = false, disabled = false }: SocialLoginButtonProps) {
  const isGoogle = provider === 'google';
  
  const providerLabel = isGoogle ? 'Google' : 'Apple';
  const providerIcon = isGoogle ? '🔍' : '🍎';
  const bgColor = isGoogle ? 'bg-white border border-slate-300' : 'bg-black';
  const textColor = isGoogle ? 'text-slate-900' : 'text-white';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={[
        'h-12 rounded-lg flex-row items-center justify-center gap-2',
        bgColor,
        disabled ? 'opacity-50' : '',
      ].join(' ')}>
      {!loading && <Text className="text-lg">{providerIcon}</Text>}
      <Text className={`text-base font-semibold ${textColor}`}>
        {loading ? 'Loading...' : `Login dengan ${providerLabel}`}
      </Text>
    </Pressable>
  );
}
