# Screen Identity

- Screen name: TRANSACTION DETAIL
- Figma node ID: 8240:19130
- Exact frame dimensions: 375 x 812
- Actor: Barber
- Purpose: Menampilkan detail booking/transaksi di dalam pop-up overlay.
- Proposed Expo Router route: src/app/(barber)/booking/[bookingId].tsx
- Related use case: Barber meninjau detail pelanggan, jadwal, dan ringkasan pembayaran sebelum mengambil aksi.

# Layout Structure

- Root container: 375 x 812.
- Safe-area behavior: Top nav tetap terlihat; detail muncul sebagai panel bawah. Inset eksplisit tidak ditampilkan, NEEDS_CONFIRMATION.
- Layout direction: Layered layout (overlay + bottom popup), konten popup vertikal.
- Section hierarchy:
- Overlay dim layer
- Bottom popup "[POP UP] TRX DETAIL"
- Modal header
- Identity and schedule rows
- Ringkasan pembayaran
- CTA "Batalkan"
- Alignment: Konten popup terpusat horizontal dengan lebar 375.
- Padding: Header 18 px horizontal, row list mengikuti lebar 339-350.
- Gaps: Antar section utama 24 px.
- Fixed and flexible dimensions:
- Popup height 632
- Header popup height mengikuti py 16
- CTA 339 x tinggi sekitar 50+
- Scroll behavior: Frame tidak menunjukkan scroll; jika data panjang perlu scroll internal, NEEDS_CONFIRMATION.
- Keyboard behavior: Tidak ada input di frame ini.

# Visual Properties

- Colors with exact values:
- Overlay: rgba(28,28,28,0.25)
- Popup background: #FFFFFF
- Header background: #EDEFFB
- Header icon box border: #EBF0F5
- Primary text: #111827
- Separator dash: #C3C1D0
- Destructive CTA: #B83737
- Typography family, size, weight, and line height:
- Header title: Poppins SemiBold 16
- Detail labels/value: Inter medium/regular sekitar 14
- Summary rows: Poppins Regular/SemiBold 15-16
- Border radius:
- Popup top radius 28
- Header top radius 24
- Button radius 8
- Borders:
- Featured icon border 1 px #EBF0F5
- Shadows: Tidak ada shadow eksplisit pada popup.
- Opacity: Overlay 25%.
- Icon dimensions: Header icon 24 dalam box 48.
- Image dimensions and ratios: Tidak ada image konten utama.
- Spacing values:
- Row detail vertikal sekitar 30 px antar blok
- Summary list gap 18 px.

# Reusable Components

- Name: TransactionDetailSheet
- Purpose: Menampilkan detail booking dalam panel overlay.
- Props: visible boolean, booking object, onClose function.
- Variants: full-detail.
- States: open, closing.
- Reuse opportunities: Popup detail transaksi lain.

- Name: DetailKeyValueRow
- Purpose: Render pasangan label-value (No Transaksi, Nama, Jadwal, dsb).
- Props: label string, value string, multiline boolean.
- Variants: single-line, multi-line.
- States: default.
- Reuse opportunities: Halaman detail order/pembayaran.

- Name: PaymentSummaryList
- Purpose: Render line items harga dan total.
- Props: items array, total string.
- Variants: with-discount, without-discount.
- States: loaded, empty.
- Reuse opportunities: Invoice, checkout review.

- Name: DestructiveActionButton
- Purpose: Aksi cancel booking.
- Props: label string, onPress function, disabled boolean, loading boolean.
- Variants: destructive.
- States: default, pressed, loading, disabled.
- Reuse opportunities: Cancel action lain.

# Interaction and Navigation

- Pressable elements:
- Tombol close pada header popup
- Tombol "Batalkan"
- Destination routes:
- Close kembali ke list: src/app/(barber)/(tabs)/bookings.tsx
- Back top nav juga kembali ke list booking.
- Back behavior: Menutup popup lalu kembali konteks list.
- Form submission: Tidak ada form input.
- Validation: Aksi batal harus valid terhadap status booking (tidak boleh membatalkan completed), NEEDS_CONFIRMATION.
- Loading state: Tidak ditampilkan.
- Success state: Tidak ditampilkan.
- Error state: Tidak ditampilkan.
- Disabled state: Tidak ditampilkan.

# Data Contract

- Field name: bookingId
- TypeScript type: string
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: bookings
- Future Firebase field: bookingId

