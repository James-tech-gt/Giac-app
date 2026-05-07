import { AccessGate } from '@/components/access-gate';
import { Stack } from 'expo-router';

export default function StudentLayout() {
  return (
    <AccessGate requirement="student">
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="materials" options={{ title: 'Materials' }} />
        <Stack.Screen name="assignments" options={{ title: 'Assignments' }} />
        <Stack.Screen name="tests" options={{ title: 'Tests' }} />
        <Stack.Screen name="certificates" options={{ title: 'Certificates' }} />
      </Stack>
    </AccessGate>
  );
}
