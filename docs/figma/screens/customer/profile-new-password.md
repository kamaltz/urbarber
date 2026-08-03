# Screen identity

- Frame name: PROFILE - PASSWORD
- Node ID: 8062:2654
- Exact frame dimensions: 375 x 812
- Purpose: Customer screen for changing account password.
- Intended actor: Customer
- Proposed route: src/app/(customer)/profile/change-password.tsx

# Relationship to existing screens

- Accessed from profile overview or account screen.
- Precedes password update confirmation.
- This screen is the dedicated password change form.

# Layout structure

- Two bordered password input fields:
  - current password
  - new password
- Eye icon toggles for password visibility.
- Orange primary save button at the bottom.
- Top navigation bar with back arrow and title.

# Visual properties

- Background: white.
- Inputs: rounded gray border fields with icon affordances.
- Button: orange fill with white text.
- Text: dark labels and muted placeholder text.

# Reusable components

- Password input field
- Icon toggle button
- Primary action button
- Top navigation bar

# Interaction and navigation

- Tap back to return to the account screen.
- Enter current and new passwords.
- Tap the eye icon to toggle password visibility.
- Tap "Simpan" to save the password change.

# Data contract

- `userId`
  - Type: `string`
  - Required: yes
- `currentPassword`
  - Type: `string`
  - Required: yes
- `newPassword`
  - Type: `string`
  - Required: yes
- `showPassword`
  - Type: `boolean`
  - Required: yes

# Flow position

- This screen is the security step within profile settings.
- It is reached from account details or profile overview.

# Validation rules

- `currentPassword` and `newPassword` must be present before saving.
- `newPassword` placeholder should read as a prompt to enter a new password.
- The save button should use the brand accent.

# React Native mapping

- `SafeAreaView`
- `View`
- `Text`
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

- ProfilePasswordScreen
  - RootSafeArea
    - PasswordFieldCurrent
    - PasswordFieldNew
    - SaveButton

# States

- Password entry state
- Visibility toggle state
- Disabled save state until input is complete
