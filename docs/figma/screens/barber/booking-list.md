# Screen Identity

- Screen name: BOOKING LIST
- Figma node ID: 8115:7314
- Exact frame dimensions: 375 x 812
- Actor: Barber
- Purpose: Menampilkan daftar booking aktif/riwayat singkat dan ringkasan jumlah status.
- Proposed Expo Router route: src/app/(barber)/(tabs)/bookings.tsx
- Related use case: Barber memantau antrean dan membuka detail booking tertentu.

# Layout Structure

- Root container: 375 x 812, satu layar mobile portrait.
- Safe-area behavior: Top navigation + bottom tab bar sudah di frame; inset sistem eksplisit tidak ditampilkan, NEEDS_CONFIRMATION.
- Layout direction: Vertikal, konten list di area tengah.
- Section hierarchy:
- Top Navigation Bar "Daftar Pesanan"
- List kartu booking
- Summary strip status (Total/Selesai/Tertunda/Dibatalkan)
- Bottom tab bar
- Alignment: Kartu list rata tengah horizontal.
- Padding: Kartu dimulai sekitar x 20 px dari kiri.
- Gaps: Antar kartu berjarak vertikal konsisten; nilai token exact gap NEEDS_CONFIRMATION.
- Fixed and flexible dimensions:
- Card: sekitar 335.315 x 93.888
- Tombol detail mini: 82 x 19
- Summary strip: lebar penuh 375, tinggi 95
- Scroll behavior: Secara visual menampung banyak item; perilaku scroll tidak eksplisit, NEEDS_CONFIRMATION.
- Keyboard behavior: Tidak ada input field pada layar ini.

# Visual Properties

- Colors with exact values:
- Background: #FFFFFF
- Primary secondary brand panel: #D2691E
- Text primary dark: #1C1C1C
- Icon gray: #94A3B8
- White text/on-surface: #FFFFFF
- Typography family, size, weight, and line height:
- Poppins SemiBold 15 (nama pelanggan)
- Poppins Medium 12/14 (metadata dan summary)
- Poppins Regular 10 (status kecil)
- Border radius:
- Card radius sekitar 5.748
- Detail chip radius 5
- Borders: Tidak dominan, badge canceled menggunakan fill abu.
- Shadows: Card shadow terlihat 0 4 2 rgba(0,0,0,0.25).
- Opacity: Tidak ada opacity token khusus yang terlihat.
- Icon dimensions:
- Ikon status kecil 10 x 10
- Ikon summary 24 x 24
- Image dimensions and ratios: Tidak ada image content utama; hanya icon vector.
- Spacing values:
- Contoh card text start x sekitar 18.84
- Summary strip icon baseline sekitar y 645 pada frame.

# Reusable Components

- Name: BarberTopNav
- Purpose: Header dengan back action dan title layar.
- Props: title string, onBack function.
- Variants: default.
- States: default.
- Reuse opportunities: Semua layar operasional barber.

- Name: BookingListCard
- Purpose: Ringkasan satu booking.
- Props: bookingId string, customerName string, customerCode string, scheduleLabel string, status string, onPressDetail function.
- Variants: waiting, processing, cancelled.
- States: default, pressed.
- Reuse opportunities: Booking tab dan list compact lain.

- Name: BookingStatusBadge
- Purpose: Label status pada card.
- Props: status enum.
- Variants: Menunggu, Diproses, Batal, Dibatalkan.
- States: default.
- Reuse opportunities: Digunakan lintas detail/list.

- Name: BookingSummaryStrip
- Purpose: Menampilkan total dan breakdown status.
- Props: total number, completed number, pending number, cancelled number.
- Variants: default.
- States: loading, loaded.
- Reuse opportunities: Dashboard ringkas booking.

- Name: AppBottomTabsBarber
- Purpose: Navigasi antar area barber.
- Props: activeTab enum.
- Variants: beranda, pesanan, obrolan, profil.
- States: active, inactive.
- Reuse opportunities: Tab shell barber.

# Interaction and Navigation

- Pressable elements:
- Back arrow di top nav
- Tombol "Detail" pada card yang tersedia
- Item bottom tab
- Destination routes:
- Detail booking: src/app/(barber)/booking/[bookingId].tsx
- Tab tujuan lain mengikuti shell barber, NEEDS_CONFIRMATION.
- Back behavior: Kembali ke stack sebelumnya.
- Form submission: Tidak ada form.
- Validation: Tidak ada validasi input.
- Loading state: Skeleton/list loading tidak terlihat, NEEDS_CONFIRMATION.
- Success state: Tidak ada state success eksplisit.
- Error state: Tidak ada state error eksplisit.
- Disabled state: Item dibatalkan tampil tanpa CTA detail aktif, sesuai visual frame.

# Data Contract

- Field name: bookingId
- TypeScript type: string
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: bookings
- Future Firebase field: bookingId

- Field name: customerSummary
- TypeScript type: { customerId: string; customerName: string; customerCode: string }
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: users
- Future Firebase field: profile.summary

