# Screen identity

- Frame name: DETAIL APPOINMENT (Bank Transfer)
- Node ID: 8063:5335
- Exact frame dimensions: 375 x 1106 (within a white card overlay)
- Purpose: Booking review and payment screen for bank transfer bookings.
- Intended actor: Customer
- Proposed route: src/app/(customer)/booking/review.tsx

# Relationship to existing screens

- Follows Booking Schedule in the booking flow.
- It is the review/payment route before final confirmation.
- This is a full route in the customer booking flow.

# Layout structure

- Top sheet/card overlay on orange background.
- Booking date and time summary section.
- Service list with prices.
- Coupon input and apply button.
- Payment method selection row.
- Local bank list card with selection state.
- Payment summary breakdown with total price.
- Bottom action button for checkout.

# Visual properties

- Card background: white.
- Page background: orange.
- Accent colors: orange (`#d2691e`), blue/gray, white.
- Border radius: large rounded top corners and buttons.
- Text colors: dark gray (`#111827`), muted gray (`#6B7280`), label gray.
- Input and card borders: light gray.

# Reusable components

- Section header with icon
- Service line item
- Coupon input field
- Payment method switch
- Bank option card
- Payment summary row
- Primary CTA button

# Interaction and navigation

- Tap back to return to schedule selection.
- Tap coupon apply to validate and apply a promo code.
- Tap payment method tabs to switch between e-Wallet and bank transfer.
- Tap a bank card to select a bank.
- Tap checkout button to complete the payment.

# Data contract

- `barberId`
  - Type: `string`
  - Required: yes
- `customerId`
  - Type: `string`
  - Required: yes
- `serviceId`
  - Type: `string`
  - Required: yes
- `serviceName`
  - Type: `string`
  - Required: yes
- `servicePrice`
  - Type: `string`
  - Required: yes
- `durationMinutes`
  - Type: `number`
  - Required: no
- `selectedDate`
  - Type: `string`
  - Required: yes
- `selectedTime`
  - Type: `string`
  - Required: yes
- `slotKey`
  - Type: `string`
  - Required: yes
- `address`
  - Type: `string`
  - Required: no
- `notes`
  - Type: `string`
  - Required: no
- `bookingStatus`
  - Type: `string`
  - Required: yes
- `paymentMethod`
  - Type: `"ewallet" | "bank_transfer"`
  - Required: yes
- `couponCode`
  - Type: `string`
  - Required: no
- `couponDiscount`
  - Type: `string`
  - Required: no
- `totalPrice`
  - Type: `string`
  - Required: yes
- `selectedBankId`
  - Type: `string`
  - Required: no

# Booking flow position

- This is the final review/payment step.
- It is entered after date/time selection and service choice.
- It precedes payment confirmation.

# Validation rules

- `selectedDate`, `selectedTime`, and `bookingStatus` are required.
- `paymentMethod` must be selected.
- `totalPrice` must be recalculated after coupon application.
- `selectedBankId` is required when `paymentMethod` is `bank_transfer`.

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
- `text-slate-900`
- `text-slate-500`
- `text-white`
- `rounded-3xl`
- `rounded-xl`
- `border`
- `border-slate-200`
- `px-4`, `py-3`, `gap-4`

# Component tree

- BookingReviewScreen
  - RootView
    - CardOverlay
      - BookingSummarySection
      - ServiceListSection
      - CouponSection
      - PaymentMethodSelection
      - BankListSection
      - PaymentSummarySection
      - CheckoutButton

# States

- Default review state
- Coupon entered state
- Bank transfer selected state
- Payment method switching state
- Disabled checkout state when required inputs are missing

# Implementation notes

- Use a rounded white overlay card on top of the background.
- Keep the checkout CTA visible at the bottom of the card.
- Validate coupon codes before applying discounts.
- Render bank options as selectable cards with logos.
- Use `bookingStatus` to determine whether checkout is allowed.

# Navigation

- Input: `barberId`, `serviceId`, `selectedDate`, `selectedTime`, `slotKey`, booking details.
- Output: booking confirmation or payment success state.
