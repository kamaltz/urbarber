# Screen Identity

- Screen name: [POP UP] ADD SERVICES
- Figma node ID: 8120:8662
- Exact frame dimensions: 375 x 586
- Actor: Barber
- Purpose: Menambahkan layanan baru (nama, harga, foto).
- Proposed Expo Router route: src/features/services/components/ServiceFormModal.tsx
- Related use case: Quick create service dari layar services.

# Layout Structure

- Root container: 375 x 586.
- Safe-area behavior: Ada home indicator visual pada bawah panel.
- Layout direction: Vertikal.
- Section hierarchy:
- Modal header (title + close)
- Field Nama Layanan
- Field Harga Layanan
- Field Foto Layanan + helper format
- CTA Tambahkan
- Home indicator
- Alignment: Konten utama di lebar 339, center horizontal.
- Padding: Header px 18, field stack rapat.
- Gaps: gap 24 antar section utama, gap 8 antar label-field.
- Fixed and flexible dimensions:
- Panel full width 375
- Input width 339
- CTA width 339
- Scroll behavior: Tidak terlihat butuh scroll untuk tinggi default.
- Keyboard behavior: Saat mengetik nama/harga keyboard akan muncul; perilaku dorong konten NEEDS_CONFIRMATION.

# Visual Properties

- Colors with exact values:
- Background panel: #FFFFFF
- Header background: #EDEFFB
- Header icon border: #EBF0F5
- Text primary: #111827
- Border input: #D1D5DB
- Placeholder alpha: #22222270
- Primary action: #D2691E
- Home indicator: #E0E0E0
- Typography family, size, weight, and line height:
- Header title: Poppins SemiBold 16
- Section title: Poppins SemiBold 15
- Label field: Poppins Regular 14
- Helper text: Poppins Regular 12
- Border radius:
- Panel top radius 28
- Header top radius 24
- Input/button radius 8
- Borders: Input stroke 1 px #D1D5DB.
- Shadows: Tidak ada shadow eksplisit pada panel.
- Opacity: Placeholder menggunakan alpha color.
- Icon dimensions: Close/icon kecil 24, featured box 48.
- Image dimensions and ratios: Foto layanan belum preview di frame.
- Spacing values: helper text berada di bawah field foto.

# Reusable Components

- Name: ServiceFormModalHeader
- Purpose: Judul form dan close control.
- Props: title string, onClose function.
- Variants: add-service.
- States: default.
- Reuse opportunities: Modal create/edit service.

- Name: ServiceNameField
- Purpose: Input nama layanan.
- Props: value string, onChangeText function, placeholder string.
- Variants: default.
- States: default, focused, error, disabled.
- Reuse opportunities: Form service create/edit.

- Name: ServicePriceField
- Purpose: Input harga dengan prefix Rp.
- Props: value string, onChangeText function, currencyPrefix string.
- Variants: idr.
- States: default, focused, error, disabled.
- Reuse opportunities: Semua input pricing layanan.

- Name: ServicePhotoPickerField
- Purpose: Pilih aset foto layanan.
- Props: fileName string | null, onPickFile function, helperText string.
- Variants: empty, selected.
- States: default, picking, error.
- Reuse opportunities: Upload media untuk service/profile.

- Name: AddServiceSubmitButton
- Purpose: Submit create service.
- Props: onPress function, disabled boolean, loading boolean.
- Variants: primary.
- States: default, loading, disabled.
- Reuse opportunities: Tombol submit standar form modal.

# Interaction and Navigation

- Pressable elements:
- Close icon
- Picker foto
- Tombol Tambahkan
- Destination routes: Kembali ke parent services screen setelah close/submit.
- Back behavior: Tutup popup kembali ke src/app/(barber)/(tabs)/services.tsx.
- Form submission: Tambahkan mengirim payload create service.
- Validation:
- nama wajib
- harga wajib valid
- format foto .jpg/.png
- ukuran foto <= 10MB
- Loading state: Tidak tampil di frame, NEEDS_CONFIRMATION.
- Success state: Tidak tampil di frame, NEEDS_CONFIRMATION.
- Error state: Tidak tampil di frame, NEEDS_CONFIRMATION.
- Disabled state: Tidak tampil di frame, NEEDS_CONFIRMATION.

