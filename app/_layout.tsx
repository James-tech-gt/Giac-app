import { useEffect } from 'react'; // 1. Add this
import { GoogleSignin } from '@react-native-google-signin/google-signin'; // 2. Add this
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // 3. Add this block
  useEffect(() => {
    GoogleSignin.configure({
      // Use the WEB CLIENT ID from Google Cloud Console
      webClientId: '529116845053-0kr475md8ia75719u5cr89h0ijhm20qv.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0A1628' }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0A1628' },
          }}
        >
          <Stack.Screen name="splashscreen" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
          <Stack.Screen name="(student)" />
          <Stack.Screen name="(applicant)" />
          <Stack.Screen name="(client)" />
        </Stack>
        <StatusBar style="light" backgroundColor="#0A1628" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}