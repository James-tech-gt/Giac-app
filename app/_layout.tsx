import { auth } from '@/services/firebase';
import { configureGoogleSignIn } from '@/services/google-signin';
import { registerForPushNotifications, setupNotificationHandlers } from '@/services/notifications';
import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import '../global.css';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { OfflineBanner } from '@/components/offline-banner';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const segmentsRef = useRef(segments);
  useEffect(() => { segmentsRef.current = segments; }, [segments]);
  const registeredUidRef = useRef<string | null>(null);
  const [fontsLoaded, fontError] = useFonts({
    'CormorantGaramond-Regular': require('../assets/fonts/CormorantGaramond-Regular.ttf'),
    'CormorantGaramond-SemiBold': require('../assets/fonts/CormorantGaramond-SemiBold.ttf'),
    'CormorantGaramond-Bold': require('../assets/fonts/CormorantGaramond-Bold.ttf'),
    'SourceSans3-Regular': require('../assets/fonts/SourceSans3-Regular.ttf'),
    'SourceSans3-Semibold': require('../assets/fonts/SourceSans3-Semibold.ttf'),
    'SourceSans3-Bold': require('../assets/fonts/SourceSans3-Bold.ttf'),
  });

  const appTheme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: Colors.light.background,
      card: Colors.light.background,
      primary: Colors.light.tint,
      text: Colors.light.text,
      border: '#E3E9F2',
      notification: Colors.light.tint,
    },
  };

  // 3. Add this block
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const rootSegment = segmentsRef.current[0];
      const inAuthGroup = rootSegment === '(auth)';
      const inProtectedGroup = ['(main)', '(student)', '(applicant)', '(client)', 'admin'].includes(rootSegment ?? '');

      if (rootSegment === 'splashscreen' || rootSegment === 'onboarding') return;
      if (user && inAuthGroup) { router.replace('/(main)/home'); return; }
      if (!user && inProtectedGroup) { router.replace('/(auth)/login'); }

      if (user && registeredUidRef.current !== user.uid) {
        registeredUidRef.current = user.uid;
        // Defer so it doesn't block the navigation/render on startup
        setTimeout(() => registerForPushNotifications(user.uid).catch(() => {}), 3000);
      }
      if (!user) registeredUidRef.current = null;
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    Notifications.setBadgeCountAsync(0).catch(() => {});
    return setupNotificationHandlers();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <ThemeProvider value={appTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.light.background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="splashscreen" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
          <Stack.Screen name="(student)" />
          <Stack.Screen name="(applicant)" />
          <Stack.Screen name="(client)" />
          <Stack.Screen name="admin" />
        </Stack>
        <StatusBar style="dark" backgroundColor={Colors.light.background} />
        <OfflineBanner />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
