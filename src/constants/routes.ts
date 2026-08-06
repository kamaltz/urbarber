/** Single source of truth for navigation paths and dynamic route builders. */
export const routes = {
  auth: {
    onboarding: (step: 0 | 1 | 2 | 3) => ({ pathname: '/(auth)/onboarding/[step]' as const, params: { step } }),
    login: '/(auth)/login',
    register: '/(auth)/register-customer',
    forgotPassword: '/(auth)/forgot-password',
    authentication: '/(auth)/authentication',
    otp: '/(auth)/otp-verification',
  },
  barber: {
    home: '/(barber)/home',
  },
  admin: {
    dashboard: '/(admin)/dashboard',
  },
  customer: {
    home: '/(customer)/home',
    explore: '/(customer)/explore',
    favorites: '/(customer)/favorites',
    chats: '/(customer)/chat',
    profile: '/(customer)/profile',
    terms: '/(customer)/terms-condition',
    bookingOptions: '/(customer)/booking/options',
    bookingSchedule: '/(customer)/booking/schedule',
    bookingLocation: '/(customer)/booking/location',
    bookingInvoice: '/(customer)/booking/invoice',
    bookingHistory: '/(customer)/booking/history',
    barber: (barberId: string) => ({ pathname: '/(customer)/barber/[barberId]' as const, params: { barberId } }),
    chat: (conversationId: string) => ({ pathname: '/(customer)/chat/[conversationId]' as const, params: { conversationId } }),
    activeBooking: (bookingId: string) => ({ pathname: '/(customer)/booking/detail/[bookingId]' as const, params: { bookingId } }),
    pastBooking: (bookingId: string) => ({ pathname: '/(customer)/booking/history/[bookingId]' as const, params: { bookingId } }),
    rating: (bookingId: string) => ({ pathname: '/(customer)/booking/rating/[bookingId]' as const, params: { bookingId } }),
    registerBarber: '/(customer)/profile/register-barber',
  },
} as const;
