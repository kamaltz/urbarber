/**
 * CustomerDetailCard
 * Shows only what's genuinely needed to serve this customer: avatar, name,
 * and a quick Chat action into the canonical booking conversation. No phone/
 * call action -- the customer's phone number is never actually available to
 * the Barber via any legitimate client-side read (only Admin can resolve it
 * server-side), so a "Call" button here would be a dead/fake control.
 */
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';

interface CustomerDetailCardProps {
  name: string;
  avatarUrl?: string;
  notes?: string;
  onChatPress: () => void;
  chatEnabled: boolean;
  chatLoading: boolean;
}

export function CustomerDetailCard({ name, avatarUrl, notes, onChatPress, chatEnabled, chatLoading }: CustomerDetailCardProps) {
  return (
    <View className="rounded-2xl bg-white border border-slate-200 p-4">
      <View className="flex-row items-center gap-3">
        <Avatar size="lg" name={name} source={avatarUrl ? { uri: avatarUrl } : undefined} />
        <View className="flex-1">
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pelanggan</Text>
          <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
            {name}
          </Text>
        </View>

        <Pressable
          onPress={onChatPress}
          disabled={!chatEnabled || chatLoading}
          accessibilityRole="button"
          accessibilityLabel="Chat dengan pelanggan"
          className={[
            'h-11 w-11 items-center justify-center rounded-full',
            chatEnabled ? 'bg-[#D2691E]' : 'bg-slate-200',
          ].join(' ')}
        >
          {chatLoading ? (
            <ActivityIndicator size="small" color={chatEnabled ? '#fff' : '#94a3b8'} />
          ) : (
            <Text className="text-lg">💬</Text>
          )}
        </Pressable>
      </View>

      {notes ? (
        <View className="mt-3 rounded-xl bg-slate-50 p-3">
          <Text className="text-xs font-semibold text-slate-500 mb-1">Catatan Pelanggan</Text>
          <Text className="text-xs text-slate-700 italic">&quot;{notes}&quot;</Text>
        </View>
      ) : null}
    </View>
  );
}
