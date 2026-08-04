/**
 * Review Form Component - Booking review and rating form
 */

import { Pressable, Text, TextInput, View } from 'react-native';
import { useState } from 'react';

export type ReviewFormProps = {
  onSubmit: (data: { rating: number; reviewText: string; tags: string[] }) => void;
  loading?: boolean;
};

const REVIEW_TAGS = ['Profesional', 'Ramah', 'Rapi', 'Cepat', 'Bersih'];

export function ReviewForm({ onSubmit, loading = false }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleSubmit = () => {
    if (rating === 0) {
      alert('Silakan pilih rating');
      return;
    }

    onSubmit({
      rating,
      reviewText,
      tags: selectedTags,
    });
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <View className="gap-6">
      {/* Star Rating */}
      <View className="gap-3">
        <Text className="text-lg font-bold text-slate-900">Berikan Rating</Text>

        <View className="flex-row gap-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              onPress={() => setRating(star)}
              className="flex-1">
              <Text className={`text-center text-4xl ${star <= rating ? '⭐' : '☆'}`}>
                {star <= rating ? '⭐' : '☆'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Review Text */}
      <View className="gap-2">
        <Text className="text-base font-semibold text-slate-900">Ulasan</Text>

        <TextInput
          className="h-24 rounded-lg border border-slate-300 bg-white p-3 text-slate-900"
          placeholder="Bagikan pengalaman Anda (opsional)"
          placeholderTextColor="#9CA3AF"
          value={reviewText}
          onChangeText={setReviewText}
          multiline
          editable={!loading}
        />
      </View>

      {/* Tags */}
      <View className="gap-2">
        <Text className="text-base font-semibold text-slate-900">Pilih Tags</Text>

        <View className="flex-row flex-wrap gap-2">
          {REVIEW_TAGS.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => toggleTag(tag)}
              className={`rounded-full px-4 py-2 border-2 ${
                selectedTags.includes(tag)
                  ? 'border-orange-600 bg-orange-100'
                  : 'border-slate-300 bg-white'
              }`}>
              <Text
                className={`text-sm font-semibold ${
                  selectedTags.includes(tag) ? 'text-orange-700' : 'text-slate-600'
                }`}>
                {tag}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Submit Button */}
      <Pressable
        onPress={handleSubmit}
        disabled={loading || rating === 0}
        className={`h-14 items-center justify-center rounded-lg ${
          loading || rating === 0 ? 'bg-slate-300' : 'bg-orange-600'
        }`}>
        <Text className="text-base font-semibold text-white">
          {loading ? 'Mengirim...' : 'Kirim Ulasan'}
        </Text>
      </Pressable>
    </View>
  );
}
