# Figma design system notes

This document is based only on the representative Figma frames provided for this update:
- 8062-7161
- 8086-4009
- 8067-5235
- 8063-5888
- 8096-4215

The values below are limited to what was confirmed by the Figma metadata, design context, screenshots, and variable definitions returned for those frames. Where the Figma responses did not expose a value, it is marked as not confirmed.

## 1. Color tokens and exact hex values

### Confirmed tokens
- `Background` — `#ffffff`
- `Color/White/900` — `#FFFFFF`
- `WHITE` — `#FFFFFF`
- `Color/Cool Gray/100` — `#F4F4F5`
- `Color/Cool Gray/200` — `#E5E7EB`
- `Color/Cool Gray/300` — `#D1D5DB`
- `Color/Cool Gray/500` — `#6B7280`
- `Color/Cool Gray/900` — `#111827`
- `Color/Blue Gray/100` — `#EBF0F5`
- `Color/Blue Gray/500` — `#64748B`
- `Color/Blue Gray/900` — `#0F172A`
- `Color/Primary Brand/50` — `#EDEFFB`
- `Color/Primary Brand/500` — `#8683A1`
- `Color/Primary Brand/900` — `#363062`
- `Color/Secondary/900` — `#F99417`
- `Color/Red/500` — `#F43F5E`
- `Color/Yellow/400` — `#FACC15`
- `Blue90` — `#0C79FE`
- `Button` — `#ffa500`
- `Secunder` — `#d2691e`
- `Text` — `#1c1c1c`
- `Gray 5` — `#E0E0E0`
- `icon` — `#8683a1`
- `grey icon` — `#94a3b8`

### Observed usage in the supplied frames
- Light surfaces use white and light gray values such as `#FFFFFF`, `#F4F4F5`, `#E5E7EB`, and `#E0E0E0`.
- Text and darker UI surfaces use `#111827`, `#363062`, `#0F172A`, and `#1c1c1c`.
- Accent and action colors include `#d2691e`, `#ffa500`, `#F99417`, `#0C79FE`, and `#F43F5E`.
- Neutral interface states use `#6B7280`, `#64748B`, `#94a3b8`, and `#8683A1`.

## 2. Typography families, sizes, weights, and line heights

### Confirmed typography tokens
- `Typography/Headline 4/16px` — `Plus Jakarta Sans`, `Bold`, `16px`, `700`, `lineHeight: 100`, `letterSpacing: 0`
- `Typography/Headline 5/14px` — `Plus Jakarta Sans`, `Bold`, `14px`, `700`, `lineHeight: 100`, `letterSpacing: 0`
- `Typography/Sub Headline 3/14px` — `Plus Jakarta Sans`, `Medium`, `14px`, `500`, `lineHeight: 100`, `letterSpacing: 0`
- `Typography/Body 2/16px` — `Plus Jakarta Sans`, `Regular`, `16px`, `400`, `lineHeight: 100`, `letterSpacing: 0`
- `Typography/Body 3/14px` — `Plus Jakarta Sans`, `Regular`, `14px`, `400`, `lineHeight: 100`, `letterSpacing: 0`
- `pop semi` — `Poppins`, `SemiBold`, `16px`, `600`, `lineHeight: 100`, `letterSpacing: 0`
- `semi15` — `Poppins`, `SemiBold`, `15px`, `600`, `lineHeight: 100`, `letterSpacing: 0`
- `semi12` — `Poppins`, `SemiBold`, `12px`, `600`, `lineHeight: 100`, `letterSpacing: 0`
- `pop reg` — `Poppins`, `Regular`, `14px`, `400`, `lineHeight: 100`, `letterSpacing: 0`
- `reg15` — `Poppins`, `Regular`, `15px`, `400`, `lineHeight: 100`, `letterSpacing: 0`
- `Reg 12` — `Poppins`, `Regular`, `12px`, `400`, `lineHeight: 100`, `letterSpacing: 0`

### Notes
- The supplied Figma responses exposed line-height `100` for the typography tokens above.
- No additional typographic scale beyond the values listed here was confirmed.

## 3. Spacing scale

No complete spacing-token scale was exposed by the supplied Figma responses.

Confirmed spacing-related values from the visible UI geometry include:
- `8px` — small indicator/slider spacing
- `100px` — home indicator width
- `5px` — home indicator height

## 4. Border radius scale

No full border-radius token scale was exposed by the provided frames.

The only confirmed radii from the returned context were:
- `8px` — from the earlier onboarding button style in the same design file
- `100px` — pill-shaped home indicator

## 5. Borders and shadows

### Confirmed shadow
- `Box S` — `DROP_SHADOW`, color `#1C273114`, offset `(0, 2)`, radius `6`, spread `0`

### Confirmed border state
- No border stroke width, border color, or border style token was exposed in the returned Figma responses.

## 6. Icon style

No dedicated icon system or icon component style guide was exposed in the supplied frames.

What was confirmed:
- icon colors appear in muted blue-gray tones such as `#8683A1` and `#94A3B8`
- the visible UI uses simple iconography rather than a detailed or branded icon set

## 7. Button variants

Only a limited set of button styling was confirmed from the supplied frames.

### Confirmed button style
- primary action button with fill `#d2691e` or `#ffa500` depending on the frame context
- text color `#FFFFFF`
- rounded corners at `8px` in the earlier onboarding screens
- no additional button variants were explicitly exposed in the new frame set

## 8. Input variants

No input components or input variants were exposed in the supplied frames, so no confirmed input styling is documented here.

## 9. Card variants

No distinct card component variants were exposed in the provided frames.

The closest confirmed surface pattern is a rounded container with a shadow effect (`Box S`) in the supplied screen context, but no reusable card token set was provided.

## 10. Status badge variants

No status badge variants were visible in the supplied frames, so none are documented here.

## 11. Header patterns

No reusable header pattern or app-bar token set was exposed in the supplied frames.

The visible profile-style screen did not expose a standard top header component with explicit token values.

## 12. Bottom navigation patterns

No full bottom navigation component was exposed in the supplied frames.

What was confirmed:
- a simple bottom indicator pill appears in the onboarding screens
- size: `100px` wide and `5px` high
- no icon states, labels, or active/inactive variants were exposed

## 13. Android and React Native implementation notes

### Platform constraints
- The target stack is Expo SDK 57 with React Native and TypeScript.
- The design should be implemented as native components rather than HTML/CSS.
- Android-first is the primary target; web preview is secondary.

### Practical implementation guidance
- Use native primitives such as `View`, `Text`, `Image`, and `Pressable`.
- Map the confirmed color tokens directly to React Native color values.
- Use the confirmed font families and weights as native text styling where available.
- Preserve the simple pill-style home indicator as a native visual element rather than a web-style navigation bar.
- For any shadow effect, use a React Native shadow implementation that matches the confirmed `Box S` parameters as closely as the platform allows.
- Avoid assuming browser-only CSS behaviors such as pseudo-elements or layout tricks that do not map cleanly to React Native.

## 14. Elements that cannot be translated directly from web CSS

The following items should not be treated as direct 1:1 conversions from browser CSS:
- Figma absolute positioning and percentage-based layout should be adapted to React Native layout primitives.
- The shadow effect `Box S` should be mapped to React Native shadow APIs rather than assumed to be a web CSS box-shadow.
- The home indicator is a platform-visual pattern rather than a standard web navigation component.
- Some Figma text styling is exposed as design tokens rather than explicit CSS declarations and should be mapped manually to native font properties.
- Image treatments such as cover/fill behavior should be translated using React Native image props rather than browser CSS behavior.
