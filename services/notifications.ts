import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
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

export function navigateFromNotification(data: Record<string, string> | undefined | null): void {
  if (!data) return;
  const type = data.type;
  try {
    switch (type) {
      case 'case_message':
      case 'case_assigned':
      case 'case_updated':
      case 'case_completed':
        router.push('/(main)/cases');
        break;
      case 'graduation_invitation':
      case 'certificate_issued':
      case 'course_completed':
        router.push('/(student)/certificates' as any);
        break;
      case 'application_approved':
      case 'application_rejected':
        router.push('/(main)/application-status');
        break;
      case 'admission_letter':
        router.push('/(main)/notifications');
        break;
      case 'assignment_graded':
      case 'assignment_posted':
        router.push('/(student)/assignments' as any);
        break;
      case 'test_graded':
      case 'test_posted':
        router.push('/(student)/tests' as any);
        break;
      case 'material_posted':
      case 'session_posted':
        router.push('/(student)/materials' as any);
        break;
      case 'application':
      case 'service':
      case 'account':
      case 'registration':
        router.push('/admin');
        break;
      default:
        router.push('/(main)/notifications');
        break;
    }
  } catch {}
}

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
      const data = response.notification.request.content.data as Record<string, string>;
      navigateFromNotification(data);
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
