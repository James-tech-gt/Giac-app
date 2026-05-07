import { AccessGate } from '@/components/access-gate';
import { Stack, useSegments } from 'expo-router';

export default function ClientLayout() {
  const segments = useSegments();
  const requirement = segments[1] === 'cases' ? 'client' : 'authenticated';

  return (
    <AccessGate requirement={requirement}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen 
          name="request-mediation" 
          options={{ title: 'Request Mediation' }}
        />
        <Stack.Screen 
          name="cases" 
          options={{ title: 'Cases' }}
        />
      </Stack>
    </AccessGate>
  );
}
