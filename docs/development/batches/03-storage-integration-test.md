# Batch 03: Storage Integration & Media Upload Workflow

## 1. Scope
Wiring Expo ImagePicker with Supabase Storage service across profile avatar edits, barber storefront media uploads, and service image attachments. Validates real image picking, upload progress, error handling, and public URL rendering in image UI primitives.

---

## 2. Affected Files

- `[MODIFY]` [storage.service.ts](file:///e:/app/urbarber/src/features/services/storage.service.ts) (Add helper methods for `uploadAvatar`, `uploadBarberMedia`, `uploadServiceImage`)
- `[NEW]` [use-image-upload.ts](file:///e:/app/urbarber/src/features/services/hooks/use-image-upload.ts) (Custom React hook managing image picker state, upload loading, progress, and error state)
- `[NEW]` [ImagePickerButton.tsx](file:///e:/app/urbarber/src/components/ui/ImagePickerButton.tsx) (Reusable UI component with avatar/image overlay and upload spinner)

---

## 3. Acceptance Criteria

1. Tapping `ImagePickerButton` triggers device media library permission prompt (`expo-image-picker`).
2. Selecting an image crops/edits and returns image asset.
3. Invoking `useImageUpload` uploads selected file to Supabase `public-media` bucket and returns public URL string.
4. Public image URLs load properly in NativeWind `<Image>` / `expo-image` components without CORS or policy errors.
5. Errors during permission denial or upload failure present user-friendly error banners.

---

## 4. Validation Commands

Execute the following commands in the workspace root:
```bash
npm run check
npm run doctor
git diff --check
```

---

## 5. Manual User Actions

- MANUAL ACTION REQUIRED: Verify `public-media` bucket objects in Supabase Dashboard after testing an upload.
- MANUAL ACTION REQUIRED: Test image picker on physical Android device or emulator to confirm gallery permissions.

---

## 6. Rollback Notes

If media upload hooks break UI components:
1. Revert new component additions: delete `ImagePickerButton.tsx` and `use-image-upload.ts`.
2. Revert modifications to `storage.service.ts`.
3. Verify basic image rendering fallback before re-attempting upload hooks.
