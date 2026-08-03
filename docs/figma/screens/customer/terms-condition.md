# Screen Identity

- Screen name: Terms and Conditions
- Figma node ID: 8209:3339
- Exact frame dimensions: 375 x 1589
- Actor: Customer
- Purpose: Display legal terms and collect consent before continuing registration.
- Proposed Expo Router route: src/app/(customer)/terms-condition.tsx
- Related use case: User reviews terms and taps continue/agree.

# Layout Structure

- Root container: Long-form document screen with fixed artboard width 375.
- Safe-area behavior: Top navigation exists; explicit safe inset values are not exposed, NEEDS_CONFIRMATION.
- Layout direction: Vertical content flow.
- Section hierarchy: Top navigation, legal title/body text block, bottom CTA.
- Alignment: Terms text left-aligned in content area; CTA centered horizontally.
- Padding: Effective horizontal inset appears 18 px from 339 content width.
- Gaps: Long content spacing exists but exact gap tokens are not fully exposed, NEEDS_CONFIRMATION.
- Fixed and flexible dimensions: Body text block 339 x 1270, CTA 339 x 58, top bar 375 x 91.
- Scroll behavior: Vertical scrolling is required due 1589 content height.
- Keyboard behavior: No input field, keyboard handling not required.

# Visual Properties

- Colors with exact values: Background #FFFFFF, primary text #111827, CTA #D2691E, button text #FFFFFF.
- Typography family, size, weight, and line height: Typography appears Poppins-based; exact token map for title/body line-height not fully exposed, NEEDS_CONFIRMATION.
- Border radius: CTA rounded; exact radius value NEEDS_CONFIRMATION.
- Borders: No explicit border token shown for content section.
- Shadows: No explicit shadow token confirmed.
- Opacity: No explicit opacity token confirmed.
- Icon dimensions: Back icon likely present in top navigation, exact size NEEDS_CONFIRMATION.
- Image dimensions and ratios: No image asset in content body.
- Spacing values: 339 content width indicates side inset; detailed internal spacing NEEDS_CONFIRMATION.

# Reusable Components

- Name: TopNavigationBar
- Purpose: Show screen title and back affordance.
- Props: title string, onBack function.
- Variants: default.
- States: default.
- Reuse opportunities: Shared across profile/legal/detail screens.

- Name: LegalContentBlock
- Purpose: Render long static legal markdown/plain text.
- Props: title string, body string.
- Variants: terms, privacy, help policy.
- States: default.
- Reuse opportunities: Shared for other legal/policy pages.

- Name: PrimaryActionButton
- Purpose: Confirm and continue.
- Props: label string, disabled boolean, loading boolean, onPress function.
- Variants: primary.
- States: default, pressed, loading, disabled.
- Reuse opportunities: Shared with auth and onboarding actions.

# Interaction and Navigation

- Pressable elements: Back control in top bar, bottom CTA.
- Destination routes: Back returns to previous register step, forward route after agreement NEEDS_CONFIRMATION.
- Back behavior: Standard stack back expected.
- Form submission: No form submit; CTA records consent and continues flow.
- Validation: Agreement flag must be true before final registration submission.
- Loading state: Not shown in frame, NEEDS_CONFIRMATION.
- Success state: Not shown in frame, NEEDS_CONFIRMATION.
- Error state: Not shown in frame, NEEDS_CONFIRMATION.
- Disabled state: Not shown in frame, NEEDS_CONFIRMATION.

# Data Contract

- Field name: termsVersion
- TypeScript type: string
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: local legal content config
- Future Firebase collection: app_config
- Future Firebase field: legal.terms.version

- Field name: termsBody
- TypeScript type: string
- Required or optional: required
- Editable or read-only: read-only
- Mock data source: local legal content config
- Future Firebase collection: app_config
- Future Firebase field: legal.terms.body

- Field name: acceptedTerms
- TypeScript type: boolean
- Required or optional: required
- Editable or read-only: editable
- Mock data source: local registration state
- Future Firebase collection: users
- Future Firebase field: compliance.acceptedTerms

- Field name: acceptedTermsAt
- TypeScript type: string | null
- Required or optional: optional
- Editable or read-only: read-only
- Mock data source: local timestamp generator
- Future Firebase collection: users
- Future Firebase field: compliance.acceptedTermsAt

# React Native Mapping

- View: Root, top bar, body and CTA containers.
- Text: Legal title and legal body text.
- Pressable: Back action and bottom CTA.
- TextInput: Not used.
- Image: Optional navigation icon asset.
- ScrollView: Required for long legal text content.
- FlatList: Not required.
- SafeAreaView: Required for notch/status area.
- KeyboardAvoidingView: Not required for this screen.

# NativeWind Mapping

- Layout: flex-1, w-full.
- Spacing: px-4, py-3, pb-6.
- Typography: font-poppins, text-base, text-sm, leading-6.
- Colors: bg-white, text-slate-900, text-slate-600, bg-orange-700, text-white.
- Radius: rounded-lg, rounded-xl.
- Borders: border, border-slate-200 for optional separators.
- Alignment: items-stretch, justify-between.

# Component Tree

- TermsConditionScreen
- TermsSafeArea
- TopNavigationBar
- TermsScrollContainer
- LegalContentBlock
- PrimaryActionButton

# States

- viewing
- cta_enabled
- cta_loading
- cta_success
- cta_error

# Implementation Notes

- Android concerns: Ensure smooth long-scroll performance and correct status-bar color contrast.
- Safe-area concerns: Keep bottom CTA above gesture/navigation inset.
- Keyboard concerns: Not applicable, no text input.
- Minimum-width concerns: Preserve readability and line wrapping at 360 dp.
- Firebase preparation notes: Persist consent version and timestamp in Firestore user profile later.
- Missing information: Exact legal copy source-of-truth, final button label semantics, and explicit state visuals are NEEDS_CONFIRMATION.
- Design inconsistencies: Frame label includes barber wording in some assets while route is customer context; naming alignment NEEDS_CONFIRMATION.
