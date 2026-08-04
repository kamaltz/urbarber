import { Redirect, useLocalSearchParams } from 'expo-router';

/** Backward-compatible alias for old links; the canonical OTP route is otp-verification. */
export default function LegacyOtpRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/(auth)/otp-verification', params }} />;
}
