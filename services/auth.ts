import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserProfile {
  fullName: string;
  phone: string;
  role: 'applicant' | 'student' | 'professional' | 'admin';
  email: string;
  createdAt: Date;
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
    role?: 'applicant' | 'student' | 'professional' | 'admin';
  }
): Promise<User> {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user profile in Firestore
    const userProfile: UserProfile = {
      fullName: userData.fullName,
      phone: userData.phone,
      role: userData.role || 'applicant',
      email: user.email || email,
      createdAt: new Date(),
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);

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
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    throw error;
  }
}
