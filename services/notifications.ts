import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { updateUserPushToken } from './firestore';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {}

export async function registerForPushNotifications(uid: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '2c5403e1-398c-477d-ab76-1af1f18080b1',
    });
    await updateUserPushToken(uid, tokenData.data).catch(() => {});
  } catch {}
}

export function setupNotificationHandlers(
  onTap?: (notification: Notifications.Notification) => void
): () => void {
  try {
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      onTap?.(response.notification);
    });
    return () => responseSub.remove();
  } catch {
    return () => {};
  }
}
