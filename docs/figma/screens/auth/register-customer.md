# Screen Identity

- Screen name: REGIST
- Figma node ID: 8062:7596
- Exact frame dimensions: 375 x 840
- Actor: New customer
- Purpose: Create a new customer account.
- Proposed Expo Router route: src/app/(auth)/register-customer.tsx
- Related use case: User fills registration form and accepts terms before account creation.

# Layout Structure

- Root container: Full-screen frame 375 x 840.
- Safe-area behavior: No explicit inset token exposed; safe-area behavior NEEDS_CONFIRMATION.
- Layout direction: Vertical form flow.
- Section hierarchy: Header copy, five input fields, terms acceptance row, primary CTA, login fallback link.
- Alignment: Left-aligned form labels and values inside centered 339-width container.
- Padding: Effective horizontal inset approximately 18 px.
- Gaps: Field-to-field vertical gaps visible; exact values not fully exposed, NEEDS_CONFIRMATION.
- Fixed and flexible dimensions: Input rows ~339 width, CTA 339 x 54, root fixed width 375.
- Scroll behavior: Frame is taller than 812 and may need scroll on smaller Android viewports, NEEDS_CONFIRMATION.
- Keyboard behavior: Multi-field form requires keyboard-safe movement and scroll-to-focus.

# Visual Properties

- Colors with exact values: Background #FFFFFF, CTA #D2691E, primary text #111827, secondary text #9095A0 (where visible).
- Typography family, size, weight, and line height: Appears to use Poppins; exact per-element values not fully exposed, NEEDS_CONFIRMATION.
- Border radius: Inputs and CTA are rounded; exact numeric radius token NEEDS_CONFIRMATION.
- Borders: Input borders visible; exact width/color values NEEDS_CONFIRMATION.
- Shadows: No explicit shadow token confirmed.
- Opacity: No explicit opacity token confirmed.
- Icon dimensions: Terms row includes checkbox-like control; exact dimensions NEEDS_CONFIRMATION.
- Image dimensions and ratios: No image confirmed.
- Spacing values: Container width implies 18 px side inset; full spacing token map NEEDS_CONFIRMATION.

# Reusable Components

- Name: AuthHeaderBlock
- Purpose: Registration context heading and description.
- Props: title string, description string.
- Variants: register.
- States: default.
- Reuse opportunities: Shared with login/forgot/authentication.

- Name: AuthTextField
- Purpose: Capture registration attributes.
- Props: label string, value string, placeholder string, keyboardType string, secureTextEntry boolean.
- Variants: name, email, phone, password, confirmPassword.
- States: default, focused, error, disabled.
- Reuse opportunities: Common field component across auth forms.

- Name: TermsAgreementRow
- Purpose: Capture user consent to terms.
- Props: checked boolean, onToggle function, onTermsPress function.
- Variants: unchecked, checked.
- States: default, pressed, disabled, error.
- Reuse opportunities: Any consent-required flow.

- Name: PrimaryActionButton
- Purpose: Submit registration form.
- Props: label string, disabled boolean, loading boolean, onPress function.
- Variants: primary.
- States: default, pressed, loading, disabled.
- Reuse opportunities: Shared button across auth stack.

# Interaction and Navigation

- Pressable elements: Terms checkbox/toggle, terms link text, register CTA, login link.
- Destination routes: Terms route src/app/(customer)/terms-condition.tsx, login route src/app/(auth)/login.tsx, post-register route NEEDS_CONFIRMATION.
- Back behavior: No explicit back element shown.
- Form submission: CTA submits all required registration fields.
- Validation: Required-field checks, email format, password strength, password confirmation match.
- Loading state: Not shown in frame, NEEDS_CONFIRMATION.
- Success state: Not shown in frame, NEEDS_CONFIRMATION.
- Error state: Not shown in frame, NEEDS_CONFIRMATION.
- Disabled state: Not shown in frame, NEEDS_CONFIRMATION.

# Data Contract

- Field name: fullName
- TypeScript type: string
- Required or optional: required
- Editable or read-only: editable
- Mock data source: local registration form state
- Future Firebase collection: users
- Future Firebase field: profile.fullName

- Field name: email
- TypeScript type: string
- Required or optional: required
- Editable or read-only: editable
- Mock data source: local registration form state
- Future Firebase collection: none (Firebase Authentication)
- Future Firebase field: auth.email

- Field name: phoneNumber
- TypeScript type: string
- Required or optional: required
- Editable or read-only: editable
- Mock data source: local registration form state
- Future Firebase collection: users
- Future Firebase field: profile.phoneNumber

- Field name: password
- TypeScript type: string
- Required or optional: required
- Editable or read-only: editable
- Mock data source: local registration form state
- Future Firebase collection: none (Firebase Authentication)
- Future Firebase field: auth.passwordCredential

- Field name: confirmPassword
- TypeScript type: string
- Required or optional: required
- Editable or read-only: editable
- Mock data source: local registration form state
- Future Firebase collection: none
- Future Firebase field: validation.confirmPassword

- Field name: acceptedTerms
- TypeScript type: boolean
- Required or optional: required
- Editable or read-only: editable
- Mock data source: local registration form state
- Future Firebase collection: users
- Future Firebase field: compliance.acceptedTerms

# React Native Mapping

- View: Root and section wrappers.
- Text: Headers, labels, helper texts, links.
- Pressable: CTA, terms actions, login link.
- TextInput: Five registration fields.
- Image: Not used.
- ScrollView: Recommended due 840-height design and keyboard interaction.
- FlatList: Not used.
- SafeAreaView: Required.
- KeyboardAvoidingView: Required for multi-field form usability.

# NativeWind Mapping

- Layout: flex-1, w-full, items-center.
- Spacing: px-4, pt-8, pb-6, gap-3.
- Typography: font-poppins, text-base, text-sm, font-semibold.
- Colors: bg-white, text-slate-900, text-slate-500, bg-orange-700, text-white.
- Radius: rounded-lg, rounded-xl.
- Borders: border, border-slate-300.
- Alignment: items-stretch, justify-start.

# Component Tree

- RegisterCustomerScreen
- RegisterSafeArea
- AuthHeaderBlock
- RegistrationFormSection
- AuthTextFieldName
- AuthTextFieldEmail
- AuthTextFieldPhone
- AuthTextFieldPassword
- AuthTextFieldConfirmPassword
- TermsAgreementRow
- PrimaryActionButton
- LoginLink

# States

- idle
- editing
- validating
- submit_loading
- submit_success
- submit_error

# Implementation Notes

- Android concerns: Ensure form remains usable with smaller keyboards and varied screen heights.
- Safe-area concerns: Keep bottom links and CTA inside safe area.
- Keyboard concerns: Use KeyboardAvoidingView plus ScrollView to avoid hidden lower fields.
- Minimum-width concerns: Keep field and CTA widths adaptive for 360 dp minimum width.
- Firebase preparation notes: Split auth creation (Firebase Authentication) and profile document creation (Firestore users collection).
- Missing information: Exact per-field typography and border/radius tokens need final design token confirmation, NEEDS_CONFIRMATION.
- Design inconsistencies: Frame name is REGIST while route naming uses register-customer; naming convention should be normalized, NEEDS_CONFIRMATION.
