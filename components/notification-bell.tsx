import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fonts } from '@/constants/theme';
import { getUserProfile } from '@/services/auth';
import { auth } from '@/services/firebase';
import {
  AdminNotification,
  Announcement,
  StudentNotification,
  subscribeAdminNotifications,
  subscribeAnnouncements,
  subscribeStudentNotifications,
} from '@/services/firestore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const LAST_SEEN_KEY = '@giac:notif_last_seen';

function toMs(ts: unknown): number | null {
  if (!ts) return null;
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts &&
      typeof (ts as any).toDate === 'function') {
    return (ts as any).toDate().getTime();
  }
  const d = new Date(ts as any);
  return isNaN(d.getTime()) ? null : d.getTime();
}

export default function NotificationBell({ color = '#14213A' }: { color?: string }) {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [studentNotifs, setStudentNotifs] = useState<StudentNotification[]>([]);
  const [adminNotifs, setAdminNotifs] = useState<AdminNotification[]>([]);
  const [lastSeenMs, setLastSeenMs] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (user) => setUid(user?.uid ?? null)), []);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(LAST_SEEN_KEY).then((val) => {
        setLastSeenMs(val ? Number(val) : null);
      });
    }, [])
  );

  useEffect(() => {
    AsyncStorage.getItem(LAST_SEEN_KEY).then((val) => {
      setLastSeenMs(val ? Number(val) : null);
    });
    return subscribeAnnouncements(setAnnouncements);
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribeNotifications: (() => void) | undefined;

    async function loadNotificationSource() {
      if (!uid) {
        if (active) {
          setIsAdmin(false);
          setStudentNotifs([]);
          setAdminNotifs([]);
        }
        return;
      }

      try {
        const profile = await getUserProfile(uid);
        const admin = profile?.role === 'admin';
        if (!active) return;
        setIsAdmin(admin);
        unsubscribeNotifications = admin
          ? subscribeAdminNotifications(setAdminNotifs)
          : subscribeStudentNotifications(uid, setStudentNotifs);
      } catch {
        if (!active) return;
        setIsAdmin(false);
        unsubscribeNotifications = subscribeStudentNotifications(uid, setStudentNotifs);
      }
    }

    loadNotificationSource();

    return () => {
      active = false;
      unsubscribeNotifications?.();
    };
  }, [uid]);

  const unread = useMemo(() => {
    if (isAdmin) {
      return adminNotifs.length;
    }
    const newAnnouncements = lastSeenMs === null
      ? announcements.length
      : announcements.filter((a) => {
          const ms = toMs(a.createdAt);
          return ms !== null && ms > lastSeenMs;
        }).length;
    const unreadPersonal = studentNotifs.filter((n) => !n.read).length;
    return newAnnouncements + unreadPersonal;
  }, [adminNotifs, announcements, isAdmin, studentNotifs, lastSeenMs]);

  return (
    <Pressable
      onPress={() => router.push('/(main)/notifications')}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      hitSlop={8}
    >
      <FontAwesome6 name="bell" size={17} color={color} />
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E9F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#7A2E2E',
    borderRadius: 999,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: Fonts.sansBold,
    color: '#FFFFFF',
  },
});
