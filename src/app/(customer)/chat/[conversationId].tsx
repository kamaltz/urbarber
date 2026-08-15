import { Avatar } from '@/components/ui/Avatar';
import { useChatBootstrap } from '@/features/chat/hooks/use-chat-bootstrap';
import { useChatMessages } from '@/features/chat/hooks/use-chat-messages';
import { chatRepository } from '@/features/chat/repository/chat.repository';
import { firebaseAuth } from '@/lib/firebase';
import { backOrReplace } from '@/lib/navigation';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatRoomScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const bookingId = conversationId || '';
  const { ready: chatReady, error: bootstrapError } = useChatBootstrap(bookingId);
  const { messages, loading, error, send, loadOlder, hasOlder } = useChatMessages(bookingId, chatReady);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [barberName, setBarberName] = useState('Barber');
  const [barberImage, setBarberImage] = useState<string | undefined>();

  // Load barber info
  useEffect(() => {
    const loadBarber = async () => {
      try {
        if (!bookingId) return;
        // In a full implementation, we'd fetch the booking to get barberId
        // For now, we'll show a placeholder
        // This will be enhanced when we integrate with booking data
      } catch (err) {
        console.error('Error loading barber:', err);
      }
    };
    loadBarber();
  }, [bookingId]);

  // Reset unread once the conversation is confirmed to exist -- resetting
  // against a conversation that was never created is the same permission
  // error the chat room used to hit before chat bootstrap was wired up.
  useEffect(() => {
    const resetUnread = async () => {
      try {
        await chatRepository.resetUnreadCount(bookingId, 'customer');
      } catch (err) {
        console.error('Error resetting unread:', err);
      }
    };
    if (bookingId && chatReady) {
      resetUnread();
    }
  }, [bookingId, chatReady]);

  const sendMessage = async () => {
    const content = draft.trim();
    if (!content) return;

    setSending(true);
    try {
      await send(content);
      setDraft('');
    } catch (err: any) {
      Alert.alert('Gagal', err.message || 'Gagal mengirim pesan');
    } finally {
      setSending(false);
    }
  };

  const handleLoadOlder = async () => {
    try {
      await loadOlder();
    } catch (err: any) {
      Alert.alert('Gagal', 'Gagal memuat pesan lebih lama');
    }
  };

  const formatMessageTime = (date?: any) => {
    if (!date) return '';
    try {
      const msgDate = date instanceof Date ? date : date.toDate?.();
      if (!msgDate) return '';
      return msgDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row items-center gap-3 border-b border-slate-200 px-4 py-3">
          <Pressable onPress={() => backOrReplace('/(customer)/chat')} hitSlop={10}>
            <Text className="text-3xl text-slate-900">‹</Text>
          </Pressable>
          <Avatar name={barberName} size="sm" status="online" />
          <View>
            <Text className="font-bold text-slate-900">{barberName}</Text>
            <Text className="text-xs text-emerald-600">Online</Text>
          </View>
        </View>

        {(bootstrapError || error) && (
          <View className="border-b border-red-200 bg-red-50 px-4 py-2">
            <Text className="text-xs text-red-700">{bootstrapError || error}</Text>
          </View>
        )}

        {bootstrapError ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center text-slate-500">Chat tidak tersedia untuk pemesanan ini.</Text>
          </View>
        ) : !chatReady || loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <>
            <ScrollView
              className="flex-1 bg-slate-50 px-4"
              contentContainerClassName="py-5"
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={false}
            >
              {hasOlder && (
                <Pressable onPress={handleLoadOlder} className="mb-3 self-center">
                  <Text className="text-xs text-blue-600 font-semibold">Load older messages</Text>
                </Pressable>
              )}

              {messages.length === 0 ? (
                <View className="flex-1 items-center justify-center py-10">
                  <Text className="text-slate-400">No messages yet. Start the conversation!</Text>
                </View>
              ) : (
                <>
                  <View className="mb-5 self-center rounded-full bg-slate-200 px-3 py-1">
                    <Text className="text-xs text-slate-500">Today</Text>
                  </View>
                  {messages.map((item) => {
                    const isOutgoing = item.senderId === firebaseAuth.currentUser?.uid;
                    return (
                      <View
                        key={item.id}
                        className={`mb-3 max-w-[82%] rounded-2xl px-4 py-3 ${
                          isOutgoing ? 'self-end rounded-br-sm bg-[#D2691E]' : 'self-start rounded-bl-sm bg-white'
                        }`}
                      >
                        <Text className={isOutgoing ? 'text-white' : 'text-slate-800'}>
                          {item.text}
                        </Text>
                        <Text
                          className={`mt-1 text-right text-[10px] ${
                            isOutgoing ? 'text-orange-100' : 'text-slate-400'
                          }`}
                        >
                          {formatMessageTime(item.createdAt)}
                          {isOutgoing ? '  ✓✓' : ''}
                        </Text>
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>

            <View className="flex-row items-end gap-2 border-t border-slate-200 bg-white px-4 py-3">
              <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-slate-100">
                <Text className="text-xl text-slate-500">＋</Text>
              </Pressable>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Tulis pesan..."
                multiline
                maxLength={1000}
                className="max-h-28 min-h-11 flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-slate-900"
              />
              <Pressable
                onPress={sendMessage}
                disabled={!draft.trim() || sending}
                className={`h-11 w-11 items-center justify-center rounded-full ${
                  draft.trim() && !sending ? 'bg-[#D2691E]' : 'bg-slate-300'
                }`}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-xl text-white">➤</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
