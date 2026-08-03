# Screen Identity

- Screen name: SCHEDULE MANAGEMENT
- Figma node ID: 8096:4939
- Exact frame dimensions: 375 x 945
- Actor: Barber
- Purpose: Mengatur jam kerja mingguan barber.
- Proposed Expo Router route: src/app/(barber)/(tabs)/schedule.tsx
- Related use case: Barber menentukan hari kerja dan jam operasional untuk menerima booking.

# Layout Structure

- Root container: 375 x 945.
- Safe-area behavior: Top nav dan bottom tab terlihat.
- Layout direction: Vertikal.
- Section hierarchy:
- Top Navigation "Atur Jadwal"
- Card "Pengaturan Jam Kerja"
- 7 row hari (Senin-Minggu)
- Tombol Simpan
- Bottom tab bar
- Alignment: Konten card lebar sekitar 339-350 di tengah.
- Padding: Card internal sekitar 17.839/13.379 (dari frame token).
- Gaps: Gap antar elemen card sekitar 17.839.
- Fixed and flexible dimensions:
- Card konten tinggi sekitar 370.528
- Time textbox sekitar 79.164 x 31.556
- Toggle sekitar 40.083 x 24.43
- Scroll behavior: Konten 945 lebih tinggi dari 812, berpotensi scroll pada device kecil.
- Keyboard behavior: Tidak ada input keyboard teks; waktu via time picker.

# Visual Properties

- Colors with exact values:
- Background: #FFFFFF
- Primary accent: #D2691E (var secunder)
- Gray icon: #94A3B8
- Text dark: #1C1C1C
- Time field border: #BCC1CA
- Toggle active fill: #D3691F
- Typography family, size, weight, and line height:
- Day label: Poppins Regular 15
- Section title: Poppins Medium/SemiBold 16
- Time value: Inter Regular sekitar 12.12
- Border radius:
- Time field radius 4.04
- Toggle radius 12.12
- CTA radius ~8.919
- Borders:
- Time field border 1.01 px #BCC1CA
- Shadows:
- Card shadow: 0 2.23 3.345 rgba(28,39,49,0.08)
- Opacity: Tidak ada opacity token utama.
- Icon dimensions: Clock icon sekitar 16.033 x 16.287.
- Image dimensions and ratios: Tidak ada image konten utama.
- Spacing values: Row hari berulang dengan offset top konsisten.

# Reusable Components

- Name: WeeklyScheduleCard
- Purpose: Container pengaturan jam kerja per hari.
- Props: days array, onToggleDay function, onChangeStartTime function, onChangeEndTime function.
- Variants: default.
- States: loaded, saving.
- Reuse opportunities: Layar schedule barber lain.

- Name: ScheduleDayRow
- Purpose: Menampilkan satu hari + toggle + rentang waktu.
- Props: dayKey string, isOpen boolean, startTime string | null, endTime string | null.
- Variants: open, closed.
- States: default, editing, disabled.
- Reuse opportunities: Semua planner jam mingguan.

- Name: TimeField
- Purpose: Trigger time picker untuk jam mulai/akhir.
- Props: value string | null, onPress function, disabled boolean.
- Variants: start, end.
- States: default, selected, disabled.
- Reuse opportunities: Form waktu di app.

- Name: SaveScheduleButton
- Purpose: Simpan konfigurasi jadwal.
- Props: onPress function, loading boolean, disabled boolean.
- Variants: primary.
- States: default, loading, disabled.
- Reuse opportunities: Form setting barber.

# Interaction and Navigation

- Pressable elements:
- Toggle setiap hari
- Field waktu mulai/akhir
- Tombol Simpan
- Bottom tab items
- Destination routes:
- Tab terkait melalui shell barber tabs
- Back ke screen sebelumnya lewat back arrow
- Back behavior: Standard stack back.
- Form submission: Tombol Simpan mengirim seluruh weekly schedule.
- Validation:
- Jika hari aktif, startTime dan endTime wajib terisi
- startTime < endTime
- Loading state: Tidak ditampilkan eksplisit.
- Success state: Tidak ditampilkan eksplisit.
- Error state: Tidak ditampilkan eksplisit.
- Disabled state: Tidak ditampilkan eksplisit.

# Data Contract

- Field name: barberId
- TypeScript type: string
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: barbers
- Future Firebase field: barberId

