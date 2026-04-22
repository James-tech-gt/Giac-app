import { Stack } from 'expo-router';

export default function StudentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen 
        name="dashboard" 
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen 
        name="materials" 
        options={{ title: 'Materials' }}
      />
    </Stack>
  );
}
