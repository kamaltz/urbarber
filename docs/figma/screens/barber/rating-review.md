# Screen Identity

- Screen name: RATING REVIEW - BARBER
- Figma node ID: 8107:5960
- Exact frame dimensions: 375 x 812
- Actor: Barber
- Purpose: Menampilkan daftar ulasan pelanggan dan menyediakan aksi balas.
- Proposed Expo Router route: src/app/(barber)/reviews.tsx
- Related use case: Barber meninjau feedback pelanggan untuk peningkatan layanan.

# Layout Structure

- Root container: 375 x 812.
- Safe-area behavior: Top nav dan bottom tab hadir di frame.
- Layout direction: Vertikal list.
- Section hierarchy:
- Top navigation "Rating & Ulasan"
- Review card list (3 item pada frame)
- Bottom tab bar
- Alignment: Review card berada di x sekitar 26 dengan lebar ~333.446.
- Padding: Tiap card menggunakan layout konten internal compact.
- Gaps: Antar review card sekitar 100 px vertikal dari top posisi.
- Fixed and flexible dimensions:
- Review card height 83.838
- Avatar 34.297 x 34.297
- Star strip width 76.216
- Scroll behavior: Dengan daftar review panjang, harus scroll vertikal.
- Keyboard behavior: Tidak ada input pada frame list.

# Visual Properties

- Colors with exact values:
- Background: #FFFFFF
- Text primary: #171A1F
- Muted timestamp: #9095A0
- Accent border/avatar ring: #D3691F
- Secondary icon gray (tab): #94A3B8
- Typography family, size, weight, and line height:
- Nama reviewer: Poppins SemiBold 12
- Timestamp: Poppins Regular 12
- Komentar: Poppins Regular 12
- Aksi Balas: Poppins SemiBold 12
- Border radius:
- Card radius 5.716
- Avatar radius 17.149
- Borders:
- Border frame review sebagian transparan/tidak dominan.
- Shadows: Tidak ada shadow dominan.
- Opacity: Tidak ada opacity token utama.
- Icon dimensions:
- Bintang review 15.243 tiap icon.
- Image dimensions and ratios:
- Avatar square 34.297.
- Spacing values:
- Nama, waktu, komentar tersusun vertikal dalam area card.

# Reusable Components

- Name: ReviewListItem
- Purpose: Menampilkan satu ulasan dengan rating dan aksi balas.
- Props: reviewId string, reviewerName string, rating number, timestampLabel string, comment string, avatarUrl string | null, onReply function.
- Variants: 1-5 star.
- States: default, replying, replied.
- Reuse opportunities: List review barber/customer.

- Name: StarRatingDisplay
- Purpose: Menampilkan rating bintang read-only.
- Props: rating number, maxStars number.
- Variants: filled, partial (jika diperlukan).
- States: default.
- Reuse opportunities: Di summary dan detail review.

- Name: ReplyActionButtonText
- Purpose: Trigger aksi balas review.
- Props: onPress function, disabled boolean.
- Variants: default text action.
- States: default, pressed, disabled.
- Reuse opportunities: Semua item review dengan reply.

# Interaction and Navigation

- Pressable elements:
- Tombol "Balas" per review
- Back arrow nav
- Bottom tabs
- Destination routes:
- Balas dapat membuka composer atau thread chat/review detail, NEEDS_CONFIRMATION.
- Back behavior: Kembali ke stack sebelumnya.
- Form submission: Tidak ada submit pada list; submit balasan terjadi di layar/komponen lanjutan.
- Validation: Aturan isi balasan tidak terlihat di frame ini, NEEDS_CONFIRMATION.
- Loading state: Tidak terlihat.
- Success state: Tidak terlihat.
- Error state: Tidak terlihat.
- Disabled state: Tidak terlihat.

# Data Contract

- Field name: ratingAverage
- TypeScript type: number | null
- Required or optional: optional
- Editable or read-only: read-only
- Mock data source: local reviews aggregate mock
- Future Firebase collection: reviews_aggregates
- Future Firebase field: ratingAverage

