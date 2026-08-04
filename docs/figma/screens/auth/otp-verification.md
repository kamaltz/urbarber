# Screen Identity

- Screen name: AUTHENTICATION
- Figma node ID: 8062:7562
- Exact frame dimensions: 375 x 812
- Actor: User completing verification
- Purpose: Verify one-time code before allowing account continuation.
- Proposed Expo Router route: src/app/(auth)/authentication.tsx
- Related use case: User enters OTP from email/SMS and confirms identity.

# Layout Structure

- Root container: Full-screen frame 375 x 812.
- Safe-area behavior: Safe-area specifics not explicitly provided by metadata, NEEDS_CONFIRMATION.
- Layout direction: Vertical stacking of copy, OTP cells, CTA, resend text.
- Section hierarchy: Header copy, OTP row, verify button, resend helper.
- Alignment: OTP cells centered and equally distributed in row container.
- Padding: Effective horizontal inset appears 18 px from 339 container width.
- Gaps: OTP field spacing visually consistent; exact token value not exposed, NEEDS_CONFIRMATION.
- Fixed and flexible dimensions: OTP input cells 62 x 62 each, CTA 339 x 54.
- Scroll behavior: Not indicated as scrollable.
- Keyboard behavior: Numeric keyboard intent is explicit from OTP pattern.

# Visual Properties

- Colors with exact values: Background #FFFFFF, action button #D2691E, body text #111827, helper text NEEDS_CONFIRMATION.
- Typography family, size, weight, and line height: Family appears Poppins; exact full typography token map not fully exposed, NEEDS_CONFIRMATION.
- Border radius: OTP boxes and button are rounded; exact numeric radius NEEDS_CONFIRMATION.
- Borders: OTP cell border/stroke visible; exact color/width NEEDS_CONFIRMATION.
- Shadows: No explicit shadow value exposed.
- Opacity: No explicit opacity token exposed.
- Icon dimensions: No icon confirmed.
- Image dimensions and ratios: No image confirmed.
- Spacing values: Content width confirms inset; exact vertical rhythm tokens NEEDS_CONFIRMATION.

# Reusable Components

- Name: AuthHeaderBlock
- Purpose: Explain verification step.
- Props: title string, description string.
- Variants: authentication.
- States: default.
- Reuse opportunities: Shared with other auth screens.

- Name: OtpInputGroup
- Purpose: Capture one-time code across fixed number of cells.
- Props: length number, value string, onChange function, keyboardType "number-pad".
- Variants: 4-digit (visible), 6-digit NEEDS_CONFIRMATION.
- States: default, focused, complete, error, disabled.
- Reuse opportunities: Signup verify, reset verify, MFA verify.

- Name: PrimaryActionButton
- Purpose: Submit verification code.
- Props: label string, onPress function, disabled boolean, loading boolean.
- Variants: primary.
- States: default, pressed, loading, disabled.
- Reuse opportunities: Common across auth stack.

- Name: ResendCodeLink
- Purpose: Trigger resend code operation.
- Props: text string, onPress function, cooldownSeconds number.
- Variants: enabled, cooldown.
- States: default, disabled, loading.
- Reuse opportunities: Shared in any OTP flow.

# Interaction and Navigation

- Pressable elements: Verify CTA, resend link.
- Destination routes: Success destination not shown in frame, NEEDS_CONFIRMATION.
- Back behavior: Back control not explicitly visible in this frame snapshot.
- Form submission: Verify CTA sends OTP payload.
- Validation: OTP length must match required digits and numeric-only.
- Loading state: Not visually present, NEEDS_CONFIRMATION.
- Success state: Not visually present, NEEDS_CONFIRMATION.
- Error state: Not visually present, NEEDS_CONFIRMATION.
- Disabled state: Not visually present, NEEDS_CONFIRMATION.

# Data Contract

- Field name: otpCode
- TypeScript type: string
- Required or optional: required
- Editable or read-only: editable
- Mock data source: local OTP form state
- Future Firebase collection: none (Firebase Authentication)
- Future Firebase field: auth.otp.code

- Field name: otpLength
- TypeScript type: 4 | 6
- Required or optional: required
- Editable or read-only: read-only (config-driven)
- Mock data source: auth config mock
- Future Firebase collection: app_config
- Future Firebase field: auth.otp.length

- Field name: resendAvailableAt
- TypeScript type: string | null
- Required or optional: optional
- Editable or read-only: read-only
- Mock data source: local timer state
- Future Firebase collection: auth_sessions
- Future Firebase field: resend.availableAt

# React Native Mapping

- View: Root and section wrappers.
- Text: Heading, description, resend helper.
- Pressable: Verify and resend actions.
- TextInput: OTP single-cell inputs.
- Image: Not used.
- ScrollView: Not required by frame.
- FlatList: Optional for rendering OTP cells; not mandatory.
- SafeAreaView: Required for inset-safe layout.
- KeyboardAvoidingView: Recommended for numeric keyboard overlap handling.

# NativeWind Mapping

- Layout: flex-1, w-full, items-center.
- Spacing: px-4, pt-10, gap-4, gap-2 for OTP cells.
- Typography: font-poppins, text-base, text-sm, font-semibold.
- Colors: bg-white, text-slate-900, text-slate-500, bg-orange-700, text-white.
- Radius: rounded-lg, rounded-xl.
- Borders: border, border-slate-300.
- Alignment: items-center, justify-start.

# Component Tree

- AuthenticationScreen
- AuthenticationSafeArea
- AuthHeaderBlock
- OtpInputGroup
- OtpInputCell
- PrimaryActionButton
- ResendCodeLink

# States

- idle
- input_incomplete
- input_complete
- validating
- verify_loading
- verify_success
- verify_error
- resend_cooldown

# Implementation Notes

- Android concerns: Numeric keyboard behavior differs by OEM; confirm focus movement and backspace behavior.
- Safe-area concerns: Preserve bottom spacing for resend/helper text and CTA.
- Keyboard concerns: Avoid hidden OTP row and button when keyboard appears.
- Minimum-width concerns: 4 OTP cells at 62 px each must fit 360 dp with margins and gaps.
- Firebase preparation notes: Prepare adapter for Firebase Authentication OTP verification and resend throttling.
- Missing information: Exact typography, border tokens, and explicit state visuals are incomplete, NEEDS_CONFIRMATION.
- Design inconsistencies: None explicit from available metadata; resend cooldown UI not shown, NEEDS_CONFIRMATION.
