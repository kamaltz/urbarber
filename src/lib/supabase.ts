import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";

import { firebaseAuth } from "@/lib/firebase";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Supabase configuration error: Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variables.",
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  accessToken: async () => {
    const user = firebaseAuth.currentUser;

    if (!user) {
      return null;
    }

    return user.getIdToken(false);
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});