/**
 * ReviewListItem Component
 * Displays a customer review with star rating and reply action
 */

import { AppButton } from '@/components/ui/AppButton';
import { Image, Pressable, Text, View } from 'react-native';
import type { BarberReview } from '../types/barber';

interface ReviewListItemProps {
  review: BarberReview;
  onReply?: (reviewId: string) => void;
  onPress?: () => void;
  showReplyButton?: boolean;
}

export function ReviewListItem({
  review,
  onReply,
  onPress,
  showReplyButton = true,
}: ReviewListItemProps) {
  const renderStars = (rating: number) => {
    return (
      <View className="flex-row gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Text key={star} className={star <= rating ? 'text-yellow-400' : 'text-slate-300'}>
            ★
          </Text>
        ))}
      </View>
    );
  };

  return (
    <Pressable
      onPress={onPress}
      className="bg-white border border-slate-100 rounded-lg p-4 mb-3"
    >
      <View className="flex-row gap-3 mb-3">
        {review.customerAvatarUrl && (
          <Image
            source={{ uri: review.customerAvatarUrl }}
            className="w-10 h-10 rounded-full"
          />
        )}
        <View className="flex-1">
          <View className="flex-row justify-between items-start mb-1">
            <Text className="text-slate-900 font-semibold">
              {review.customerName}
            </Text>
            {renderStars(review.rating)}
          </View>
          <Text className="text-slate-500 text-xs">
            {new Date(review.createdAt).toLocaleDateString('id-ID')}
          </Text>
        </View>
      </View>

      <Text className="text-slate-700 text-sm mb-3">
        {review.comment}
      </Text>

      {review.status === 'replied' && review.replyText && (
        <View className="bg-orange-50 border-l-4 border-orange-600 p-3 mb-3 rounded">
          <Text className="text-orange-900 text-xs font-semibold mb-1">
            Balasan Anda
          </Text>
          <Text className="text-orange-800 text-sm">
            {review.replyText}
          </Text>
        </View>
      )}

      {showReplyButton && review.status !== 'replied' && (
                <AppButton
          label="Balas Ulasan"
          size="sm"
          variant="secondary"
          onPress={() => onReply?.(review.reviewId)}
        />
      )}
    </Pressable>
  );
}
