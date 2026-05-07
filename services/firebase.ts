// Import the functions you need from the SDKs you need
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  type Auth,
  getAuth,
  getReactNativePersistence,
  GoogleAuthProvider,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBu4lUWVxVEdD9uNsMKVtl_xgWtHWz-Y3Q",
  authDomain: "giac-app-9752c.firebaseapp.com",
  projectId: "giac-app-9752c",
  storageBucket: "giac-app-9752c.firebasestorage.app",
  messagingSenderId: "529116845053",
  appId: "1:529116845053:web:f93487b3eab46af5083f94",
  measurementId: "G-HLK3MMB77H"
};

// Reuse the existing Firebase app during fast refresh instead of recreating it.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

type GlobalFirebaseState = typeof globalThis & {
  __giacAuth?: Auth;
};

const globalFirebaseState = globalThis as GlobalFirebaseState;

function createAuthInstance() {
  try {
    if (Platform.OS === "web") {
      // Web Auth already defaults to persistent browser storage.
      return getAuth(app);
    }

    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if ((error as { code?: string })?.code !== "auth/already-initialized") {
      console.warn("Firebase Auth persistence fell back to the existing instance.", error);
    }

    return getAuth(app);
  }
}

// Keep one Auth instance alive across dev reloads so persistence survives.
export const auth = globalFirebaseState.__giacAuth ?? (globalFirebaseState.__giacAuth = createAuthInstance());
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
