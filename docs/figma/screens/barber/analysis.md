# Screen Identity

- Screen name: Progress analysis - BARBER
- Figma node ID: 8115:7655
- Exact frame dimensions: 375 x 812
- Actor: Barber
- Purpose: Menyajikan ringkasan progres order, pendapatan periodik, chart statistik, dan cuplikan ulasan terbaru.
- Proposed Expo Router route: src/app/(barber)/analysis.tsx
- Related use case: Barber memantau performa operasional secara cepat.

# Layout Structure

- Root container: 375 x 812.
- Safe-area behavior: Top nav dan bottom tab tersedia visual.
- Layout direction: Vertikal card-based.
- Section hierarchy:
- Top Navigation "Analisa Progres"
- KPI card atas (pesanan masuk & selesai)
- Mini chart card statistik
- Ringkasan pendapatan harian/mingguan/bulanan
- Ulasan terbaru + tombol Balas
- Bottom tab
- Alignment: Konten card berlebar sekitar 338-373.
- Padding: Card statistik memiliki padding sekitar 10.092.
- Gaps: Gap card dan internal section terdefinisi oleh token kecil (sekitar 6-12 unit skala frame).
- Fixed and flexible dimensions:
- KPI card tinggi 126.332
- Chart card 338 x 164
- Revenue summary card tinggi 93.792
- Scroll behavior: Frame 812 pas viewport; jika konten dinamis bertambah perlu scroll.
- Keyboard behavior: Tidak ada input typing.

# Visual Properties

- Colors with exact values:
- Background: #FFFFFF
- Accent numbers: #D2691E
- Dark text/token: #16192C, #1C1C1C
- Body text/token: #425466, #565E6C
- Border light: #EDF2F7
- Table head text: #8492A6
- White: #FFFFFF
- Typography family, size, weight, and line height:
- KPI numeric: sekitar 21-22.97
- KPI labels: sekitar 14.356
- Section title: Poppins SemiBold 15
- Chart micro labels: Inter SemiBold ~4.21-6.73
- Border radius:
- Chart card radius 16
- Small button radius 4
- Borders:
- Chart export button border 0.421 #EDF2F7
- Shadows:
- shadow-sm token: 0 3 8 -1 #3232470D + 0 0 1 0 #0C1A4B3D
- Opacity: Tidak ada opacity token utama selain shadow alpha.
- Icon dimensions: KPI icon sekitar 28.712.
- Image dimensions and ratios: Chart adalah image/vector ter-embed.
- Spacing values: KPI dan chart menggunakan spacing mikro detail dari Figma.

# Reusable Components

- Name: KpiSummaryCard
- Purpose: Menampilkan KPI angka dan label.
- Props: items array { label string; value number; icon string }.
- Variants: two-kpi.
- States: default, loading.
- Reuse opportunities: Dashboard ringkas lainnya.

- Name: RevenueTrendMiniChart
- Purpose: Menampilkan trend pendapatan berbentuk line chart mini.
- Props: title string, legendLabel string, xValues number[], yValues number[], onExport function.
- Variants: default.
- States: loaded, empty, loading.
- Reuse opportunities: Analytics mini card.

- Name: RevenuePeriodSummary
- Purpose: Menampilkan angka harian, mingguan, bulanan.
- Props: daily string, weekly string, monthly string.
- Variants: 3-column summary.
- States: default.
- Reuse opportunities: Finance summary panels.

- Name: LatestReviewSnippet
- Purpose: Menampilkan satu ulasan terbaru dan aksi balas.
- Props: reviewerName string, rating number, comment string, onReply function.
- Variants: default.
- States: loaded, empty.
- Reuse opportunities: Overview review di dashboard.

# Interaction and Navigation

- Pressable elements:
- Tombol Export pada chart card
- Tombol Balas pada cuplikan ulasan
- Bottom tabs + back arrow
- Destination routes:
- Balas dapat mengarah ke src/app/(barber)/reviews.tsx atau chat flow, NEEDS_CONFIRMATION.
- Form submission: Tidak ada form.
- Validation: Tidak ada validasi input user pada layar ini.
- Loading state: Tidak terlihat.
- Success state: Tidak terlihat.
- Error state: Tidak terlihat.
- Disabled state: Tidak terlihat.

