# Screen Identity

- Screen name: LOGIN
- Figma node ID: 8062:7161
- Exact frame dimensions: 375 x 812
- Actor: Returning user
- Purpose: Sign in to an existing account.
- Proposed Expo Router route: src/app/(auth)/login.tsx
- Related use case: User enters credentials and proceeds to authenticated area.

# Layout Structure

- Root container: Single full-screen container, fixed artboard 375 x 812.
- Safe-area behavior: Top safe area is visually occupied by decorative hero; explicit inset token not exposed, NEEDS_CONFIRMATION.
- Layout direction: Vertical content flow after hero block.
- Section hierarchy: Hero illustration, title/description, credential form, primary CTA, secondary links.
- Alignment: Main form block centered horizontally.
- Padding: Horizontal inset appears equivalent to 18 px each side from 375 -> 339 content width.
- Gaps: Inter-section spacing exists but exact gap tokens not exposed, NEEDS_CONFIRMATION.
- Fixed and flexible dimensions: Root fixed width 375; form and CTA width 339; height adapts by content.
- Scroll behavior: No scroll indicated in frame.
- Keyboard behavior: Requires keyboard-safe positioning for text inputs; explicit resize mode not exposed, NEEDS_CONFIRMATION.

# Visual Properties

- Colors with exact values: Background #FFFFFF, primary action #D2691E, primary text #111827, muted text NEEDS_CONFIRMATION.
- Typography family, size, weight, and line height: Family appears Poppins; exact full token set per label/heading not fully exposed, NEEDS_CONFIRMATION.
- Border radius: CTA/button radius visible but numeric token not exposed, NEEDS_CONFIRMATION.
- Borders: Input border color appears neutral gray; exact value NEEDS_CONFIRMATION.
- Shadows: No explicit shadow value exposed.
- Opacity: No explicit opacity values exposed.
- Icon dimensions: No dedicated icon element confirmed.
- Image dimensions and ratios: Decorative hero image/group present near top; exact asset box size not exposed, NEEDS_CONFIRMATION.
- Spacing values: Content width 339 confirms side inset behavior; other spacing tokens NEEDS_CONFIRMATION.

# Reusable Components

- Name: AuthHeaderBlock
- Purpose: Render title and supporting copy for auth screens.
- Props: title string, description string, align "left" | "center".
- Variants: login, forgot-password, authentication, register.
- States: default.
- Reuse opportunities: Shared across all auth entry screens.

- Name: AuthTextField
- Purpose: Capture credential inputs.
- Props: label string, value string, placeholder string, secureTextEntry boolean, keyboardType string.
- Variants: email, password.
- States: default, focused, error, disabled.
- Reuse opportunities: Shared across login/register/forgot-password.

- Name: PrimaryActionButton
- Purpose: Submit main auth action.
- Props: label string, onPress function, disabled boolean, loading boolean.
- Variants: primary.
- States: default, pressed, loading, disabled.
- Reuse opportunities: Shared across all major auth forms.

- Name: AuthInlineLink
- Purpose: Secondary route actions like forgot password or register.
- Props: text string, onPress function.
- Variants: inline, footer.
- States: default, pressed, disabled.
- Reuse opportunities: Shared link treatment in auth stack.

# Interaction and Navigation

- Pressable elements: Primary login CTA, forgot-password link, register link.
- Destination routes: Forgot password -> src/app/(auth)/forgot-password.tsx, register -> src/app/(auth)/register-customer.tsx, post-login destination NEEDS_CONFIRMATION.
- Back behavior: No explicit back element visible on frame.
- Form submission: CTA submits credential payload.
- Validation: Email format and password non-empty expected; exact validation copy not visible, NEEDS_CONFIRMATION.
- Loading state: Not rendered in frame, NEEDS_CONFIRMATION.
- Success state: Not rendered in frame, NEEDS_CONFIRMATION.
- Error state: Not rendered in frame, NEEDS_CONFIRMATION.
- Disabled state: Not rendered in frame, NEEDS_CONFIRMATION.

# Data Contract

- Field name: email
- TypeScript type: string
- Required or optional: required
- Editable or read-only: editable
- Mock data source: local mock auth form state
- Future Firebase collection: none (Firebase Authentication)
- Future Firebase field: auth.email

- Field name: password
- TypeScript type: string
- Required or optional: required
- Editable or read-only: editable
- Mock data source: local mock auth form state
- Future Firebase collection: none (Firebase Authentication)
- Future Firebase field: auth.passwordCredential

- Field name: rememberSession
- TypeScript type: boolean
- Required or optional: optional
- Editable or read-only: editable
- Mock data source: local mock preference state
- Future Firebase collection: users
- Future Firebase field: sessionPreferences.rememberSession

# React Native Mapping

- View: Root container, sections, layout wrappers.
- Text: Title, description, labels, links.
- Pressable: CTA and link actions.
- TextInput: Email and password inputs.
- Image: Hero decorative asset.
- ScrollView: Not required by current frame.
- FlatList: Not used.
- SafeAreaView: Required for Android notch/status-bar handling.
- KeyboardAvoidingView: Recommended to avoid CTA/input overlap by keyboard.

# NativeWind Mapping

- Layout: flex-1, w-full, items-center.
- Spacing: px-4, pt-6, pb-6, gap-4.
- Typography: font-poppins, text-base, font-semibold, leading-6.
- Colors: bg-white, text-slate-900, text-slate-500, bg-orange-700, text-white.
- Radius: rounded-lg, rounded-xl.
- Borders: border, border-slate-300.
- Alignment: justify-start, items-stretch, self-center.

# Component Tree

- LoginScreen
- LoginSafeArea
- HeroIllustrationBlock
- AuthHeaderBlock
- LoginFormSection
- AuthTextFieldEmail
- AuthTextFieldPassword
- ForgotPasswordLink
- PrimaryActionButton
- RegisterLink

# States

- idle
- editing
- validating
- submit_loading
- submit_success
- submit_error

# Implementation Notes

- Android concerns: Handle status bar overlap and keyboard resize mode to keep CTA reachable.
- Safe-area concerns: Apply SafeAreaView top and bottom insets consistently.
- Keyboard concerns: Use KeyboardAvoidingView or equivalent to prevent field obstruction.
- Minimum-width concerns: Layout should remain stable at 360 dp minimum width.
- Firebase preparation notes: Use mock adapter now; wire to Firebase Authentication and user bootstrap in Firestore later.
- Missing information: Exact typography tokens, some spacing tokens, and button/input state visuals are not fully exposed, NEEDS_CONFIRMATION.
- Design inconsistencies: None explicitly surfaced in available metadata; confirmation requires full design token export, NEEDS_CONFIRMATION.
