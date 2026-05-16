import { AccessGate } from '@/components/access-gate';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';

function BackGuard() {
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!router.canGoBack()) {
          router.replace('/(main)/home');
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [])
  );
  return null;
}

export default function StudentLayout() {
  return (
    <AccessGate requirement="student">
      <BackGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="materials" options={{ title: 'Materials' }} />
        <Stack.Screen name="assignments" options={{ title: 'Assignments' }} />
        <Stack.Screen name="tests" options={{ title: 'Tests' }} />
        <Stack.Screen name="certificates" options={{ title: 'Certificates' }} />
      </Stack>
    </AccessGate>
  );
}
