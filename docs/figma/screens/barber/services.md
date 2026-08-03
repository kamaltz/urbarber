# Screen Identity

- Screen name: BARBER - SERVICES
- Figma node ID: 8116:8322
- Exact frame dimensions: 375 x 1221
- Actor: Barber
- Purpose: Mengelola profil layanan barber (cover, alamat, jam buka, daftar harga layanan).
- Proposed Expo Router route: src/app/(barber)/(tabs)/services.tsx
- Related use case: Barber meninjau daftar layanan dan membuka flow tambah/edit.

# Layout Structure

- Root container: 375 x 1221 (lebih tinggi dari viewport standar).
- Safe-area behavior: Top nav tersedia; safe inset eksplisit belum ada, NEEDS_CONFIRMATION.
- Layout direction: Vertikal dengan konten panjang.
- Section hierarchy:
- Top Navigation "Layanan"
- Hero profil (nama + foto cover + edit)
- Deskripsi
- Field alamat
- Section Jam Buka (aksi Edit)
- Section Harga (list layanan)
- Item Tambah Layanan
- CTA Simpan
- Alignment: Konten utama berlebar 339 dalam frame 375.
- Padding: Mayoritas section memakai px 18.
- Gaps: Outer list gap 12-24 terlihat.
- Fixed and flexible dimensions:
- Foto cover 339 x 216
- Service avatar 44 x 44
- CTA Simpan lebar 339
- Scroll behavior: Wajib scroll vertikal karena tinggi konten > tinggi layar.
- Keyboard behavior: Field alamat dapat memicu keyboard; perilaku scroll-to-focus tidak terlihat, NEEDS_CONFIRMATION.

# Visual Properties

- Colors with exact values:
- Background: #FFFFFF
- Primary text: #111827
- Secondary text: #6B7280
- Border input: #D1D5DB
- Primary action: #D2691E
- Placeholder translucent: #22222270
- Typography family, size, weight, and line height:
- Heading/section: Poppins SemiBold 16
- Body text: Poppins Regular 14-16
- Service title visual: sekitar 18
- Border radius:
- Cover image radius 8
- Input radius 8
- Button radius 8
- Borders: Input border solid #D1D5DB.
- Shadows: Tidak ada shadow kuat pada section utama.
- Opacity: Placeholder memakai alpha pada gray trans.
- Icon dimensions: Edit/Add icon 24 x 24.
- Image dimensions and ratios:
- Cover ratio 339:216
- Service image square 44:44
- Spacing values:
- Section padding horizontal 18
- List row vertical py sekitar 8.

# Reusable Components

- Name: BarberServiceHero
- Purpose: Menampilkan identitas barbershop dan cover image.
- Props: shopName string, coverUrl string | null, onEditCover function.
- Variants: with-image, placeholder.
- States: default.
- Reuse opportunities: Profil barber, onboarding barber.

- Name: AddressInputRow
- Purpose: Menampilkan dan mengubah alamat barbershop.
- Props: value string, onChange function, placeholder string.
- Variants: editable, readonly.
- States: default, focused, error.
- Reuse opportunities: Profil usaha/barber.

- Name: OpeningHoursHeaderAction
- Purpose: Heading "Jam Buka" dengan aksi Edit.
- Props: onPressEdit function.
- Variants: default.
- States: default, pressed.
- Reuse opportunities: Section action header.

- Name: ServicePriceListItem
- Purpose: Menampilkan nama layanan, deskripsi, harga, thumbnail.
- Props: serviceId string, name string, description string, priceLabel string, imageUrl string | null, active boolean.
- Variants: active, inactive.
- States: default, pressed.
- Reuse opportunities: List layanan customer/barber.

- Name: AddServiceInlineItem
- Purpose: Entry point ke form tambah layanan.
- Props: onPressAdd function.
- Variants: default.
- States: default, pressed.
- Reuse opportunities: Digunakan saat list layanan butuh quick add.

- Name: SaveServicesButton
- Purpose: Menyimpan perubahan layanan/profil.
- Props: onPress function, loading boolean, disabled boolean.
- Variants: primary.
- States: default, loading, disabled.
- Reuse opportunities: Semua form barber settings.

# Interaction and Navigation

