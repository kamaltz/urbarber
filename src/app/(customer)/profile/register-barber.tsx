import { Redirect } from 'expo-router';

export default function RegisterBarberRedirectScreen() {
  return <Redirect href="/(auth)/register-customer" />;
}
