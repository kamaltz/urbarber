import { Text, View } from 'react-native';

export type AuthHeaderBlockProps = {
  title: string;
  description: string;
  align?: 'left' | 'center';
};

export function AuthHeaderBlock({ title, description, align = 'left' }: AuthHeaderBlockProps) {
  const isCenter = align === 'center';

  return (
    <View className={`w-full gap-2 px-0 ${isCenter ? 'items-center' : 'items-start'}`}>
      <Text
        className={[
          'text-[44px] font-semibold leading-[52px] text-[#363062]',
          isCenter ? 'text-center' : 'text-left',
        ].join(' ')}>
        {title}
      </Text>
      <Text
        className={[
          'text-[34px] leading-[44px] text-[#6B7280]',
          isCenter ? 'text-center' : 'text-left',
        ].join(' ')}>
        {description}
      </Text>
    </View>
  );
}
