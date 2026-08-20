import { Pressable, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { AppButton } from '@/components/ui/AppButton';

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
    <View className="gap-5">
      {/* Star Rating Section */}
      <View className="gap-2.5 items-center bg-[#EDEFFB]/60 p-4.5 rounded-2xl border border-[#363062]/10">
        <Text className="text-sm font-bold text-[#363062]">Bagaimana Pengalaman Layanan Anda?</Text>
        <Text className="text-xs text-slate-500 mb-1">Berikan penilaian bintang untuk barber</Text>

        <View className="flex-row gap-3 justify-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              onPress={() => setRating(star)}
              className="p-1 active:scale-110">
              <Text className="text-3xl">
                {star <= rating ? '⭐' : '☆'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Review Text Input */}
      <View className="gap-2">
        <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider">Ulasan Singkat</Text>

        <TextInput
          className="h-28 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-[#363062] shadow-xs"
          placeholder="Tulis kesan & saran pelayanan cukur Anda (opsional)..."
          placeholderTextColor="#94A3B8"
          value={reviewText}
          onChangeText={setReviewText}
          multiline
          textAlignVertical="top"
          editable={!loading}
        />
      </View>

      {/* Tag Switcher Pills */}
      <View className="gap-2">
        <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider">Pilih Tag Pelayanan</Text>

        <View className="flex-row flex-wrap gap-2">
          {REVIEW_TAGS.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => toggleTag(tag)}
              className={`rounded-full px-4 py-2 border transition-all ${
                selectedTags.includes(tag)
                  ? 'border-[#D2691E] bg-orange-50'
                  : 'border-slate-200 bg-white'
              }`}>
              <Text
                className={`text-xs font-bold ${
                  selectedTags.includes(tag) ? 'text-[#D2691E]' : 'text-slate-600'
                }`}>
                {selectedTags.includes(tag) ? '✓ ' : ''}{tag}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Submit Action Button */}
      <AppButton
        label={loading ? 'Mengirim Ulasan...' : 'Kirim Ulasan Barber'}
        onPress={handleSubmit}
        disabled={rating === 0}
        loading={loading}
        size="lg"
        className="mt-2 rounded-xl shadow-xs"
      />
    </View>
  );
}
