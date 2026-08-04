/**
 * ReviewModerationCard Component
 * Displays a review for moderation with approve/reject actions
 */

import { Pressable, Text, View } from 'react-native';
import { AppButton } from '../../ui/app-button';
import type { ReviewForModeration } from '../types/admin';

interface ReviewModerationCardProps {
  review: ReviewForModeration;
  onApprove?: (reviewId: string) => void;
  onReject?: (reviewId: string) => void;
  onPress?: () => void;
}

export function ReviewModerationCard({
  review,
  onApprove,
  onReject,
  onPress,
}: ReviewModerationCardProps) {
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
        <View className="flex-1">
          <Text className="text-slate-900 font-semibold text-base mb-1">
            {review.barberName}
          </Text>
          <Text className="text-slate-500 text-sm">
            dari {review.reviewerName}
          </Text>
        </View>
        {renderStars(review.rating)}
      </View>

      <Text className="text-slate-700 text-sm mb-3">
        {review.comment}
      </Text>

      {review.flaggedReason && (
        <View className="bg-red-50 border-l-4 border-red-600 p-3 mb-3 rounded">
          <Text className="text-red-900 text-xs font-semibold mb-1">
            ⚠️ Bendera
          </Text>
          <Text className="text-red-800 text-sm">
            {review.flaggedReason}
          </Text>
        </View>
      )}

      {review.status === 'pending' && (
        <View className="flex-row gap-2 mt-3">
          <AppButton
            title="Setujui"
            size="sm"
            onPress={() => onApprove?.(review.reviewId)}
            className="flex-1"
          />
          <AppButton
            title="Tolak"
            size="sm"
            variant="secondary"
            onPress={() => onReject?.(review.reviewId)}
            className="flex-1"
          />
        </View>
      )}

      {review.status !== 'pending' && (
        <View className="bg-slate-50 px-3 py-2 rounded mt-3">
          <Text className="text-slate-600 text-xs font-medium">
            Status: {review.status === 'approved' ? 'Disetujui' : 'Ditolak'}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
