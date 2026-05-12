import { AccessGate } from '@/components/access-gate';
import { Stack } from 'expo-router';

export default function ClientLayout() {
  return (
    <AccessGate requirement="authenticated">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="request-mediation" />
      </Stack>
    </AccessGate>
  );
}
