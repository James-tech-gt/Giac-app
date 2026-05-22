import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

const GOOGLE_WEB_CLIENT_ID =
  '529116845053-0kr475md8ia75719u5cr89h0ijhm20qv.apps.googleusercontent.com';

const GOOGLE_IOS_CLIENT_ID =
  '529116845053-cn2m3r575rcvtno1iitim4u786tgnghn.apps.googleusercontent.com';

let configured = false;

export function configureGoogleSignIn() {
  if (Platform.OS === 'web' || configured) {
    return;
  }

  try {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      offlineAccess: true,
    });
    configured = true;
  } catch {
    // Expo Go and unsupported native environments can fail here.
  }
}

export function canUseNativeGoogleSignIn() {
  return Platform.OS !== 'web' && typeof GoogleSignin?.signIn === 'function';
}