- Field name: workingDays
- TypeScript type: Array<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday">
- Required or optional: required
- Editable or read-only: editable
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: schedules
- Future Firebase field: workingDays

- Field name: startTime
- TypeScript type: string
- Required or optional: required (if day active)
- Editable or read-only: editable
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: schedules
- Future Firebase field: daily.{day}.startTime

- Field name: endTime
- TypeScript type: string
- Required or optional: required (if day active)
- Editable or read-only: editable
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: schedules
- Future Firebase field: daily.{day}.endTime

- Field name: unavailableDates
- TypeScript type: string[]
- Required or optional: optional
- Editable or read-only: editable
- Mock data source: local schedule mock
- Future Firebase collection: schedules
- Future Firebase field: unavailableDates

- Field name: bookedSlots
- TypeScript type: Array<{ date: string; startTime: string; endTime: string; bookingId: string }>
- Required or optional: optional
- Editable or read-only: read-only
- Mock data source: local joined booking mock
- Future Firebase collection: bookings
- Future Firebase field: slotAllocation

- Field name: slotDuration
- TypeScript type: number
- Required or optional: optional
- Editable or read-only: editable
- Mock data source: local schedule config
- Future Firebase collection: schedules
- Future Firebase field: slotDurationMinutes

# Business Rules

- Working days yang terlihat: Senin-Minggu, semua memiliki toggle.
- Jam terlihat pada frame:
- Senin-Jumat: 9:00-17:00
- Sabtu-Minggu: 10:00-15:00
- Hari inactive (toggle off) tidak boleh menerima booking baru.
- unavailableDates dipakai untuk libur khusus di luar pola mingguan, tidak terlihat visual di frame, NEEDS_CONFIRMATION.
- bookedSlots harus menandai slot terpakai agar tidak bisa dipilih lagi.
- Double-booking prevention:
- Slot baru tidak boleh overlap dengan bookedSlots
- Slot baru tidak boleh di luar jam kerja hari terkait
- slotDuration tidak ditampilkan langsung pada frame, NEEDS_CONFIRMATION.
- Future Firestore structure (usulan):
- collection: schedules
- doc id: barberId
- fields: timezone, workingDays, daily map, unavailableDates, slotDurationMinutes, updatedAt
- subcollection optional: overrides/{date}

# React Native Mapping

- View: Root/nav/card/day rows.
- Text: Label hari, label waktu, tombol.
- Pressable: Time fields, save button, tab/back controls.
- TextInput: Tidak digunakan untuk waktu (time picker trigger).
- Image: Ikon jam/vector.
- ScrollView: Direkomendasikan untuk layar 945.
- FlatList: Opsional untuk render 7 day rows.
- SafeAreaView: Wajib.
- KeyboardAvoidingView: Tidak wajib untuk current UI.

# NativeWind Mapping

- Layout: flex-1, w-full, items-center.
- Spacing: px-4, py-3, gap-4.
- Typography: text-[16px], text-[15px], font-medium, font-semibold.
- Colors: bg-white, text-slate-900, text-slate-400, bg-orange-700, border-slate-300.
- Radius: rounded-lg, rounded-xl.
- Borders: border, border-slate-300.
- Alignment: justify-between, items-center.

# Component Tree

- BarberScheduleScreen
- SafeAreaWrapper
- BarberTopNav
- WeeklyScheduleCard
- ScheduleDayRow x 7
- DayToggle
- StartTimeField
- EndTimeField
- SaveScheduleButton
- AppBottomTabsBarber

# States

- loading
- loaded
- editing
- saving
- save_success
- save_error

# Implementation Notes

- Android concerns: Komponen switch/time picker harus konsisten antar vendor Android.
- Safe-area concerns: Bottom tab dan tombol simpan harus tetap terlihat.
- Keyboard concerns: Tidak dominan karena tanpa text typing.
- Minimum-width concerns: Time fields tetap terbaca pada 360 dp.
- Firebase preparation notes: Sinkronkan schedules dengan bookings untuk blokir slot terpakai.
- Missing information: UX unavailable dates dan slotDuration belum divisualkan, NEEDS_CONFIRMATION.
- Design inconsistencies: Tab aktif tampak "Profil" sementara konteks layar jadwal operasional; final tab-active mapping NEEDS_CONFIRMATION.
