import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fonts } from '@/constants/theme';
import { auth } from '@/services/firebase';
import {
  Announcement,
  StudentNotification,
  markStudentNotificationsRead,
  subscribeAnnouncements,
  subscribeStudentNotifications,
} from '@/services/firestore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LAST_SEEN_KEY = '@giac:notif_last_seen';

const C = {
  bg: '#F8FAFD',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F5FA',
  primary: '#14213A',
  secondary: '#2A3F66',
  success: '#3B6B49',
  successSoft: '#E6F0E9',
  danger: '#7A2E2E',
  dangerSoft: '#F9EFEC',
  warning: '#8C6A1F',
  warningSoft: '#F4ECD2',
  textPrimary: '#14213A',
  textSecondary: '#4A5468',
  textMuted: '#6B7689',
  border: '#E3E9F2',
};

function formatDate(ts: unknown): string {
  if (!ts) return '';
  const date =
    typeof ts === 'object' && ts !== null && 'toDate' in ts &&
    typeof (ts as any).toDate === 'function'
      ? (ts as any).toDate()
      : new Date(ts as any);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function AnnouncementItem({ item, isNew }: { item: Announcement; isNew: boolean }) {
  return (
    <View style={[styles.item, item.urgent && styles.itemUrgent]}>
      <View style={styles.itemTop}>
        <View style={styles.itemLeft}>
          <View style={[styles.dot, item.urgent ? styles.dotUrgent : styles.dotNormal]} />
          <Text style={styles.itemTitle}>{item.title}</Text>
        </View>
        <View style={styles.itemMeta}>
          {isNew && (
            <View style={styles.newPill}>
              <Text style={styles.newPillText}>New</Text>
            </View>
          )}
          {item.urgent && (
            <View style={styles.urgentPill}>
              <Text style={styles.urgentPillText}>Urgent</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.itemDetail}>{item.detail}</Text>
      {item.createdAt ? (
        <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
      ) : null}
    </View>
  );
}

function PersonalNotifItem({ item }: { item: StudentNotification }) {
  const isApproved = item.type === 'application_approved';
  const isRejected = item.type === 'application_rejected';
  const isAssignment = item.type === 'assignment_graded';

  let dotColor = C.secondary;
  let tagLabel = 'Update';
  let tagBg = '#E9EEF8';
  let tagColor = C.secondary;
  let rowStyle = styles.gradeItem;

  if (isApproved) {
    dotColor = C.success;
    tagLabel = 'Approved';
    tagBg = C.successSoft;
    tagColor = C.success;
    rowStyle = styles.approvedItem;
  } else if (isRejected) {
    dotColor = C.danger;
    tagLabel = 'Not Approved';
    tagBg = C.dangerSoft;
    tagColor = C.danger;
    rowStyle = styles.rejectedItem;
  } else if (isAssignment) {
    tagLabel = 'Assignment';
  } else {
    tagLabel = 'Test';
    tagBg = C.warningSoft;
    tagColor = C.warning;
  }

  return (
    <View style={[styles.item, rowStyle]}>
      <View style={styles.itemTop}>
        <View style={styles.itemLeft}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Text style={styles.itemTitle}>{item.message}</Text>
        </View>
        <View style={styles.itemMeta}>
          {!item.read && (
            <View style={styles.newPill}>
              <Text style={styles.newPillText}>New</Text>
            </View>
          )}
          <View style={[styles.urgentPill, { backgroundColor: tagBg }]}>
            <Text style={[styles.urgentPillText, { color: tagColor }]}>{tagLabel}</Text>
          </View>
        </View>
      </View>
      {item.createdAt ? (
        <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
      ) : null}
    </View>
  );
}

export default function NotificationsScreen() {
  const user = auth.currentUser;
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [personalNotifs, setPersonalNotifs] = useState<StudentNotification[]>([]);
  const [lastSeenMs, setLastSeenMs] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(LAST_SEEN_KEY).then((val) => {
      setLastSeenMs(val ? Number(val) : null);
      AsyncStorage.setItem(LAST_SEEN_KEY, Date.now().toString());
    });
    return subscribeAnnouncements(setAnnouncements);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeStudentNotifications(user.uid, (notifs) => {
      setPersonalNotifs(notifs);
      const unread = notifs.filter((n) => !n.read).map((n) => n.id);
      if (unread.length > 0) markStudentNotificationsRead(unread).catch(() => {});
    });
    return unsub;
  }, [user?.uid]);

  function isNew(ann: Announcement): boolean {
    if (lastSeenMs === null) return false;
    if (!ann.createdAt) return false;
    const d =
      typeof ann.createdAt === 'object' && 'toDate' in ann.createdAt
        ? (ann.createdAt as any).toDate().getTime()
        : new Date(ann.createdAt).getTime();
    return !isNaN(d) && d > lastSeenMs;
  }

  const applicationNotifs = personalNotifs.filter(
    (n) => n.type === 'application_approved' || n.type === 'application_rejected'
  );
  const gradeNotifs = personalNotifs.filter(
    (n) => n.type === 'assignment_graded' || n.type === 'test_graded'
  );

  const hasContent = announcements.length > 0 || personalNotifs.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <FontAwesome6 name="arrow-left" size={16} color={C.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Updates</Text>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Application updates, grades, and announcements from GIAC.</Text>
        </View>

        {!hasContent ? (
          <View style={styles.emptyCard}>
            <FontAwesome6 name="bell-slash" size={22} color={C.textMuted} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyBody}>Check back later for updates from GIAC.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {applicationNotifs.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Application Updates</Text>
                {applicationNotifs.map((n) => (
                  <PersonalNotifItem key={n.id} item={n} />
                ))}
              </>
            )}
            {gradeNotifs.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Grade Updates</Text>
                {gradeNotifs.map((n) => (
                  <PersonalNotifItem key={n.id} item={n} />
                ))}
              </>
            )}
            {announcements.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Announcements</Text>
                {announcements.map((ann) => (
                  <AnnouncementItem key={ann.id} item={ann} isNew={isNew(ann)} />
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 20, paddingBottom: 60 },

  header: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },

  hero: { gap: 6 },
  eyebrow: {
    fontSize: 12, fontFamily: Fonts.sansSemiBold, color: C.secondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  title: { fontSize: 34, lineHeight: 40, fontFamily: Fonts.displayBold, color: C.textPrimary },
  subtitle: { fontSize: 15, lineHeight: 24, fontFamily: Fonts.sans, color: C.textSecondary },

  list: { gap: 12 },

  item: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  itemUrgent: {
    borderColor: '#E8C47A',
    backgroundColor: '#FFFDF5',
  },
  approvedItem: {
    borderColor: '#B3D4BD',
    backgroundColor: '#F2F9F4',
  },
  rejectedItem: {
    borderColor: '#E8B8B8',
    backgroundColor: C.dangerSoft,
  },
  gradeItem: {
    borderColor: '#D0DAF0',
    backgroundColor: '#F4F7FD',
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  dotNormal: { backgroundColor: C.secondary },
  dotUrgent: { backgroundColor: C.warning },
  itemTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
    lineHeight: 22,
  },
  itemMeta: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  newPill: {
    backgroundColor: C.danger,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newPillText: {
    fontSize: 10,
    fontFamily: Fonts.sansBold,
    color: '#FFFFFF',
  },
  urgentPill: {
    backgroundColor: C.warningSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgentPillText: {
    fontSize: 10,
    fontFamily: Fonts.sansBold,
    color: C.warning,
  },
  itemDetail: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  itemDate: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },

  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 32,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textMuted,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansSemiBold,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
});