# Data Contract

- Field name: incomingOrders
- TypeScript type: number
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: local analytics mock
- Future Firebase collection: analytics_barber
- Future Firebase field: incomingOrders

- Field name: completedOrders
- TypeScript type: number
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: local analytics mock
- Future Firebase collection: analytics_barber
- Future Firebase field: completedOrders

- Field name: dailyRevenue
- TypeScript type: number
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: local analytics mock
- Future Firebase collection: analytics_barber
- Future Firebase field: revenue.daily

- Field name: weeklyRevenue
- TypeScript type: number
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: local analytics mock
- Future Firebase collection: analytics_barber
- Future Firebase field: revenue.weekly

- Field name: monthlyRevenue
- TypeScript type: number
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: local analytics mock
- Future Firebase collection: analytics_barber
- Future Firebase field: revenue.monthly

- Field name: chartSeries
- TypeScript type: { x: number; y: number }[]
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: local analytics mock
- Future Firebase collection: analytics_barber
- Future Firebase field: revenueTrend.series

- Field name: latestReview
- TypeScript type: { reviewerName: string; rating: number; comment: string } | null
- Required or optional: optional
- Editable or read-only: read-only
- Mock data source: local review mock
- Future Firebase collection: reviews
- Future Firebase field: latestSnippet

# Business Rules

- Exact metrics visible in Figma:
- Pesanan Masuk: 24
- Pesanan yang diselesaikan: 326
- HARIAN: 220k
- MINGGUAN: 720k
- BULANAN: 4020k
- Chart type: line chart mini (single series "Pendapatan").
- Date period visible:
- X axis labels: 0, 3, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31
- Y axis labels: 0, 1, 2, 3, 4
- Empty data state: Tidak ditampilkan pada frame, NEEDS_CONFIRMATION.
- Calculated values:
- Revenue period values adalah agregat, sumber perhitungan tidak terlihat visual.
- Computation placement recommendation:
- Agregasi utama (daily/weekly/monthly + trend) di repository layer/backend query untuk konsistensi.
- Client layer hanya formatting dan presentasi.
- Tidak menambahkan metrik finansial lain di luar yang terlihat.

# React Native Mapping

- View: Semua card/section wrappers.
- Text: KPI, label period, chart labels, review text.
- Pressable: Export, Balas, back/tab.
- TextInput: Tidak digunakan.
- Image: Ikon KPI, chart asset, bintang review.
- ScrollView: Opsional jika konten dinamis bertambah.
- FlatList: Tidak wajib untuk frame saat ini.
- SafeAreaView: Wajib.
- KeyboardAvoidingView: Tidak dibutuhkan.

# NativeWind Mapping

- Layout: flex-1, w-full, items-center.
- Spacing: px-4, py-3, gap-4.
- Typography: text-[15px] font-semibold, text-[14px], text-[13px].
- Colors: bg-white, text-slate-900, text-slate-600, text-orange-700, border-slate-200.
- Radius: rounded-2xl, rounded-lg.
- Borders: border, border-slate-200.
- Alignment: justify-between, items-start, items-center.

# Component Tree

- BarberAnalysisScreen
- SafeAreaWrapper
- BarberTopNav
- KpiSummaryCard
- RevenueTrendMiniChart
- RevenuePeriodSummary
- LatestReviewSnippet
- AppBottomTabsBarber

# States

- loading
- loaded
- empty
- export_loading
- export_success
- export_error

# Implementation Notes

- Android concerns: Chart asset dan teks mikro harus tetap terbaca di densitas layar berbeda.
- Safe-area concerns: Top nav dan bottom tab tidak boleh overlap status/gesture bar.
- Keyboard concerns: Tidak relevan.
- Minimum-width concerns: Card width 338 masih aman di 360 dp dengan margin kecil.
- Firebase preparation notes: Simpan pipeline agregat analytics terpisah dari transactional bookings.
- Missing information: Definisi window period (timezone cutoff) tidak terlihat, NEEDS_CONFIRMATION.
- Design inconsistencies: Angka period memakai format k tanpa format currency detail; normalisasi format ditentukan implementasi, NEEDS_CONFIRMATION.
