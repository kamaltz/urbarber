import { Avatar } from '@/components/ui/Avatar';
import { useLocalSearchParams } from 'expo-router';
import { backOrReplace } from '@/lib/navigation';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Message = { id: string; content: string; time: string; outgoing: boolean };
const initialMessages: Message[] = [
  { id: '1', content: 'Halo, saya ingin memastikan jadwal booking besok.', time: '10.28', outgoing: true },
  { id: '2', content: 'Halo! Jadwal pukul 10.00 sudah tercatat.', time: '10.30', outgoing: false },
  { id: '3', content: 'Silakan konfirmasi jadwal Anda.', time: '10.32', outgoing: false },
];

export default function ChatRoomScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const participantName = useMemo(() => conversationId === 'CONV002' ? 'Rido Barber' : conversationId === 'CONV003' ? 'Modern Cuts' : 'Toni Barbershop', [conversationId]);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState(initialMessages);

  const sendMessage = () => {
    const content = draft.trim();
    if (!content) return;
    setMessages((current) => [...current, { id: `${Date.now()}`, content, time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), outgoing: true }]);
    setDraft('');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row items-center gap-3 border-b border-slate-200 px-4 py-3">
          <Pressable onPress={() => backOrReplace('/(customer)/chat')} hitSlop={10}><Text className="text-3xl text-slate-900">‹</Text></Pressable>
          <Avatar name={participantName} size="sm" status="online" />
          <View><Text className="font-bold text-slate-900">{participantName}</Text><Text className="text-xs text-emerald-600">Online</Text></View>
        </View>
        <ScrollView className="flex-1 bg-slate-50 px-4" contentContainerClassName="py-5" keyboardShouldPersistTaps="handled">
          <View className="mb-5 self-center rounded-full bg-slate-200 px-3 py-1"><Text className="text-xs text-slate-500">Hari ini</Text></View>
          {messages.map((item) => (
            <View key={item.id} className={`mb-3 max-w-[82%] rounded-2xl px-4 py-3 ${item.outgoing ? 'self-end rounded-br-sm bg-[#D2691E]' : 'self-start rounded-bl-sm bg-white'}`}>
              <Text className={item.outgoing ? 'text-white' : 'text-slate-800'}>{item.content}</Text>
              <Text className={`mt-1 text-right text-[10px] ${item.outgoing ? 'text-orange-100' : 'text-slate-400'}`}>{item.time}{item.outgoing ? '  ✓✓' : ''}</Text>
            </View>
          ))}
        </ScrollView>
        <View className="flex-row items-end gap-2 border-t border-slate-200 bg-white px-4 py-3">
          <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-slate-100"><Text className="text-xl text-slate-500">＋</Text></Pressable>
          <TextInput value={draft} onChangeText={setDraft} placeholder="Tulis pesan..." multiline className="max-h-28 min-h-11 flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-slate-900" />
          <Pressable onPress={sendMessage} disabled={!draft.trim()} className={`h-11 w-11 items-center justify-center rounded-full ${draft.trim() ? 'bg-[#D2691E]' : 'bg-slate-300'}`}><Text className="text-xl text-white">➤</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
