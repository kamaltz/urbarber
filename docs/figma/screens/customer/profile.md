# Screen identity

- Frame name: PROFILE - DEFAULT
- Node ID: 8062:3122
- Exact frame dimensions: 375 x 990
- Purpose: Customer profile overview screen showing account details and quick settings.
- Intended actor: Customer
- Proposed route: src/app/(customer)/profile.tsx

# Relationship to existing screens

- Follows home or booking screens when the user navigates to their profile.
- Precedes account settings and password change screens.
- This screen is the main profile entry point for a customer.

# Layout structure

- Orange top header background with profile photo, name, email, and location.
- Floating white content panel with settings list items.
- Settings include notifications, account, change password, chatbot/customer service, help, switch to barber, and logout.
- Bottom tab bar highlights the profile tab.
- Top navigation bar with status and back navigation.

# Visual properties

- Background: orange gradient or warm brand accent.
- Profile card: white text on orange background with a circular profile image.
- Settings list: white surface with subtle gray borders between items.
- Text: white for header information, orange for active list item labels, dark gray for section titles.

# Reusable components

- Profile header card
- Settings list item
- Toggle switch
- Bottom navigation bar
- Top navigation bar

# Interaction and navigation

- Tap "Notifikasi" to toggle notification settings.
- Tap "Akun" to view account details.
- Tap "Ganti Kata Sandi" to go to the password change screen.
- Tap "Chatbot & Customer Service" or "Bantuan" to open help channels.
- Tap "Beralih Ke Barber" to switch the user role.
- Tap "Logout" to sign out.

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
- `location`
  - Type: `string`
  - Required: yes
- `profileImageUrl`
  - Type: `string`
  - Required: no
- `notificationsEnabled`
  - Type: `boolean`
  - Required: yes
- `settings`
  - Type: `Array<{ label: string; route: string; active?: boolean }>`
  - Required: yes

# Profile flow position

- This screen is the central profile hub.
- It is reached from the app's bottom navigation.
- It leads to deeper account, security, and support screens.

# Validation rules

- `name`, `email`, and `location` must display in the header.
- The settings list should include the expected menu items.
- The profile tab in the bottom bar should be highlighted.

# React Native mapping

- `SafeAreaView`
- `View`
- `Text`
- `Image`
- `Pressable`
- `ScrollView`

# NativeWind mapping

- `bg-orange-600`
- `bg-white`
- `text-white`
- `text-slate-900`
- `rounded-xl`
- `rounded-2xl`
- `border`
- `border-slate-200`
- `px-4`
- `py-3`

# Component tree

- ProfileScreen
  - RootSafeArea
    - ProfileHeaderCard
    - SettingsSection
    - BottomNavigationBar

# States

- Profile default state
- Settings item press states
- Toggle switch state
