import { Stack } from 'expo-router';

export default function ClientLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen 
        name="cases" 
        options={{ title: 'Cases' }}
      />
    </Stack>
  );
}
