# Screen identity

- Frame name: PROFILE - ACCOUNT
- Node ID: 8062:2640
- Exact frame dimensions: 375 x 990
- Purpose: Customer account detail screen for viewing and editing profile fields.
- Intended actor: Customer
- Proposed route: src/app/(customer)/profile/account.tsx

# Relationship to existing screens

- Accessed from the profile overview screen.
- Precedes the password change screen or profile update confirmation.
- This screen is the account detail editor within the profile flow.

# Layout structure

- Centered profile photo at the top.
- Name heading below the photo.
- Form fields: email and password.
- Each field is displayed in a bordered input container with icons.
- Top navigation bar with back navigation and title.

# Visual properties

- Background: white.
- Inputs: white fields with light gray borders and rounded corners.
- Text: dark headings and muted labels.
- Icons: gray line iconography inside input fields.

# Reusable components

- Profile avatar header
- Bordered input field
- Icon input affordance
- Top navigation bar

# Interaction and navigation

- Tap back to return to the profile overview.
- Tap each field to edit account information.
- The password field displays masked text.
- Account changes should persist via the profile update flow.

# Data contract

- `userId`
  - Type: `string`
  - Required: yes
- `name`
  - Type: `string`
  - Required: yes
- `email`
  - Type: `string`
  - Required: yes
- `passwordPlaceholder`
  - Type: `string`
  - Required: yes
- `profileImageUrl`
  - Type: `string`
  - Required: no

# Flow position

- This screen is reached from profile overview.
- It is the editable account details screen.

# Validation rules

- `email` must display a valid email string.
- `name` must be visible in the profile header.
- Input containers should reflect editable state.

# React Native mapping

- `SafeAreaView`
- `View`
- `Text`
- `Image`
- `TextInput`
- `Pressable`
- `ScrollView`

# NativeWind mapping

- `bg-white`
- `text-slate-900`
- `text-slate-500`
- `rounded-xl`
- `border`
- `border-slate-200`
- `px-4`
- `py-3`

# Component tree

- ProfileEditScreen
  - RootSafeArea
    - ProfileAvatarHeader
    - AccountField
    - PasswordField

# States

- Account view state
- Editable input state
- Password masked state
