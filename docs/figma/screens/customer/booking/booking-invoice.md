# Screen identity

- Frame name: INVOICE OTS
- Node ID: 8063:4206
- Exact frame dimensions: 375 x 812
- Purpose: Invoice summary screen for on-the-spot booking charges.
- Intended actor: Customer
- Proposed route: src/app/(customer)/booking/invoice.tsx

# Relationship to existing screens

- Follows booking review / payment choices.
- Precedes booking confirmation or payment completion.
- This is a standalone review screen for invoice details before checkout.

# Layout structure

- Top header with title and back navigation.
- Large invoice card with branding and booking summary.
- Sections for selected service details, add-ons, and pricing.
- Promo or coupon input area.
- Payment summary totals and checkout action.
- Status / help note for payment method or pickup instructions.

# Visual properties

- Background: white.
- Card surfaces: white with subtle border or shadow.
- Accent color: orange (`#d2691e`) for CTA and highlights.
- Text colors: dark gray (`#111827`), muted gray (`#6B7280`).
- Buttons: orange fill with white text.

# Reusable components

- Header bar
- Invoice card
- Service line item
- Price summary row
- Coupon / promo entry
- Checkout button

# Interaction and navigation

- Tap back to return to payment selection or previous booking step.
- Tap a line item to view service detail or edit.
- Enter a coupon code and apply discount.
- Tap checkout to confirm payment and proceed.

# Data contract

- `bookingId`
  - Type: `string`
  - Required: yes
- `serviceName`
  - Type: `string`
  - Required: yes
- `servicePrice`
  - Type: `string`
  - Required: yes
- `extras`
  - Type: `Array<{ name: string; price: string }>`
  - Required: no
- `discount`
  - Type: `string`
  - Required: no
- `subtotal`
  - Type: `string`
  - Required: yes
- `total`
  - Type: `string`
  - Required: yes
- `paymentMethod`
  - Type: `string`
  - Required: yes
- `couponCode`
  - Type: `string`
  - Required: no

# Booking flow position

- This is the invoice-review step for on-the-spot service billing.
- It follows booking detail and payment method selection.
- It leads directly to booking confirmation or payment success.

# Validation rules

- `bookingId`, `serviceName`, `servicePrice`, `subtotal`, and `total` are required.
- `total` should equal subtotal plus extras minus discount.
- `paymentMethod` must be set before checkout.

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
- `rounded-3xl`
- `border`
- `border-slate-200`
- `px-4`, `py-3`, `gap-4`

# Component tree

- BookingInvoiceScreen
  - RootSafeArea
    - HeaderBar
    - InvoiceSummaryCard
    - ServiceDetailSection
    - CouponInputSection
    - PaymentSummarySection
    - CheckoutButton

# States

- Default invoice state
- Coupon applied state
- Disabled checkout until required values exist
- Error state for invalid promo codes

# Implementation notes

- Keep the invoice summary concise and easy to scan.
- Emphasize the total price with bold text.
- Use a full-width CTA at the bottom of the content area.
- Preserve the booking review flow for OTS and OTH orders.
