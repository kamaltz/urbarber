import { Text, View } from 'react-native';

export type AuthHeaderBlockProps = {
  title: string;
  description: string;
  align?: 'left' | 'center';
  titleClassName?: string;
  descriptionClassName?: string;
};

export function AuthHeaderBlock({
  title,
  description,
  align = 'left',
  titleClassName,
  descriptionClassName,
}: AuthHeaderBlockProps) {
  const isCenter = align === 'center';

  return (
    <View className={`w-full gap-2 px-0 ${isCenter ? 'items-center' : 'items-start'}`}>
      <Text
        className={[
          titleClassName || 'text-3xl font-bold leading-9 text-[#363062]',
          isCenter ? 'text-center' : 'text-left',
        ].join(' ')}>
        {title}
      </Text>
      <Text
        className={[
          descriptionClassName || 'text-sm leading-5 text-[#6B7280]',
          isCenter ? 'text-center' : 'text-left',
        ].join(' ')}>
        {description}
      </Text>
    </View>
  );
}
