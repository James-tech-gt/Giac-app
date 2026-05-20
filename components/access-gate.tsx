import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserProfile } from '@/context/user-profile';
import {
  AccessRequirement,
  AccessSnapshot,
  hasAccess,
} from '@/services/access';
import { getApprovedApplications, getUserServices } from '@/services/firestore';
import { Href, Redirect } from 'expo-router';
import React, { ReactNode, useEffect, useState } from 'react';

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

export function AccessGate({
  children,
  requirement,
  unauthorizedHref = '/(main)/home',
}: {
  children: ReactNode;
  requirement: AccessRequirement;
  unauthorizedHref?: Href;
}) {
  const { profile, uid, loading: profileLoading } = useUserProfile();
  const [extra, setExtra] = useState<{ approvedApplicationCount: number; serviceCount: number } | null>(null);

  const needsExtra =
    !profileLoading &&
    !!uid &&
    (requirement === 'student' || requirement === 'client') &&
    profile?.role !== 'admin' &&
    profile?.role !== 'student' &&
    profile?.role !== 'client';

  useEffect(() => {
    if (!needsExtra || !uid) return;

    let active = true;

    const run = async () => {
      const cached = await loadCachedSnapshot(uid);
      if (cached && active) {
        setExtra({ approvedApplicationCount: cached.approvedApplicationCount, serviceCount: cached.serviceCount });
      }

      try {
        const [applications, services] = await Promise.all([
          requirement === 'student' ? getApprovedApplications(uid) : Promise.resolve([]),
          requirement === 'client' ? getUserServices(uid) : Promise.resolve([]),
        ]);
        if (!active) return;
        const newExtra = { approvedApplicationCount: applications.length, serviceCount: services.length };
        setExtra(newExtra);
        saveSnapshotCache(uid, { role: profile?.role ?? null, ...newExtra });
      } catch {}
    };

    run();
    return () => { active = false; };
  }, [needsExtra, uid, requirement, profile?.role]);

  // Profile not yet loaded — render nothing briefly (happens only at cold start before navigation is possible)
  if (profileLoading) return null;

  if (!uid) return <Redirect href="/(auth)/login" />;

  // Extra data (approved applications / services) is still being fetched — wait before deciding access
  if (needsExtra && extra === null) return null;

  const snapshot: AccessSnapshot = {
    role: profile?.role ?? null,
    approvedApplicationCount: extra?.approvedApplicationCount ?? 0,
    serviceCount: extra?.serviceCount ?? 0,
  };

  if (!hasAccess(requirement, snapshot)) {
    return <Redirect href={unauthorizedHref} />;
  }

  return <>{children}</>;
}
