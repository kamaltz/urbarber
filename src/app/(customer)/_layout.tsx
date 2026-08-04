import { Stack } from 'expo-router';

export default function CustomerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        presentation: 'card',
      }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="explore" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