- Field name: service
- TypeScript type: { serviceId: string; serviceName: string } | null
- Required or optional: optional
- Editable or read-only: read-only
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: bookings
- Future Firebase field: service

- Field name: date
- TypeScript type: string
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: bookings
- Future Firebase field: schedule.date

- Field name: time
- TypeScript type: string
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: bookings
- Future Firebase field: schedule.time

- Field name: location
- TypeScript type: string | null
- Required or optional: optional
- Editable or read-only: read-only
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: bookings
- Future Firebase field: location.address

- Field name: notes
- TypeScript type: string | null
- Required or optional: optional
- Editable or read-only: read-only
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: bookings
- Future Firebase field: notes

- Field name: price
- TypeScript type: number | null
- Required or optional: optional
- Editable or read-only: read-only
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: bookings
- Future Firebase field: pricing.total

- Field name: bookingStatus
- TypeScript type: "waiting" | "processing" | "completed" | "cancelled"
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: bookings
- Future Firebase field: status

- Field name: acceptAction
- TypeScript type: ((bookingId: string) => Promise<void>) | null
- Required or optional: optional
- Editable or read-only: editable trigger
- Mock data source: local handler stub
- Future Firebase collection: bookings
- Future Firebase field: statusTransition.acceptedAt

- Field name: rejectAction
- TypeScript type: ((bookingId: string, reason?: string) => Promise<void>) | null
- Required or optional: optional
- Editable or read-only: editable trigger
- Mock data source: local handler stub
- Future Firebase collection: bookings
- Future Firebase field: statusTransition.rejectedAt

- Field name: startServiceAction
- TypeScript type: ((bookingId: string) => Promise<void>) | null
- Required or optional: optional
- Editable or read-only: editable trigger
- Mock data source: local handler stub
- Future Firebase collection: bookings
- Future Firebase field: statusTransition.startedAt

- Field name: completeServiceAction
- TypeScript type: ((bookingId: string) => Promise<void>) | null
- Required or optional: optional
- Editable or read-only: editable trigger
- Mock data source: local handler stub
- Future Firebase collection: bookings
- Future Firebase field: statusTransition.completedAt

# Business Rules

- Visual status yang terlihat di frame: Menunggu, Diproses, Batal/Dibatalkan, Selesai (di summary).
- Valid state transitions (usulan sesuai pola layar, final NEEDS_CONFIRMATION):
- waiting -> processing (setelah accept atau start service)
- waiting -> cancelled (reject/cancel)
- processing -> completed
- processing -> cancelled (hanya jika kebijakan mengizinkan, NEEDS_CONFIRMATION)
- completed tidak boleh kembali ke waiting/processing.
- cancelled tidak boleh di-start kembali.
- accept/reject/start/complete action tidak tampil eksplisit pada frame list ini; implementasi tindakan dilakukan di detail atau overflow action, NEEDS_CONFIRMATION.

# React Native Mapping

- View: Root, card, strip, tab containers.
- Text: Nama, metadata booking, status, angka summary.
- Pressable: Detail button, tab items, back control.
- TextInput: Tidak digunakan.
- Image: Ikon vector status/tab.
- ScrollView: Direkomendasikan untuk daftar booking.
- FlatList: Direkomendasikan untuk performa list booking.
- SafeAreaView: Wajib agar top/bottom inset aman.
- KeyboardAvoidingView: Tidak dibutuhkan pada layar ini.

# NativeWind Mapping

- Layout: flex-1, w-full, items-center.
- Spacing: px-5, py-3, gap-4.
- Typography: text-[15px], text-[14px], text-[12px], font-semibold, font-medium.
- Colors: bg-white, bg-orange-700, text-white, text-slate-900, text-slate-400.
- Radius: rounded-md, rounded-lg.
- Borders: border border-slate-300 untuk chip jika diperlukan.
- Alignment: justify-between, items-center, self-stretch.

# Component Tree

- BarberBookingListScreen
- SafeAreaWrapper
- BarberTopNav
- BookingListFlatList
- BookingListCard
- BookingStatusBadge
- BookingSummaryStrip
- AppBottomTabsBarber

# States

- loading
- loaded
- empty
- error
- waiting
- processing
- completed
- cancelled

# Implementation Notes

- Android concerns: Pastikan shadow dan touch target tetap konsisten di device Android beragam.
- Safe-area concerns: Bottom tab dan summary strip tidak boleh tertutup gesture area.
- Keyboard concerns: Tidak relevan karena tanpa input.
- Minimum-width concerns: Kartu 335 px masih aman di 360 dp dengan margin horizontal kecil.
- Firebase preparation notes: Simpan timeline transisi status di Firestore untuk audit state transition.
- Missing information: Aksi accept/reject/start/complete tidak terlihat langsung di frame ini, NEEDS_CONFIRMATION.
- Design inconsistencies: Status label card dan status label summary memakai istilah berbeda (Batal vs Dibatalkan), NEEDS_CONFIRMATION.
