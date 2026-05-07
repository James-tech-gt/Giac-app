import { AccessGate } from '@/components/access-gate';
import { Stack } from 'expo-router';

export default function ApplicantLayout() {
  return (
    <AccessGate requirement="authenticated">
      <Stack
        screenOptions={{
          headerShown: false,
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
    </AccessGate>
  );
}
