import { routes } from '@/constants/routes';
import { Redirect } from 'expo-router';

export default function IndexScreen() {
  return <Redirect href={routes.auth.onboarding(0)} />;
}
