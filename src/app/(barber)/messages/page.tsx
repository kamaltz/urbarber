import { Avatar } from '@/components/ui/Avatar';
import { SearchInput } from '@/components/ui/SearchInput';
import { SymbolIcon } from '@/components/ui/SymbolIcon';
import { chatRepository } from '@/features/chat/repository/chat.repository';
import { useChatConversations } from '@/features/chat/hooks/use-chat-conversations';
import type { Conversation } from '@/features/chat/types';
import { getOwnChatState } from '@/features/chat/utils/participant-state';
import { customerRepository } from '@/features/customer/repository/customer.repository';
import { firebaseAuth } from '@/lib/firebase';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ConversationWithCustomer extends Conversation {
  customerName?: string;
  customerImage?: string;
}

export default function BarberMessagesScreen() {
  const { conversations, loading, error } = useChatConversations('barber');
  const [conversationsWithCustomers, setConversationsWithCustomers] = useState<ConversationWithCustomer[]>([]);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'inbox' | 'archived'>('inbox');
  const uid = firebaseAuth.currentUser?.uid;

  // Enrich conversations with customer names
  useEffect(() => {
    const enrichConversations = async () => {
      const enriched = await Promise.all(
        conversations.map(async (conv) => {
          try {
            const customer = await customerRepository.getCustomerProfile(conv.customerId);
            return {
              ...conv,
              customerName: customer?.name || 'Unknown Customer',
              customerImage: customer?.profileImageUrl,
            };
          } catch (err) {
            return {
              ...conv,
              customerName: 'Unknown Customer',
            };
          }
        })
      );
      setConversationsWithCustomers(enriched);
    };

    // Promise.all([]) resolves immediately, so this stays correct (and clears
    // stale entries) even when conversations becomes empty -- no separate
    // synchronous branch needed.
    enrichConversations();
  }, [conversations]);

  const visibleForMode = useMemo(() => {
    if (!uid) return conversationsWithCustomers;
    return conversationsWithCustomers.filter((item) => {
      const { archived, deleted } = getOwnChatState(item, uid);
      if (deleted) return false;
      return viewMode === 'archived' ? archived : !archived;
    });
  }, [conversationsWithCustomers, uid, viewMode]);

  const getTimeMs = (date?: Date | any): number => {
    if (!date) return 0;
    const d = date instanceof Date ? date : date.toDate?.();
    return d?.getTime?.() ?? 0;
  };

  // Same counterpart-grouping as the customer chat list (chat.tsx) -- see
  // that file for the full rationale. Here the counterpart is customerId.
  const deduped = useMemo(() => {
    const byCustomer = new Map<string, ConversationWithCustomer & { unreadTotal: number }>();

    for (const item of visibleForMode) {
      const unread = item.barberUnreadCount || 0;
      const existing = byCustomer.get(item.customerId);

      if (!existing) {
        byCustomer.set(item.customerId, { ...item, unreadTotal: unread });
        continue;
      }

      const mergedUnread = existing.unreadTotal + unread;
      const isNewer = getTimeMs(item.lastMessageAt) > getTimeMs(existing.lastMessageAt);
      byCustomer.set(item.customerId, { ...(isNewer ? item : existing), unreadTotal: mergedUnread });
    }

    return Array.from(byCustomer.values()).sort(
      (a, b) => getTimeMs(b.lastMessageAt) - getTimeMs(a.lastMessageAt)
    );
  }, [visibleForMode]);

  const filtered = useMemo(
    () =>
      deduped.filter((item) =>
        `${item.customerName} ${item.lastMessage}`.toLowerCase().includes(query.toLowerCase())
      ),
    [deduped, query]
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

  const handleDelete = (item: ConversationWithCustomer) => {
    Alert.alert(
      'Hapus Obrolan',
      `Hapus obrolan dengan ${item.customerName || 'Customer'}? Riwayat pesan tetap tersimpan untuk Customer, dan obrolan baru masih bisa dibuat nanti.`,
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

  const handleOpenMenu = (item: ConversationWithCustomer) => {
    const { archived } = getOwnChatState(item, uid || '');
    Alert.alert(item.customerName || 'Customer', undefined, [
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
          <Text className="text-center text-xl font-bold text-slate-900">Messages</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-red-600">{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-slate-100 px-4 py-4">
        <Text className="text-center text-xl font-bold text-slate-900">Messages</Text>
      </View>
      <View className="px-4 py-4">
        <SearchInput value={query} onChangeText={setQuery} placeholder="Cari pesan" />
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
        <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
          {filtered.map((item) => (
            <View key={item.customerId} className="flex-row items-center gap-2 border-b border-slate-100 py-4">
              <Pressable
                onPress={() => router.push(`/(barber)/messages/${item.id}` as any)}
                className="flex-1 flex-row items-center gap-3"
              >
                <Avatar
                  source={item.customerImage ? { uri: item.customerImage } : undefined}
                  name={item.customerName || 'C'}
                  size="lg"
                  status="online"
                />
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-slate-900">{item.customerName || 'Customer'}</Text>
                    <Text className="text-xs text-slate-400">{formatTime(item.lastMessageAt)}</Text>
                  </View>
                  <View className="mt-1 flex-row items-center gap-2">
                    <Text numberOfLines={1} className="flex-1 text-sm text-slate-500">
                      {item.lastSenderId === firebaseAuth.currentUser?.uid ? '✓✓ ' : ''}
                      {item.lastMessage || '(No messages yet)'}
                    </Text>
                    {item.unreadTotal > 0 ? (
                      <View className="h-5 min-w-5 items-center justify-center rounded-full bg-[#D2691E] px-1">
                        <Text className="text-xs font-bold text-white">{item.unreadTotal}</Text>
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
              {viewMode === 'archived' ? 'Belum ada obrolan yang diarsipkan' : 'Pesan tidak ditemukan'}
            </Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
