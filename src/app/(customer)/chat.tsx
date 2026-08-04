import { CustomerBottomNavigation } from '@/components/navigation/CustomerBottomNavigation';
import { Avatar } from '@/components/ui/Avatar';
import { SearchInput } from '@/components/ui/SearchInput';
import { routes } from '@/constants/routes';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

const conversations = [
  { id: 'CONV001', name: 'Toni Barbershop', message: 'Silakan konfirmasi jadwal Anda.', time: '10.32', unread: 2, online: true },
  { id: 'CONV002', name: 'Rido Barber', message: 'Saya sedang menuju lokasi.', time: '09.15', unread: 0, online: true },
  { id: 'CONV003', name: 'Modern Cuts', message: 'Terima kasih sudah berkunjung!', time: 'Kemarin', unread: 0, online: false },
] as const;

export default function ChatListScreen() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => conversations.filter((item) => `${item.name} ${item.message}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-slate-100 px-4 py-4"><Text className="text-center text-xl font-bold text-slate-900">Chat</Text></View>
      <View className="px-4 py-4"><SearchInput value={query} onChangeText={setQuery} placeholder="Cari obrolan" /></View>
      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        {filtered.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(routes.customer.chat(item.id))} className="flex-row items-center gap-3 border-b border-slate-100 py-4">
            <Avatar name={item.name} size="lg" status={item.online ? 'online' : 'offline'} />
            <View className="flex-1">
              <View className="flex-row items-center justify-between"><Text className="text-base font-semibold text-slate-900">{item.name}</Text><Text className="text-xs text-slate-400">{item.time}</Text></View>
              <View className="mt-1 flex-row items-center gap-2"><Text numberOfLines={1} className="flex-1 text-sm text-slate-500">{item.unread === 0 ? '✓✓ ' : ''}{item.message}</Text>{item.unread > 0 ? <View className="h-5 min-w-5 items-center justify-center rounded-full bg-[#D2691E] px-1"><Text className="text-xs font-bold text-white">{item.unread}</Text></View> : null}</View>
            </View>
          </Pressable>
        ))}
        {filtered.length === 0 ? <Text className="py-12 text-center text-slate-500">Obrolan tidak ditemukan</Text> : null}
      </ScrollView>
      <CustomerBottomNavigation />
    </SafeAreaView>
  );
}
