# Screen identity

- Frame name: BOOKING OTH - RATING & REVIEW
- Node ID: 8242:21120
- Exact frame dimensions: 375 x 870
- Purpose: Customer rating and review form for a completed booking.
- Intended actor: Customer
- Proposed route: src/app/(customer)/booking/rating.tsx

# Relationship to existing screens

- Follows the booking completion or finished booking screen.
- Precedes submission of a review and return to booking history or home.
- This screen is part of the post-booking feedback flow.

# Layout structure

- Orange top section with a compact shop detail card.
- Card includes shop image, name, location, and average rating.
- White bottom sheet containing:
  - numeric star rating row.
  - review text area.
  - removable review tags.
  - primary submit button.
- Top navigation bar with a back arrow and title.

# Visual properties

- Background: warm orange accent.
- Card surface: white with subtle drop shadow.
- Button: orange primary CTA with white text.
- Text: dark gray headings and medium gray metadata.
- Tags: neutral pill style with light border.

# Reusable components

- Top navigation bar
- Shop detail card
- Star rating input
- Text review area
- Tag list
- Primary action button

# Interaction and navigation

- Tap back to return to the previous booking screen.
- Tap stars to select a rating.
- Enter a review in the text area.
- Remove review tags by tapping cancel icons.
- Tap "Kirim" to submit the review.

# Data contract

- `bookingId`
  - Type: `string`
  - Required: yes
- `shopName`
  - Type: `string`
  - Required: yes
- `location`
  - Type: `string`
  - Required: yes
- `averageRating`
  - Type: `string`
  - Required: no
- `selectedRating`
  - Type: `number`
  - Required: yes
- `reviewText`
  - Type: `string`
  - Required: no
- `tags`
  - Type: `Array<string>`
  - Required: no

# Booking flow position

- This screen follows a completed booking.
- It is the first screen in the post-booking review flow.

# Validation rules

- `selectedRating` must be present before submission.
- `shopName` and `location` must be visible in the header card.
- The submit button should display as the primary CTA.

# React Native mapping

- `SafeAreaView`
- `View`
- `Text`
- `TextInput`
- `Pressable`
- `ScrollView`

# NativeWind mapping

- `bg-white`
- `bg-orange-600`
- `text-white`
- `text-slate-900`
- `rounded-xl`
- `rounded-2xl`
- `shadow-md`
- `border`
- `border-slate-200`
- `px-4`
- `py-3`

# Component tree

- BookingRatingScreen
  - RootSafeArea
    - TopNavigationBar
    - ShopDetailCard
    - RatingStars
    - ReviewTextArea
    - TagChipRow
    - SubmitButton

# States

- Default rating input state
- Selected star rating state
- Tag removal state
- Review submission pending state
