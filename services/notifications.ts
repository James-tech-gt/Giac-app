import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { auth } from './firebase';
import { updateUserPushToken } from './firestore';

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'GIAC Notifications',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
  }).catch(() => {});
}

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

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  // Let network/token errors propagate so the caller's retry logic fires
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: '2c5403e1-398c-477d-ab76-1af1f18080b1',
  });
  await persistPushToken(uid, tokenData.data, 'save');
}

async function persistPushToken(
  uid: string,
  pushToken: string,
  reason: 'save' | 'rotation',
  attempt = 1
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== uid) return;

  try {
    if (attempt === 1) await currentUser.getIdToken(true);
    await updateUserPushToken(uid, pushToken);
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === 'permission-denied' && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
      return persistPushToken(uid, pushToken, reason, attempt + 1);
    }
  }
}

export function setupNotificationHandlers(
  onTap?: (notification: Notifications.Notification) => void,
  uid?: string | null,
): () => void {
  try {
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      onTap?.(response.notification);
    });

    // Keep Firestore in sync whenever FCM rotates the token.
    // The listener fires with the raw FCM/APNS token, so we re-fetch the Expo
    // push token (which may have a new mapping) rather than saving the raw one.
    const tokenSub = uid
      ? Notifications.addPushTokenListener(() => {
          Notifications.getExpoPushTokenAsync({
            projectId: '2c5403e1-398c-477d-ab76-1af1f18080b1',
          })
            .then((t) => persistPushToken(uid, t.data, 'rotation'))
            .catch(() => {});
        })
      : null;

    return () => {
      responseSub.remove();
      tokenSub?.remove();
    };
  } catch {
    return () => {};
  }
}
