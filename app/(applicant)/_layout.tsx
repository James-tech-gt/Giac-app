import { Stack } from 'expo-router';

export default function ApplicantLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen 
        name="apply" 
        options={{ title: 'Apply for Training' }}
      />
      <Stack.Screen 
        name="status" 
        options={{ title: 'Application Status' }}
      />
    </Stack>
  );
}