- Field name: reviewCount
- TypeScript type: number
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: local reviews aggregate mock
- Future Firebase collection: reviews_aggregates
- Future Firebase field: reviewCount

- Field name: ratingDistribution
- TypeScript type: { star1: number; star2: number; star3: number; star4: number; star5: number }
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: local reviews aggregate mock
- Future Firebase collection: reviews_aggregates
- Future Firebase field: ratingDistribution

- Field name: reviewerIdentity
- TypeScript type: { reviewerId: string; reviewerName: string; avatarUrl: string | null }
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: reviews
- Future Firebase field: reviewer

- Field name: comment
- TypeScript type: string
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: reviews
- Future Firebase field: comment

- Field name: timestamp
- TypeScript type: string
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: reviews
- Future Firebase field: createdAt

- Field name: listStrategy
- TypeScript type: "pagination" | "infinite-scroll"
- Required or optional: required
- Editable or read-only: read-only (config)
- Mock data source: local config mock
- Future Firebase collection: app_config
- Future Firebase field: reviews.listStrategy

# Business Rules

- Data yang terlihat langsung pada frame:
- Reviewer: Anna Smith, John Doe, Emily Clark
- Timestamp relatif: 2 jam yang lalu, 1 hari yang lalu, 3 hari yang lalu
- Komentar: ditampilkan sebagai teks singkat
- Aksi: Balas
- rating average: Tidak ditampilkan eksplisit di frame ini, NEEDS_CONFIRMATION.
- review count: Tidak ditampilkan eksplisit di frame ini, NEEDS_CONFIRMATION.
- rating distribution: Tidak ditampilkan eksplisit di frame ini, NEEDS_CONFIRMATION.
- pagination/list strategy: Tidak terlihat visual; disarankan pagination atau infinite-scroll saat data besar, NEEDS_CONFIRMATION.

# React Native Mapping

- View: List row container, avatar+content area.
- Text: Nama, waktu, komentar, label aksi.
- Pressable: Balas, back, tab actions.
- TextInput: Tidak pada layar list.
- Image: Avatar dan icon bintang.
- ScrollView: Bisa dipakai untuk list kecil.
- FlatList: Direkomendasikan untuk review list.
- SafeAreaView: Wajib.
- KeyboardAvoidingView: Tidak dibutuhkan di list-only screen.

# NativeWind Mapping

- Layout: flex-1, w-full, items-stretch.
- Spacing: px-6, py-3, gap-3.
- Typography: text-[12px], font-semibold, font-normal.
- Colors: bg-white, text-[#171A1F], text-[#9095A0], text-slate-400.
- Radius: rounded-md, rounded-full.
- Borders: border border-slate-200 jika perlu separator halus.
- Alignment: justify-between, items-start, items-center.

# Component Tree

- BarberRatingReviewScreen
- SafeAreaWrapper
- BarberTopNav
- ReviewFlatList
- ReviewListItem
- StarRatingDisplay
- ReplyActionButtonText
- AppBottomTabsBarber

# States

- loading
- loaded
- empty
- error
- replying
- reply_success
- reply_error

# Implementation Notes

- Android concerns: FlatList virtualization penting untuk performa review panjang.
- Safe-area concerns: Tab bawah dan item terakhir review tidak boleh tertutup nav gesture.
- Keyboard concerns: Tidak relevan di list view.
- Minimum-width concerns: Card 333 px tetap aman pada 360 dp.
- Firebase preparation notes: Simpan aggregate review terpisah agar query cepat untuk average/count/distribution.
- Missing information: Aggregate metrics (average/count/distribution) tidak tampil di frame ini, NEEDS_CONFIRMATION.
- Design inconsistencies: Konten komentar review terlihat seperti generic testimonial, perlu konfirmasi apakah data real atau placeholder, NEEDS_CONFIRMATION.
