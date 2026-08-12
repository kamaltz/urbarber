import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { AppCard } from '@/components/ui/AppCard';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'Bagaimana cara memesan layanan barber ke rumah?',
    answer:
      'Pilih barber pilihan Anda dari halaman Beranda atau Cari Barber, lalu tentukan layanan, tanggal, jam, dan lokasi rumah Anda di area Garut.',
  },
  {
    id: 'faq-2',
    question: 'Area mana saja yang didukung oleh URBarber?',
    answer:
      'Saat ini URBarber melayani pemesanan panggilan ke rumah (home-service) di wilayah Garut dan sekitarnya.',
  },
  {
    id: 'faq-3',
    question: 'Bagaimana status pemesanan saya diproses?',
    answer:
      'Pemesanan diawali dengan status Pending. Setelah barber mengonfirmasi, status berubah menjadi Accepted, lalu In Progress saat layanan berlangsung, dan Completed setelah selesai.',
  },
  {
    id: 'faq-4',
    question: 'Apakah saya bisa membatalkan pemesanan?',
    answer:
      'Ya, pemesanan dengan status Pending atau Accepted dapat dibatalkan melalui halaman Riwayat Booking sebelum layanan dimulai.',
  },
];

export default function HelpScreen() {
  const [openFaqId, setOpenFaqId] = useState<string | null>(FAQS[0].id);

  const toggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  return (
    <CustomerScreen
      title="Pusat Bantuan & FAQ"
      description="Pertanyaan yang sering diajukan seputar layanan panggil barber URBarber."
      scroll={false}
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Pertanyaan Populer
        </Text>

        <View className="gap-3 mb-6">
          {FAQS.map((faq) => {
            const isOpen = openFaqId === faq.id;
            return (
              <AppCard key={faq.id} className="p-4">
                <Pressable
                  onPress={() => toggleFaq(faq.id)}
                  className="flex-row items-center justify-between"
                >
                  <Text className="text-sm font-bold text-slate-900 flex-1 pr-2">
                    {faq.question}
                  </Text>
                  <Text className="text-base font-bold text-[#D2691E]">
                    {isOpen ? '−' : '+'}
                  </Text>
                </Pressable>
                {isOpen ? (
                  <View className="mt-3 pt-3 border-t border-slate-100">
                    <Text className="text-xs text-slate-600 leading-relaxed">
                      {faq.answer}
                    </Text>
                  </View>
                ) : null}
              </AppCard>
            );
          })}
        </View>

        <AppCard className="p-5 bg-[#FFF8F3] border-[#FBD38D] mb-6">
          <Text className="font-bold text-[#9C4221] text-sm mb-1">Butuh Bantuan Lainnya?</Text>
          <Text className="text-xs text-[#C05621] leading-relaxed">
            Tim dukungan URBarber siap membantu pertanyaan seputar aplikasi dan kendala pemesanan di wilayah Garut.
          </Text>
        </AppCard>
      </ScrollView>
    </CustomerScreen>
  );
}