# Data Contract

- Field name: serviceId
- TypeScript type: string
- Required or optional: required (generated)
- Editable or read-only: read-only
- Mock data source: local uuid generator
- Future Firebase collection: services
- Future Firebase field: serviceId

- Field name: barberId
- TypeScript type: string
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: auth mock session
- Future Firebase collection: services
- Future Firebase field: barberId

- Field name: serviceName
- TypeScript type: string
- Required or optional: required
- Editable or read-only: editable
- Mock data source: local form state
- Future Firebase collection: services
- Future Firebase field: name

- Field name: description
- TypeScript type: string | null
- Required or optional: optional
- Editable or read-only: editable
- Mock data source: local form state
- Future Firebase collection: services
- Future Firebase field: description

- Field name: price
- TypeScript type: number
- Required or optional: required
- Editable or read-only: editable
- Mock data source: local form state
- Future Firebase collection: services
- Future Firebase field: price

- Field name: duration
- TypeScript type: number | null
- Required or optional: optional
- Editable or read-only: editable
- Mock data source: local form state
- Future Firebase collection: services
- Future Firebase field: durationMinutes

- Field name: activeStatus
- TypeScript type: boolean
- Required or optional: required
- Editable or read-only: editable
- Mock data source: local default true
- Future Firebase collection: services
- Future Firebase field: isActive

# Business Rules

- UI pattern decision: bottom sheet modal.
- Evidence: Top corners rounded besar, dimungkinkan dipanggil di atas parent screen, dan ada home-indicator style di bagian bawah.
- serviceName wajib terisi.
- price wajib numeric dan > 0.
- foto layanan menerima .jpg/.png dengan max 10MB.
- description dan duration tidak ditampilkan eksplisit di frame add popup ini, NEEDS_CONFIRMATION.
- create behavior: submit sukses menambah item ke list services.
- edit/delete behavior: tidak ada kontrol edit/delete pada popup ini; di-handle di layar lain, NEEDS_CONFIRMATION.

# React Native Mapping

- View: Panel, header, section wrappers.
- Text: Label, helper, title.
- Pressable: Close, picker, submit.
- TextInput: Nama layanan, harga.
- Image: Ikon/vector.
- ScrollView: Opsional; tidak wajib untuk konten saat ini.
- FlatList: Tidak digunakan.
- SafeAreaView: Digunakan pada parent host.
- KeyboardAvoidingView: Direkomendasikan di modal host.

# NativeWind Mapping

- Layout: absolute bottom-0 w-full, flex-col, items-center.
- Spacing: px-4, py-4, gap-6, gap-2.
- Typography: text-[16px] font-semibold, text-[15px], text-[14px], text-[12px].
- Colors: bg-white, bg-[#EDEFFB], text-slate-900, border-slate-300, bg-orange-700, text-white.
- Radius: rounded-t-3xl, rounded-xl, rounded-lg.
- Borders: border border-slate-300.
- Alignment: justify-between, items-center, self-stretch.

# Component Tree

- ServiceFormModal
- ModalBackdrop
- ServiceFormModalPanel
- ServiceFormModalHeader
- ServiceNameField
- ServicePriceField
- ServicePhotoPickerField
- AddServiceSubmitButton
- HomeIndicator

# States

- closed
- open
- editing
- validating
- submit_loading
- submit_success
- submit_error

# Implementation Notes

- Android concerns: Modal keyboard handling dan back button hardware harus menutup modal dengan aman.
- Safe-area concerns: Panel bawah harus mempertahankan jarak ke gesture area.
- Keyboard concerns: Field harga/nama bisa tertutup keyboard tanpa KeyboardAvoidingView.
- Minimum-width concerns: Input 339 px harus adaptif pada perangkat 360 dp.
- Firebase preparation notes: Upload foto ke Storage dan metadata ke Firestore services collection dilakukan di fase implementasi berikutnya.
- Missing information: Field deskripsi/durasi tidak tampil di popup ini, NEEDS_CONFIRMATION.
- Design inconsistencies: Header icon bertema question square bukan icon layanan; semantik icon perlu konfirmasi desain, NEEDS_CONFIRMATION.
