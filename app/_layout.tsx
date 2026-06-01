import { auth } from '@/services/firebase';
import { googleSignInState } from '@/services/auth';
import { configureGoogleSignIn } from '@/services/google-signin';
import { navigateFromNotification, registerForPushNotifications, setupNotificationHandlers } from '@/services/notifications';
import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import '../global.css';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { OfflineBanner } from '@/components/offline-banner';
import { UserProfileProvider } from '@/context/user-profile';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const segmentsRef = useRef(segments);
  useEffect(() => { segmentsRef.current = segments; }, [segments]);
  const registeredUidRef = useRef<string | null>(null);
  const handledInitialNotifRef = useRef(false);
  const [currentUid, setCurrentUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [fontsLoaded, fontError] = useFonts({
    'FontAwesome6Free-Regular': require('../assets/fonts/FontAwesome6_Regular.ttf'),
    'FontAwesome6Free-Solid': require('../assets/fonts/FontAwesome6_Solid.ttf'),
    'FontAwesome6Brands-Regular': require('../assets/fonts/FontAwesome6_Brands.ttf'),
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
      if (googleSignInState.inProgress) return;
      if (user && inAuthGroup) router.replace('/(main)/home');
      if (!user && inProtectedGroup) { router.replace('/(auth)/login'); }

      if (user) {
        setCurrentUid(user.uid);
        if (registeredUidRef.current !== user.uid) {
          registeredUidRef.current = user.uid;
          // Short delay so the Firebase Auth ID token is cached before the Firestore write
          setTimeout(() => {
            registerForPushNotifications(user.uid).catch(() => {
              // Retry once in case FCM or token wasn't ready yet
              registeredUidRef.current = null;
              setTimeout(() => registerForPushNotifications(user.uid).catch(() => {}), 5000);
            });
          }, 1500);
        }
      } else {
        registeredUidRef.current = null;
        setCurrentUid(null);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    Notifications.setBadgeCountAsync(0).catch(() => {});
    const cleanup = setupNotificationHandlers(undefined, currentUid);

    // Handle cold-start: app opened by tapping a notification while terminated
    if (currentUid && !handledInitialNotifRef.current) {
      handledInitialNotifRef.current = true;
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!response) return;
        // Only act on responses from the last 30 seconds (fresh tap, not a stale one)
        const ageMs = Date.now() - response.notification.date * 1000;
        if (ageMs < 30_000) {
          const data = response.notification.request.content.data as Record<string, string>;
          navigateFromNotification(data);
        }
      }).catch(() => {});
    }

    return cleanup;
  }, [currentUid]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        Notifications.setBadgeCountAsync(0).catch(() => {});
        // Re-register on every foreground in case FCM rotated the token
        // while the app was closed. getExpoPushTokenAsync is cached by the
        // SDK, so this is a no-op when the token hasn't changed.
        const uid = auth.currentUser?.uid;
        if (uid) registerForPushNotifications(uid).catch(() => {});
      }
    });
    return () => sub.remove();
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
      <UserProfileProvider>
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
      </UserProfileProvider>
    </GestureHandlerRootView>
  );
}
