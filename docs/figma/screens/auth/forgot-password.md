# Screen Identity

- Screen name: FORGOT PASSWORD
- Figma node ID: 8062:7553
- Exact frame dimensions: 375 x 812
- Actor: Returning user
- Purpose: Start password reset by submitting account email.
- Proposed Expo Router route: src/app/(auth)/forgot-password.tsx
- Related use case: User requests reset link or reset code after forgetting password.

# Layout Structure

- Root container: Single full-screen frame 375 x 812.
- Safe-area behavior: Safe-area insets not explicitly defined in metadata, NEEDS_CONFIRMATION.
- Layout direction: Vertical stack.
- Section hierarchy: Title/description, single email field, primary submit CTA.
- Alignment: Content block centered horizontally.
- Padding: Effective horizontal inset appears 18 px from 339 content width.
- Gaps: Visual gaps exist between text, field, and button; exact numeric tokens NEEDS_CONFIRMATION.
- Fixed and flexible dimensions: CTA fixed 339 x 54, root fixed width 375, container height content-driven.
- Scroll behavior: Not indicated as scrollable.
- Keyboard behavior: Email field requires keyboard-safe behavior; exact strategy NEEDS_CONFIRMATION.

# Visual Properties

- Colors with exact values: Background #FFFFFF, CTA #D2691E, primary text #111827.
- Typography family, size, weight, and line height: Family appears Poppins; exact token-by-token values not fully exposed, NEEDS_CONFIRMATION.
- Border radius: Button/input radius present visually; numeric value NEEDS_CONFIRMATION.
- Borders: Input border visible; exact stroke color and width NEEDS_CONFIRMATION.
- Shadows: No explicit shadow token exposed.
- Opacity: No explicit opacity token exposed.
- Icon dimensions: No icon confirmed in the visible section.
- Image dimensions and ratios: No image asset confirmed.
- Spacing values: Content width confirms side inset; detailed vertical spacing NEEDS_CONFIRMATION.

# Reusable Components

- Name: AuthHeaderBlock
- Purpose: Explain reset flow and required action.
- Props: title string, description string.
- Variants: forgot-password.
- States: default.
- Reuse opportunities: Shared title/description block pattern across auth screens.

- Name: AuthTextField
- Purpose: Capture email input.
- Props: label string, value string, placeholder string, keyboardType "email-address".
- Variants: email.
- States: default, focused, error, disabled.
- Reuse opportunities: Reusable in login/register.

- Name: PrimaryActionButton
- Purpose: Submit reset request.
- Props: label string, disabled boolean, loading boolean, onPress function.
- Variants: primary.
- States: default, pressed, loading, disabled.
- Reuse opportunities: Shared with auth forms.

# Interaction and Navigation

- Pressable elements: Reset CTA.
- Destination routes: Post-submit route not shown in frame, NEEDS_CONFIRMATION.
- Back behavior: Back element not explicitly visible in frame.
- Form submission: Email payload submitted on CTA press.
- Validation: Email required and format-valid.
- Loading state: Not depicted, NEEDS_CONFIRMATION.
- Success state: Not depicted, NEEDS_CONFIRMATION.
- Error state: Not depicted, NEEDS_CONFIRMATION.
- Disabled state: Not depicted, NEEDS_CONFIRMATION.

# Data Contract

- Field name: email
- TypeScript type: string
- Required or optional: required
- Editable or read-only: editable
- Mock data source: local reset form state
- Future Firebase collection: none (Firebase Authentication)
- Future Firebase field: auth.email

- Field name: resetChannel
- TypeScript type: "emailLink" | "otp"
- Required or optional: optional
- Editable or read-only: read-only (system-config)
- Mock data source: local app config
- Future Firebase collection: app_config
- Future Firebase field: auth.resetChannel

# React Native Mapping

- View: Layout wrappers and sections.
- Text: Title, supporting text, button label.
- Pressable: Reset button.
- TextInput: Email field.
- Image: Not used.
- ScrollView: Not required by frame.
- FlatList: Not used.
- SafeAreaView: Required for top/bottom inset safety.
- KeyboardAvoidingView: Recommended for keyboard overlap prevention.

# NativeWind Mapping

- Layout: flex-1, w-full, items-center.
- Spacing: px-4, pt-10, gap-4.
- Typography: font-poppins, text-base, text-sm, font-semibold.
- Colors: bg-white, text-slate-900, text-slate-500, bg-orange-700, text-white.
- Radius: rounded-lg, rounded-xl.
- Borders: border, border-slate-300.
- Alignment: items-stretch, self-center.

# Component Tree

- ForgotPasswordScreen
- ForgotPasswordSafeArea
- AuthHeaderBlock
- EmailInputField
- PrimaryActionButton

# States

- idle
- editing
- validating
- submit_loading
- submit_success
- submit_error

# Implementation Notes

- Android concerns: Respect status bar height and keyboard resize behavior.
- Safe-area concerns: Keep CTA inside safe bottom inset.
- Keyboard concerns: Ensure email input and CTA remain visible while typing.
- Minimum-width concerns: Maintain 339-width content intent on 360 dp devices with responsive side padding.
- Firebase preparation notes: Build form contract for Firebase Authentication reset flow integration later.
- Missing information: Exact typography and stroke/radius tokens need Figma token confirmation, NEEDS_CONFIRMATION.
- Design inconsistencies: No explicit inconsistency surfaced from available metadata.
