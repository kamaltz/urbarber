# Reusable UI Components Inventory

Scope inspected:
- [docs/figma/design-system.md](docs/figma/design-system.md)
- [docs/figma/screens](docs/figma/screens)
- [docs/figma/screenshots](docs/figma/screenshots)

Notes:
- This inventory lists reusable UI components, normalized from naming variants across screen docs.
- Style-only bullets from legacy docs (for example width/height/color lines) are intentionally excluded as non-component entries.

## Layout

- SafeArea screen container
- Standard page wrapper used across auth, customer, and barber screens.

- Content card / surface card
- Rounded white card shell used in profile, booking, and analytics sections.

- Bottom sheet panel
- Reused modal sheet pattern for service add and transactional overlays.

- Modal overlay backdrop
- Dimmed overlay layer used by filter and modal flows.

- Section block container
- Generic titled block wrapper used in booking details, verification, and profile screens.

- Key-value row
- Reused label-value row pattern for details, totals, and summaries.

- List row item container
- Shared row shell for chats, settings, services, and booking item lists.

- Hero block / hero card
- Top visual block for onboarding/profile/about/home explore contexts.

- Empty-space home indicator bar
- Bottom indicator capsule used in onboarding and some sheet-style layouts.

## Navigation

- Top navigation bar
- Shared back/title/action header across most flows.

- Bottom tab bar
- Shared role shell tabs for customer/barber core navigation.

- Segmented tab control
- Booking history/active tabs and similar state selection bars.

- Tab header (booking status)
- Booking state switch header used in active/cancelled status screens.

- Header with back navigation
- Variant of top nav with explicit back affordance and title.

- Filter header
- Dedicated header for filter sheet and quick filter actions.

- Opening hours header action
- Header right action for service/schedule management context.

## Input

- Primary text field
- Reusable labeled text input for auth/profile/verification forms.

- Password input field
- Input with visibility toggle for secure entries.

- OTP input group
- Multi-cell verification code input.

- Search input
- Shared search field used in home, find barber, favorite barber, and chat list.

- Text area input
- Reusable long-form input for help/review/notes.

- Coupon/promo input
- Entry field for discounts in checkout/invoice flows.

- Payment method switch
- Selector for payment method options.

- Terms agreement row
- Checkbox + linked terms text row in registration/verification flows.

- Star rating input
- Interactive rating control for customer review submission.

- Time field / time slot selector
- Reusable schedule time picker and bookable slot button pattern.

- File picker field
- Upload picker row for verification documents/media.

- Service name field
- Dedicated service form text field.

- Service price field
- Currency-oriented service price input.

- Service photo picker field
- Media picker field for service image upload.

## Display

- Primary action button
- Shared filled CTA button pattern (auth, booking, profile, verification).

- Secondary/destructive action button
- Alternative CTA for cancel/reject/negative actions.

- Status badge
- Generic badge/chip for open/active/status labels.

- Tag chip / category chip
- Rounded chip tokens for categories and tags.

- Rating row / star rating display
- Read-only rating visuals for barber cards and reviews.

- Progress tracker / progress indicator
- Multi-step status tracker in booking lifecycle screens.

- Summary row / payment summary row
- Reused compact summary rows for totals and metadata.

- Price summary list
- Itemized price lines + subtotal/total composition.

- Service list item
- Service line entry used in barber detail, booking, and invoice contexts.

- Profile header card
- User avatar, identity, and metadata card at top of profile views.

- Branded hero block
- Marketing/about visual card block.

- Review list item
- Reviewer identity + comment + rating display row.

- KPI summary card
- Two or more KPI metrics in analytics.

- Revenue trend mini chart
- Small chart card for revenue trend display.

- Revenue period summary
- Daily/weekly/monthly summary block.

- Latest review snippet
- Compact latest feedback panel for analytics view.

## Feedback

- Unread badge
- Numeric unread bubble on chat list rows.

- Notification badge icon
- Small dot/counter badge on home/top actions.

- Read status icon
- Message read receipt icon in chat rows/messages.

- Online status indicator
- Presence dot/text for participant availability.

- Resend code link
- OTP resend action element.

- Legal content block
- Terms/policy text renderer including numbered/bulleted clauses.

- Upload helper text row
- Inline helper/instruction row for upload requirements.

- Status icon block
- Centered status icon + headline pattern in verification process screen.

## Booking

- Booking card (summary)
- Compact booking snapshot card with barber/service/date/status.

- Booking detail sheet
- Overlay detail panel for transaction/booking deep details.

- Action button row
- Grouped action controls for booking state transitions.

- Date picker calendar
- Month/day selector for appointment scheduling.

- Date chip
- Selected date pill in booking timeline.

- Time slot button
- Selectable timeslot control for scheduling.

- Service option card
- Selectable service card in booking option/schedule.

- Location summary row
- Compact selected location summary.

- Map preview card
- Embedded map/thumbnail preview of booking location.

- Saved address card
- Address card used in save/fix location steps.

- Location confirmation card
- Confirmation surface prior to proceeding checkout/status.

- Invoice card
- Invoice summary block with service and payment lines.

- Pricing summary card
- Aggregated pricing breakdown container.

- Shop summary/detail card
- Shop metadata card used before review/rating actions.

## Chat

- Chat list row
- Conversation preview row with avatar, snippet, time, and unread state.

- Chat header
- Conversation title/back/presence top area.

- Message bubble
- Shared incoming/outgoing bubble containers.

- Incoming bubble style
- Appearance variant for received messages.

- Outgoing bubble style
- Appearance variant for sent messages.

- Date separator pill/capsule
- In-thread day separator element.

- Message input bar
- Composer row with text input and send action.

- Send button icon
- Icon-only message send trigger.

- Delivery/read status icon
- Per-message delivery/read indicator.

## Component Families (Cross-actor Reuse)

- Shared across Admin, Barber, Customer:
- Chat list row
- Chat header
- Message bubble
- Message input bar
- Unread/read status indicators

- Shared across Barber and Customer:
- Top navigation bar
- Bottom tab bar
- Primary action button
- Rating row / star display
- Key-value row
- Summary and price line patterns

- Shared across Auth and transactional flows:
- Primary action button
- Labeled text field
- Terms agreement row

## Screenshot Corroboration

The following screenshot groups corroborate repeated component usage across actors and flows:
- [docs/figma/screenshots/shared](docs/figma/screenshots/shared)
- [docs/figma/screenshots/admin](docs/figma/screenshots/admin)
- [docs/figma/screenshots/barber](docs/figma/screenshots/barber)
- [docs/figma/screenshots/customer](docs/figma/screenshots/customer)
- [docs/figma/screenshots/auth](docs/figma/screenshots/auth)
