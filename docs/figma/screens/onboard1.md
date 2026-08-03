# Screen identity

- Frame name: ONBOARD1
- Node ID: 8062:4443
- Exact frame dimensions: 375 x 812
- Purpose: Second onboarding/intro screen in a multi-step onboarding flow; presents a hero image, descriptive copy, a progress indicator, and a primary CTA.
- Intended actor: First-time user / new app visitor (NEEDS_CONFIRMATION)
- Proposed route: src/app/(auth)/onboarding/[step].tsx

# Layout

- Hierarchy:
  - Root frame: 375 x 812
  - Hero image area: Picture (610 x 375)
  - Secondary image area: Picture (579 x 375)
  - Bottom content container: CONTAINERS (375 x 264)
    - Section Desc (339 x 200)
      - Title/Desc (339 x 98)
      - Slider (60 x 8)
      - Button/Big (339 x 58)
    - Home Indicator (375 x 21)
- Flex direction: The generated structure indicates a vertical stack within the bottom container, but no explicit flex direction is exposed beyond the layout being arranged in a stacked container.
- Alignment: The title/description block is left-aligned; the button and bottom indicator are centered horizontally within the container.
- Padding:
  - Bottom container top padding: 24 px
  - Section content left/right inset: 18 px
  - Button horizontal padding: 10 px
  - Button vertical padding: 17 px
- Gaps:
  - Gap between title/description block and slider/button area: 18 px (inferred from the stacked layout)
  - Gap between title and description text: 8 px (from the generated structure)
- Widths and heights:
  - Root: 375 x 812
  - Hero image area: 375 x 610
  - Secondary overlay area: 375 x 579
  - Bottom container: 375 x 264
  - Section Desc: 339 x 200
  - Title/Desc: 339 x 98
  - Slider: 60 x 8
  - CTA button: 339 x 58
  - Home indicator: 100 x 5
- Scroll behavior: None; this is a single-screen onboarding frame.
- Safe-area behavior: No explicit safe-area handling is visible in the supplied frame data.
- Keyboard behavior: No input fields are present; keyboard handling is not applicable for this frame.

# Visual properties

- Colors:
  - Background: #E5E7EB
  - Bottom content container: Button / orange (#ffa500) in the design context, with a darker orange in the button itself (#d2691e)
  - Text: White / #FFFFFF
  - Supporting surfaces: White / #FFFFFF
- Typography:
  - Title: Poppins SemiBold, 24 px
  - Body: Poppins Medium, 14 px
  - CTA label: Poppins Bold, 16 px
- Borders: No explicit border stroke values were exposed.
- Radius:
  - Bottom container: rounded top corners (visible as a rounded-top sheet)
  - CTA button: 8 px
  - Home indicator: 100 px pill shape
- Shadows: No explicit shadow values were exposed.
- Opacity: No explicit opacity values were exposed.
- Icons: No dedicated icon system is visible in this frame.
- Images: One large hero image asset and one additional image overlay area are visible; the frame uses image-based onboarding visuals rather than simple colored blocks.

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

- Button actions: The CTA button appears to advance the onboarding flow to the next step; this is inferred from the onboarding sequence and should be treated as NEEDS_CONFIRMATION.
- Navigation destination: src/app/(auth)/onboarding/[step].tsx with next step parameter.
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

- View: Yes, for the root container, bottom sheet, and content blocks
- Text: Yes, for the title and body copy and button label
- Pressable: Yes, for the CTA button
- TextInput: No
- Image: Yes, for the hero image and slider indicator artwork
- ScrollView: No
- KeyboardAvoidingView: No

# Component tree

- Onboard1Screen
  - RootView
    - HeroImage
    - BottomSheetContainer
      - TitleBlock
        - TitleText
        - BodyText
      - ProgressSlider
      - PrimaryButton
        - ButtonLabel
      - HomeIndicator
