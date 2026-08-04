import { Pressable, Text, View } from 'react-native';

export type TermsAgreementProps = {
  checked: boolean;
  onToggle: (checked: boolean) => void;
  onTermsPress?: () => void;
  disabled?: boolean;
};

export function TermsAgreement({ checked, onToggle, onTermsPress, disabled = false }: TermsAgreementProps) {
  return (
    <View className="flex-row items-start gap-3">
      <Pressable
        onPress={() => !disabled && onToggle(!checked)}
        disabled={disabled}
        className={[
          'h-6 w-6 rounded-lg border-2 items-center justify-center mt-0.5',
          checked ? 'bg-[#D2691E] border-[#D2691E]' : 'border-slate-300 bg-white',
          disabled ? 'opacity-50' : '',
        ].join(' ')}>
        {checked ? <Text className="text-white font-bold text-sm">✓</Text> : null}
      </Pressable>
      <View className="flex-1">
        <Text className="text-sm text-slate-900">
          Saya setuju dengan{' '}
          <Text
            onPress={onTermsPress}
            className="font-semibold text-[#D2691E] underline"
            suppressHighlighting={false}>
            syarat dan ketentuan
          </Text>
        </Text>
      </View>
    </View>
  );
}
