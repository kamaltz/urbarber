import { CustomerBottomNavigation } from '@/components/navigation/CustomerBottomNavigation';
import { Avatar } from '@/components/ui/Avatar';
import { SearchInput } from '@/components/ui/SearchInput';
import { routes } from '@/constants/routes';
import { barberRepository } from '@/features/barbers/repository/barber.repository';
import { useChatConversations } from '@/features/chat/hooks/use-chat-conversations';
import type { Conversation } from '@/features/chat/types';
import { firebaseAuth } from '@/lib/firebase';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ConversationWithBarber extends Conversation {
  barberName?: string;
  barberImage?: string;
}

export default function ChatListScreen() {
  const { conversations, loading, error } = useChatConversations('customer');
  const [conversationsWithBarbers, setConversationsWithBarbers] = useState<ConversationWithBarber[]>([]);
  const [query, setQuery] = useState('');

  // Enrich conversations with barber names
  useEffect(() => {
    const enrichConversations = async () => {
      const enriched = await Promise.all(
        conversations.map(async (conv) => {
          try {
            const barber = await barberRepository.getBarberProfile(conv.barberId);
            return {
              ...conv,
              barberName: barber?.name || 'Unknown Barber',
              barberImage: barber?.profileImageUrl,
            };
          } catch (err) {
            return {
              ...conv,
              barberName: 'Unknown Barber',
            };
          }
        })
      );
      setConversationsWithBarbers(enriched);
    };

    if (conversations.length > 0) {
      enrichConversations();
    }
  }, [conversations]);

  const filtered = useMemo(
    () =>
      conversationsWithBarbers.filter(
        (item) =>
          `${item.barberName} ${item.lastMessage}`.toLowerCase().includes(query.toLowerCase())
      ),
    [conversationsWithBarbers, query]
  );

  const formatTime = (date?: Date | any) => {
    if (!date) return '';
    try {
      const messageDate = date instanceof Date ? date : date.toDate?.();
      if (!messageDate) return '';

      const now = new Date();
      const diff = now.getTime() - messageDate.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) {
        return messageDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      } else if (days === 1) {
        return 'Kemarin';
      } else {
        return messageDate.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
      }
    } catch {
      return '';
    }
  };

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="border-b border-slate-100 px-4 py-4">
          <Text className="text-center text-xl font-bold text-slate-900">Chat</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-red-600">{error}</Text>
        </View>
        <CustomerBottomNavigation />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-slate-100 px-4 py-4">
        <Text className="text-center text-xl font-bold text-slate-900">Chat</Text>
      </View>
      <View className="px-4 py-4">
        <SearchInput value={query} onChangeText={setQuery} placeholder="Cari obrolan" />
      </View>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled" removeClippedSubviews={false}>
          {filtered.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(routes.customer.chat(item.id))}
              className="flex-row items-center gap-3 border-b border-slate-100 py-4"
            >
              <Avatar name={item.barberName || 'B'} size="lg" status="online" />
              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-slate-900">{item.barberName || 'Barber'}</Text>
                  <Text className="text-xs text-slate-400">{formatTime(item.lastMessageAt)}</Text>
                </View>
                <View className="mt-1 flex-row items-center gap-2">
                  <Text numberOfLines={1} className="flex-1 text-sm text-slate-500">
                    {item.lastSenderId === firebaseAuth.currentUser?.uid ? '✓✓ ' : ''}
                    {item.lastMessage || '(No messages yet)'}
                  </Text>
                  {item.customerUnreadCount > 0 ? (
                    <View className="h-5 min-w-5 items-center justify-center rounded-full bg-[#D2691E] px-1">
                      <Text className="text-xs font-bold text-white">{item.customerUnreadCount}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          ))}
          {filtered.length === 0 && !loading ? (
            <Text className="py-12 text-center text-slate-500">Obrolan tidak ditemukan</Text>
          ) : null}
        </ScrollView>
      )}
      <CustomerBottomNavigation />
    </SafeAreaView>
  );
}
