import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile } from '@/services/auth';
import {
  AccessRequirement,
  AccessSnapshot,
  hasAccess,
} from '@/services/access';
import { auth } from '@/services/firebase';
import { getApprovedApplications, getUserServices } from '@/services/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Href, Redirect } from 'expo-router';
import React, { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

const snapshotCacheKey = (uid: string) => `@giac:access:${uid}`;

async function loadCachedSnapshot(uid: string): Promise<AccessSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(snapshotCacheKey(uid));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveSnapshotCache(uid: string, snapshot: AccessSnapshot) {
  try {
    await AsyncStorage.setItem(snapshotCacheKey(uid), JSON.stringify(snapshot));
  } catch {}
}

function requiresProfile(requirement: AccessRequirement) {
  return requirement !== 'authenticated';
}

export function AccessGate({
  children,
  requirement,
  unauthorizedHref = '/(main)/home',
}: {
  children: ReactNode;
  requirement: AccessRequirement;
  unauthorizedHref?: Href;
}) {
  const [authResolved, setAuthResolved] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [snapshot, setSnapshot] = useState<AccessSnapshot>({
    approvedApplicationCount: 0,
    role: null,
    serviceCount: 0,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid ?? null);
      setAuthResolved(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let active = true;

    const loadAccess = async () => {
      if (!authResolved) {
        return;
      }

      if (!currentUserId) {
        if (!active) return;
        setSnapshot({
          approvedApplicationCount: 0,
          role: null,
          serviceCount: 0,
        });
        setLoadingAccess(false);
        return;
      }

      setLoadingAccess(true);

      try {
        const [profile, approvedApplications, services] = await Promise.all([
          requiresProfile(requirement) ? getUserProfile(currentUserId) : Promise.resolve(null),
          requirement === 'student' ? getApprovedApplications(currentUserId) : Promise.resolve([]),
          requirement === 'client' ? getUserServices(currentUserId) : Promise.resolve([]),
        ]);

        if (!active) return;

        const newSnapshot: AccessSnapshot = {
          approvedApplicationCount: approvedApplications.length,
          role: profile?.role ?? null,
          serviceCount: services.length,
        };
        setSnapshot(newSnapshot);
        saveSnapshotCache(currentUserId, newSnapshot);
      } catch {
        if (!active) return;

        // Firestore unavailable (offline) — use last-known snapshot so the user
        // stays on their screen rather than being bounced to the guest home page.
        const cached = await loadCachedSnapshot(currentUserId);
        setSnapshot(cached ?? { approvedApplicationCount: 0, role: null, serviceCount: 0 });
      } finally {
        if (active) {
          setLoadingAccess(false);
        }
      }
    };

    loadAccess();

    return () => {
      active = false;
    };
  }, [authResolved, currentUserId, requirement]);

  if (!authResolved || loadingAccess) {
    return (
      <View style={styles.state}>
        <ActivityIndicator size="small" color="#2A3F66" />
        <Text style={styles.stateText}>Checking access…</Text>
      </View>
    );
  }

  if (!currentUserId) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!hasAccess(requirement, snapshot)) {
    return <Redirect href={unauthorizedHref} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F8FAFD',
    paddingHorizontal: 24,
  },
  stateText: {
    color: '#4A5468',
    fontSize: 14,
  },
});
