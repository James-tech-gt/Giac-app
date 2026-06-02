import {
    createUserWithEmailAndPassword,
    deleteUser,
    getAdditionalUserInfo,
    GoogleAuthProvider,
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithCredential,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    User
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { normalizeUserRole } from './access';
import { auth, db, googleProvider } from './firebase';
import type { UserRole } from './access';

const USERS_COLLECTION = 'users';
const GOOGLE_NATIVE_UNAVAILABLE_MESSAGE =
  'Google sign-in needs the web flow or a development build with native Google Sign-In enabled.';

// Shared flag: prevents _layout.tsx from navigating while Google sign-in
// is still verifying whether the user has an existing account.
export const googleSignInState = { inProgress: false };
export type { UserRole } from './access';

export interface UserProfile {
  fullName: string;
  phone: string;
  role: UserRole;
  email: string;
  photoURL?: string;
  createdAt: Date | null;
}

function buildUserProfile(
  user: User,
  overrides: {
    fullName?: string;
    phone?: string;
    role?: UserRole;
    email?: string;
  } = {}
): UserProfile {
  return {
    fullName: overrides.fullName?.trim() || user.displayName || '',
    phone: overrides.phone?.trim() || '',
    role: normalizeUserRole(overrides.role),
    email: overrides.email?.trim() || user.email || '',
    createdAt: new Date(),
  };
}

async function ensureUserProfile(
  user: User,
  overrides: {
    fullName?: string;
    phone?: string;
    role?: UserRole;
    email?: string;
  } = {}
) {
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  await setDoc(userRef, buildUserProfile(user, overrides), { merge: true });
}

/**
 * Sign up a new user
 */
export async function signUp(
  email: string,
  password: string,
  userData: {
    fullName: string;
    phone: string;
    role?: UserRole;
  }
): Promise<User> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(
      doc(db, USERS_COLLECTION, user.uid),
      buildUserProfile(user, {
        fullName: userData.fullName,
        phone: userData.phone,
        role: userData.role,
        email,
      }),
      { merge: true }
    );

    return user;
  } catch (error) {
    throw error;
  }
}

/**
 * Sign in an existing user
 */
export async function signIn(email: string, password: string): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
}

/**
 * Sign out the current user
 */
export async function logOut(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
}

/**
 * Get the current user's profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        fullName: data.fullName || '',
        phone: data.phone || '',
        role: normalizeUserRole(data.role ?? data.Role),
        email: data.email || '',
        photoURL: data.photoURL || undefined,
        createdAt: data.createdAt?.toDate?.() ?? data.createdAt ?? null,
      } as UserProfile;
    }

    return null;
  } catch (error) {
    throw error;
  }
}

/**
 * Update the current user's profile fields in Firestore
 */
export async function updateUserProfile(
  uid: string,
  updates: { fullName?: string; phone?: string; photoURL?: string }
): Promise<void> {
  const updateData: Record<string, string> = {};
  if (updates.fullName !== undefined) updateData.fullName = updates.fullName.trim();
  if (updates.phone !== undefined) updateData.phone = updates.phone.trim();
  if (updates.photoURL !== undefined) updateData.photoURL = updates.photoURL;

  if (Object.keys(updateData).length === 0) {
    return;
  }

  await updateDoc(doc(db, USERS_COLLECTION, uid), updateData);
}

/**
 * Sign in with Google using credentials from native Google Sign-In
 * @param idToken - The ID token from Google Sign-In
 * @returns The Firebase user
 */
export async function signInWithGoogle(idToken: string): Promise<User> {
  googleSignInState.inProgress = true;
  try {
    if (!idToken) {
      if (Platform.OS !== 'web') {
        throw new Error(GOOGLE_NATIVE_UNAVAILABLE_MESSAGE);
      }
      const userCredential = await signInWithPopup(auth, googleProvider);
      const info = getAdditionalUserInfo(userCredential);
      if (info?.isNewUser) {
        await deleteUser(userCredential.user);
        throw Object.assign(new Error('No account found. Please sign up first.'), { code: 'auth/no-account' });
      }
      return userCredential.user;
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    const info = getAdditionalUserInfo(userCredential);
    if (info?.isNewUser) {
      await deleteUser(userCredential.user);
      throw Object.assign(new Error('No account found. Please sign up first.'), { code: 'auth/no-account' });
    }
    return userCredential.user;
  } finally {
    googleSignInState.inProgress = false;
  }
}

/**
 * Send a verification email to the currently signed-in user
 */
export async function sendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('No signed-in user.');
  await sendEmailVerification(user);
}

/**
 * Send a password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Sign up with Google using credentials from native Google Sign-In
 * @param idToken - The ID token from Google Sign-In
 * @param fullName - User's full name (optional, can use displayName from Google)
 * @returns The Firebase user
 */
export async function signUpWithGoogle(
  idToken: string,
  fullName?: string
): Promise<User> {
  try {
    if (!idToken) {
      if (Platform.OS !== 'web') {
        throw new Error(GOOGLE_NATIVE_UNAVAILABLE_MESSAGE);
      }

      const userCredential = await signInWithPopup(auth, googleProvider);
      await ensureUserProfile(userCredential.user, { fullName });
      return userCredential.user;
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);

    await ensureUserProfile(userCredential.user, { fullName });

    return userCredential.user;
  } catch (error) {
    throw error;
  }
}

