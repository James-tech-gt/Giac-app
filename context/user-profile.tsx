import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile, UserProfile } from '@/services/auth';
import { auth } from '@/services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface UserProfileContextValue {
  profile: UserProfile | null;
  uid: string | null;
  loading: boolean;
  reload: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextValue>({
  profile: null,
  uid: null,
  loading: true,
  reload: async () => {},
});

const profileCacheKey = (uid: string) => `@giac:profile:${uid}`;

function serializeProfile(profile: UserProfile): string {
  return JSON.stringify(profile);
}

function deserializeProfile(raw: string): UserProfile | null {
  try {
    const obj = JSON.parse(raw);
    return {
      ...obj,
      // JSON.stringify turns Date into a string — revive it
      createdAt: obj.createdAt ? new Date(obj.createdAt) : null,
    } as UserProfile;
  } catch {
    return null;
  }
}

async function loadCachedProfile(uid: string): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(profileCacheKey(uid));
    return raw ? deserializeProfile(raw) : null;
  } catch {
    return null;
  }
}

async function saveProfileCache(uid: string, profile: UserProfile) {
  try {
    await AsyncStorage.setItem(profileCacheKey(uid), serializeProfile(profile));
  } catch {}
}

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
      if (!user) {
        setProfile(null);
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (uid === null) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let active = true;

    // Load persisted profile from AsyncStorage first — instant, no network needed.
    // This means role is available immediately even when offline.
    loadCachedProfile(uid).then((cached) => {
      if (cached && active) {
        setProfile(cached);
        setLoading(false);
      }
    });

    // Fetch from Firestore in the background (authoritative source).
    // If offline, keep whatever AsyncStorage gave us.
    getUserProfile(uid)
      .then((p) => {
        if (!active) return;
        if (p) {
          setProfile(p);
          saveProfileCache(uid, p);
        }
        setLoading(false);
      })
      .catch(() => {
        // Firestore unavailable — AsyncStorage value is already set (or null if first login offline)
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [uid]);

  const reload = useCallback(async () => {
    if (!uid) return;
    const p = await getUserProfile(uid);
    if (p) {
      setProfile(p);
      saveProfileCache(uid, p);
    }
  }, [uid]);

  return (
    <UserProfileContext.Provider value={{ profile, uid, loading, reload }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  return useContext(UserProfileContext);
}
