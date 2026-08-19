import { CustomerBottomNavigation } from '@/components/navigation/CustomerBottomNavigation';
import { Avatar } from '@/components/ui/Avatar';
import { SearchInput } from '@/components/ui/SearchInput';
import { SymbolIcon } from '@/components/ui/SymbolIcon';
import { routes } from '@/constants/routes';
import { barberRepository } from '@/features/barbers/repository/barber.repository';
import { chatRepository } from '@/features/chat/repository/chat.repository';
import { useChatConversations } from '@/features/chat/hooks/use-chat-conversations';
import type { Conversation } from '@/features/chat/types';
import { getOwnChatState } from '@/features/chat/utils/participant-state';
import { firebaseAuth } from '@/lib/firebase';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ConversationWithBarber extends Conversation {
  barberName?: string;
  barberImage?: string;
}

export default function ChatListScreen() {
  const { conversations, loading, error } = useChatConversations('customer');
  const [conversationsWithBarbers, setConversationsWithBarbers] = useState<ConversationWithBarber[]>([]);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'inbox' | 'archived'>('inbox');
  const uid = firebaseAuth.currentUser?.uid;

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

    // Promise.all([]) resolves immediately, so this stays correct (and clears
    // stale entries) even when conversations becomes empty -- no separate
    // synchronous branch needed.
    enrichConversations();
  }, [conversations]);

  const visibleForMode = useMemo(() => {
    if (!uid) return conversationsWithBarbers;
    return conversationsWithBarbers.filter((item) => {
      const { archived, deleted } = getOwnChatState(item, uid);
      if (deleted) return false;
      return viewMode === 'archived' ? archived : !archived;
    });
  }, [conversationsWithBarbers, uid, viewMode]);

  const filtered = useMemo(
    () =>
      visibleForMode.filter((item) =>
        `${item.barberName} ${item.lastMessage}`.toLowerCase().includes(query.toLowerCase())
      ),
    [visibleForMode, query]
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

  const handleDelete = (item: ConversationWithBarber) => {
    Alert.alert(
      'Hapus Obrolan',
      `Hapus obrolan dengan ${item.barberName || 'Barber'}? Riwayat pesan tetap tersimpan untuk Barber, dan obrolan baru masih bisa dibuat nanti.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            chatRepository.deleteConversation(item.id).catch(() => {
              Alert.alert('Gagal', 'Tidak dapat menghapus obrolan. Silakan coba lagi.');
            });
          },
        },
      ]
    );
  };

  const handleOpenMenu = (item: ConversationWithBarber) => {
    const { archived } = getOwnChatState(item, uid || '');
    Alert.alert(item.barberName || 'Barber', undefined, [
      {
        text: archived ? 'Keluarkan dari Arsip' : 'Arsipkan',
        onPress: () => {
          const action = archived
            ? chatRepository.unarchiveConversation(item.id)
            : chatRepository.archiveConversation(item.id);
          action.catch(() => {
            Alert.alert('Gagal', 'Tidak dapat memperbarui obrolan. Silakan coba lagi.');
          });
        },
      },
      { text: 'Hapus', style: 'destructive', onPress: () => handleDelete(item) },
      { text: 'Batal', style: 'cancel' },
    ]);
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
      <View className="flex-row gap-2 px-4 pb-3">
        <Pressable
          onPress={() => setViewMode('inbox')}
          className={`rounded-full px-4 py-1.5 ${viewMode === 'inbox' ? 'bg-slate-900' : 'bg-slate-100'}`}
        >
          <Text className={`text-xs font-semibold ${viewMode === 'inbox' ? 'text-white' : 'text-slate-600'}`}>
            Kotak Masuk
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setViewMode('archived')}
          className={`rounded-full px-4 py-1.5 ${viewMode === 'archived' ? 'bg-slate-900' : 'bg-slate-100'}`}
        >
          <Text className={`text-xs font-semibold ${viewMode === 'archived' ? 'text-white' : 'text-slate-600'}`}>
            Diarsipkan
          </Text>
        </Pressable>
      </View>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled" removeClippedSubviews={false}>
          {filtered.map((item) => (
            <View key={item.id} className="flex-row items-center gap-2 border-b border-slate-100 py-4">
              <Pressable
                onPress={() => router.push(routes.customer.chat(item.id))}
                className="flex-1 flex-row items-center gap-3"
              >
                <Avatar
                  source={item.barberImage ? { uri: item.barberImage } : undefined}
                  name={item.barberName || 'B'}
                  size="lg"
                  status="online"
                />
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
              <Pressable onPress={() => handleOpenMenu(item)} hitSlop={8} className="p-2">
                <SymbolIcon name="ellipsis" size={20} color="#64748B" />
              </Pressable>
            </View>
          ))}
          {filtered.length === 0 && !loading ? (
            <Text className="py-12 text-center text-slate-500">
              {viewMode === 'archived' ? 'Belum ada obrolan yang diarsipkan' : 'Obrolan tidak ditemukan'}
            </Text>
          ) : null}
        </ScrollView>
      )}
      <CustomerBottomNavigation />
    </SafeAreaView>
  );
}
