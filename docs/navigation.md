# Navigation map

Expo Router uses `src/app` as the route root. Route groups organize screens by actor without
changing the public URL.

## Customer flow

```text
onboarding/0 -> onboarding/1 -> onboarding/2 -> onboarding/3 -> login -> register
  -> home
     -> explore -> barber/[barberId] -> booking/options -> booking/schedule
        -> home service -> booking/location -> booking/invoice -> booking/history
        -> onsite service -----------------> booking/invoice -> booking/history
     -> favorites -> barber/[barberId]
     -> booking/history -> booking/detail/[bookingId]
                        -> booking/history/[bookingId] -> booking/rating/[bookingId]
     -> chat (list) -> chat/[conversationId] (room)
     -> profile -> account | change-password | help | about
```

Static paths and dynamic route builders live in `src/constants/routes.ts`. Use these helpers
instead of duplicating URL strings in components.

The main customer destinations share `CustomerBottomNavigation`. Detail and transactional
screens stay inside the customer stack and use back navigation.