- Field name: customerSummary
- TypeScript type: { customerId: string; customerName: string }
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: users
- Future Firebase field: profile.summary

- Field name: service
- TypeScript type: { serviceId: string; serviceName: string }[]
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: bookings
- Future Firebase field: service.items

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
- TypeScript type: string
- Required or optional: required
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
- TypeScript type: { subtotal: number; discount: number; total: number; currency: "IDR" }
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: bookings
- Future Firebase field: pricing

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
- Mock data source: local stub
- Future Firebase collection: bookings
- Future Firebase field: statusTransition.acceptedAt

- Field name: rejectAction
- TypeScript type: ((bookingId: string, reason?: string) => Promise<void>) | null
- Required or optional: optional
- Editable or read-only: editable trigger
- Mock data source: local stub
- Future Firebase collection: bookings
- Future Firebase field: statusTransition.rejectedAt

- Field name: startServiceAction
- TypeScript type: ((bookingId: string) => Promise<void>) | null
- Required or optional: optional
- Editable or read-only: editable trigger
- Mock data source: local stub
- Future Firebase collection: bookings
- Future Firebase field: statusTransition.startedAt

- Field name: completeServiceAction
- TypeScript type: ((bookingId: string) => Promise<void>) | null
- Required or optional: optional
- Editable or read-only: editable trigger
- Mock data source: local stub
- Future Firebase collection: bookings
- Future Firebase field: statusTransition.completedAt

# Business Rules

- Nilai yang terlihat pada frame:
- No Transaksi #12345
- Nama Pelanggan Raka Mahesa
- Jadwal Selasa, 17 Jan 2025, 13:00 WIB
- Payment method BRI 1234567890
- Line item: Potongan Rambut Biasa 30k, Pijat Ekstra 15k, Diskon kupon -5k, Total 40K
- Aksi yang terlihat hanya Batalkan.
- Accept/reject/start-service/complete-service tidak terlihat di frame detail ini, NEEDS_CONFIRMATION.
- Valid state transitions (usulan operasional):
- waiting -> processing (accept/start)
- waiting -> cancelled (reject)
- processing -> completed (complete-service)
- processing -> cancelled (jika policy mengizinkan, NEEDS_CONFIRMATION)
- completed terminal.
- cancelled terminal.

# React Native Mapping

- View: Overlay, sheet, sections.
- Text: Header, detail rows, harga rows.
- Pressable: Close dan Batalkan.
- TextInput: Tidak digunakan.
- Image: Ikon header/vector.
- ScrollView: Optional jika item layanan lebih banyak.
- FlatList: Optional untuk daftar line items.
- SafeAreaView: Ya, untuk layer dasar.
- KeyboardAvoidingView: Tidak diperlukan.

# NativeWind Mapping

- Layout: flex-1, absolute inset-0, justify-end.
- Spacing: px-4, py-4, gap-6.
- Typography: text-[16px] font-semibold, text-[15px] font-normal.
- Colors: bg-white, bg-black/25, bg-[#EDEFFB], text-slate-900, bg-red-700, text-white.
- Radius: rounded-t-3xl, rounded-xl, rounded-lg.
- Borders: border border-slate-200.
- Alignment: items-center, justify-between.

# Component Tree

- BarberBookingDetailScreen
- SafeAreaWrapper
- BookingListContextHeader
- OverlayBackdrop
- TransactionDetailSheet
- SheetHeader
- DetailKeyValueList
- PaymentSummaryList
- DestructiveActionButton

# States

- open
- loading_detail
- loaded
- cancel_loading
- cancel_success
- cancel_error

# Implementation Notes

- Android concerns: Bottom-sheet gesture/back behavior harus sinkron dengan hardware back.
- Safe-area concerns: Sheet bottom button tidak boleh tertutup gesture nav.
- Keyboard concerns: Tidak relevan untuk frame ini.
- Minimum-width concerns: Layout 339-350 masih aman di 360 dp dengan inset adaptif.
- Firebase preparation notes: Simpan event transisi status dan alasan cancel di bookings subdocument/history.
- Missing information: Trigger untuk accept/reject/start/complete tidak tersedia visual di frame ini, NEEDS_CONFIRMATION.
- Design inconsistencies: Judul top nav belakang menunjukkan konteks list "Daftar Pesanan" saat popup detail aktif; final UX transisi back perlu konfirmasi, NEEDS_CONFIRMATION.