- Pressable elements:
- Edit cover icon
- Edit Jam Buka
- Tambah Layanan item
- Tombol Simpan
- Back arrow nav
- Destination routes:
- Schedule editor: src/app/(barber)/(tabs)/schedule.tsx
- Add service popup host: src/features/services/components/ServiceFormModal.tsx
- Back behavior: Kembali ke stack/tab sebelumnya.
- Form submission: Simpan mengirim perubahan profile/service list.
- Validation: Nama layanan dan harga tidak boleh invalid, detail di popup add.
- Loading state: Tidak ditampilkan eksplisit, NEEDS_CONFIRMATION.
- Success state: Tidak ditampilkan eksplisit, NEEDS_CONFIRMATION.
- Error state: Tidak ditampilkan eksplisit, NEEDS_CONFIRMATION.
- Disabled state: Tidak ditampilkan eksplisit, NEEDS_CONFIRMATION.

# Data Contract

- Field name: barberId
- TypeScript type: string
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: barbers
- Future Firebase field: barberId

- Field name: serviceId
- TypeScript type: string
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: services
- Future Firebase field: serviceId

- Field name: serviceName
- TypeScript type: string
- Required or optional: required
- Editable or read-only: editable
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: services
- Future Firebase field: name

- Field name: description
- TypeScript type: string
- Required or optional: optional
- Editable or read-only: editable
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: services
- Future Firebase field: description

- Field name: price
- TypeScript type: number
- Required or optional: required
- Editable or read-only: editable
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: services
- Future Firebase field: price

- Field name: duration
- TypeScript type: number | null
- Required or optional: optional
- Editable or read-only: editable
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: services
- Future Firebase field: durationMinutes

- Field name: activeStatus
- TypeScript type: boolean
- Required or optional: required
- Editable or read-only: editable
- Mock data source: src/mocks/barbers.ts
- Future Firebase collection: services
- Future Firebase field: isActive

# Business Rules

- serviceId harus unik per barber.
- serviceName wajib diisi.
- price wajib > 0.
- duration tidak terlihat di frame services list; bila dipakai harus > 0, NEEDS_CONFIRMATION.
- activeStatus false berarti layanan disembunyikan dari booking flow customer.
- create behavior: dari "Tambah Layanan" lalu submit popup.
- edit behavior: edit field/detail layanan; titik edit item per-row tidak terlihat eksplisit, NEEDS_CONFIRMATION.
- delete behavior: aksi hapus tidak terlihat pada frame, NEEDS_CONFIRMATION.
- validation behavior:
- nama kosong -> invalid
- harga non numerik/<=0 -> invalid
- duplicate nama dalam barber yang sama -> NEEDS_CONFIRMATION (boleh/tidak).

# React Native Mapping

- View: Semua container dan list row.
- Text: Heading, label, nama/deskripsi/harga layanan.
- Pressable: Edit/Add/Simpan/back actions.
- TextInput: Field alamat dan edit layanan bila inline.
- Image: Cover dan thumbnail layanan.
- ScrollView: Wajib untuk konten tinggi.
- FlatList: Direkomendasikan untuk daftar layanan.
- SafeAreaView: Wajib untuk top/bottom inset.
- KeyboardAvoidingView: Direkomendasikan saat edit alamat atau inline edit.

# NativeWind Mapping

- Layout: flex-1, w-full, items-stretch.
- Spacing: px-4, px-[18px], py-2, gap-3, gap-6.
- Typography: text-[16px] font-semibold, text-[14px] font-normal, text-[18px].
- Colors: bg-white, text-slate-900, text-slate-500, border-slate-300, bg-orange-700, text-white.
- Radius: rounded-lg, rounded-xl.
- Borders: border border-slate-300.
- Alignment: justify-between, items-center.

# Component Tree

- BarberServicesScreen
- SafeAreaWrapper
- BarberTopNav
- ServicesScrollContainer
- BarberServiceHero
- AddressInputRow
- OpeningHoursHeaderAction
- ServicePriceList
- ServicePriceListItem
- AddServiceInlineItem
- SaveServicesButton

# States

- loading
- loaded
- editing
- saving
- save_success
- save_error

# Implementation Notes

- Android concerns: Panjang konten tinggi perlu performa list efisien.
- Safe-area concerns: Tombol Simpan harus tetap aman dari nav gesture.
- Keyboard concerns: Edit alamat harus tetap terlihat saat keyboard muncul.
- Minimum-width concerns: Elemen 339 px masih kompatibel dengan 360 dp lewat inset responsif.
- Firebase preparation notes: Pisahkan data profile barber dan collection services (one-to-many).
- Missing information: Aksi delete dan edit per service item tidak terlihat eksplisit, NEEDS_CONFIRMATION.
- Design inconsistencies: Judul shop "The Winner Barbershop" sementara deskripsi menyebut "Masterpiece Barbershop", NEEDS_CONFIRMATION.
