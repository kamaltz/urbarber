# Screen identity

- Frame name: ONBOARD
- Node ID: 8062:2592
- Exact frame dimensions: 375 x 812
- Purpose: Onboarding/intro screen for a first-time user flow; the screen appears to introduce the app and present a single primary action.
- Intended actor: First-time user / new app visitor (NEEDS_CONFIRMATION)

# Layout

- Hierarchy:
  - Root frame: 375 x 812
  - Illustration group: Group 1869
  - Primary CTA button: Button/Big
- Flex direction: No explicit flex container is visible; the layout is primarily absolute-positioned.
- Alignment: Centered horizontally for the CTA button; illustration group is positioned near the vertical middle of the frame.
- Padding: No explicit padding values are exposed for the root frame; the CTA button has horizontal padding of 10 px and vertical padding of 17 px in the generated structure.
- Gaps: No explicit gap values are exposed between visible elements.
- Widths and heights:
  - Root: 375 x 812
  - Illustration group: 190 x 172.38
  - CTA button: 339 x 58
- Scroll behavior: None; this is a single-screen onboarding frame.
- Safe-area behavior: No explicit safe-area handling is visible in the supplied frame data.
- Keyboard behavior: No input fields are present; keyboard handling is not applicable for this frame.

# Visual properties

- Colors:
  - Background: WHITE / #FFFFFF
  - Primary action: Secunder / #d2691e
  - Button label text: WHITE / #FFFFFF
- Typography:
  - Button label: Poppins Bold, 16 px, white
- Borders: No explicit border stroke values were exposed.
- Radius: CTA button radius appears to be 8 px.
- Shadows: No explicit shadow values were exposed.
- Opacity: No explicit opacity values were exposed.
- Icons: No dedicated icon components are visible in this frame.
- Images: Two SVG illustration assets are present in the Figma structure and appear to form a simple hero illustration.

# Reusable components

- Component name: Button/Big
  - Variants: Primary CTA button
  - Properties:
    - Fill: #d2691e
    - Text color: #FFFFFF
    - Text style: Poppins Bold, 16 px
    - Width: 339 px
    - Height: 58 px
    - Corner radius: 8 px
    - Horizontal padding: 10 px
    - Vertical padding: 17 px
  - Reusable state: Default/pressed/disabled states are not exposed in the supplied frame; NEEDS_CONFIRMATION

# Interaction

- Button actions: The CTA button likely advances the onboarding flow or transitions to the next step; this is inferred from the onboarding context and should be treated as NEEDS_CONFIRMATION.
- Navigation destination: NEEDS_CONFIRMATION
- Loading state: None visible
- Validation state: None visible
- Error state: None visible
- Disabled state: Not visible in the frame; NEEDS_CONFIRMATION

# Data contract

- Fields displayed: None
- Fields entered: None
- Expected TypeScript types: None for this frame
- Future Firebase fields: None visible in this frame; any future persistence should be treated as NEEDS_CONFIRMATION

# React Native mapping

- View: Yes, for the root container and layout wrappers
- Text: Yes, for the button label
- Pressable: Yes, for the primary CTA button
- TextInput: No
- Image: Yes, for the illustration assets
- ScrollView: No
- KeyboardAvoidingView: No

# Component tree

- OnboardScreen
  - RootView
    - HeroIllustrationGroup
      - IllustrationImage
      - IllustrationImage
    - PrimaryButton
      - Text
