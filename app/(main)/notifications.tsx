import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fonts } from '@/constants/theme';
import { useUserProfile } from '@/context/user-profile';
import {
  AdminNotification,
  Announcement,
  markAdminNotificationsRead,
  StudentNotification,
  subscribeAdminNotifications,
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

function navigateForNotif(item: StudentNotification) {
  switch (item.type) {
    case 'case_message':
    case 'case_assigned':
    case 'case_updated':
    case 'case_completed':
      router.push({ pathname: '/(main)/cases', params: { openCaseId: item.referenceId } } as any);
      break;
    case 'application_approved':
    case 'application_rejected':
      router.push('/(main)/application-status' as any);
      break;
    case 'material_posted':
      router.push('/(student)/materials' as any);
      break;
    case 'assignment_posted':
    case 'assignment_graded':
      router.push('/(student)/assignments' as any);
      break;
    case 'test_posted':
    case 'test_graded':
      router.push('/(student)/tests' as any);
      break;
    case 'certificate_issued':
    case 'course_completed':
      router.push('/(student)/dashboard' as any);
      break;
  }
}

function hasPersonalNavTarget(item: StudentNotification): boolean {
  return (
    item.type === 'case_message' || item.type === 'case_assigned' ||
    item.type === 'case_updated' || item.type === 'case_completed' ||
    item.type === 'application_approved' || item.type === 'application_rejected' ||
    item.type === 'material_posted' || item.type === 'assignment_posted' ||
    item.type === 'assignment_graded' || item.type === 'test_posted' ||
    item.type === 'test_graded' || item.type === 'certificate_issued' ||
    item.type === 'course_completed'
  );
}

function PersonalNotifItem({ item }: { item: StudentNotification }) {
  let dotColor = C.secondary;
  let tagLabel = 'Update';
  let tagBg = '#E9EEF8';
  let tagColor = C.secondary;
  let rowStyle = styles.gradeItem;

  switch (item.type) {
    case 'application_approved':
      dotColor = C.success;
      tagLabel = 'Approved';
      tagBg = C.successSoft;
      tagColor = C.success;
      rowStyle = styles.approvedItem;
      break;
    case 'application_rejected':
      dotColor = C.danger;
      tagLabel = 'Not Approved';
      tagBg = C.dangerSoft;
      tagColor = C.danger;
      rowStyle = styles.rejectedItem;
      break;
    case 'material_posted':
      tagLabel = 'Material';
      tagBg = '#EAF0F8';
      tagColor = '#2E4A8A';
      rowStyle = styles.courseItem;
      break;
    case 'assignment_posted':
      tagLabel = 'Assignment';
      tagBg = '#EAF0F8';
      tagColor = '#2E4A8A';
      rowStyle = styles.courseItem;
      break;
    case 'test_posted':
      tagLabel = 'Test';
      tagBg = C.warningSoft;
      tagColor = C.warning;
      rowStyle = styles.courseItem;
      break;
    case 'assignment_graded':
      tagLabel = 'Graded';
      break;
    case 'test_graded':
      tagLabel = 'Graded';
      tagBg = C.warningSoft;
      tagColor = C.warning;
      break;
    case 'case_assigned':
      dotColor = '#2E4A8A';
      tagLabel = 'Case Update';
      tagBg = '#E9EEF8';
      tagColor = '#2E4A8A';
      rowStyle = styles.caseItem;
      break;
    case 'case_updated':
      dotColor = C.warning;
      tagLabel = 'Case Update';
      tagBg = C.warningSoft;
      tagColor = C.warning;
      rowStyle = styles.caseItem;
      break;
    case 'case_message':
      dotColor = '#2E4A8A';
      tagLabel = 'New Message';
      tagBg = '#E9EEF8';
      tagColor = '#2E4A8A';
      rowStyle = styles.caseItem;
      break;
    case 'case_completed':
      dotColor = C.success;
      tagLabel = 'Case Resolved';
      tagBg = C.successSoft;
      tagColor = C.success;
      rowStyle = styles.caseItem;
      break;
  }

  const tappable = hasPersonalNavTarget(item);

  return (
    <Pressable
      style={({ pressed }) => [styles.item, rowStyle, pressed && { opacity: 0.85 }]}
      onPress={tappable ? () => navigateForNotif(item) : undefined}
    >
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
          {tappable && (
            <FontAwesome6 name="chevron-right" size={10} color={C.textMuted} />
          )}
        </View>
      </View>
      {item.createdAt ? (
        <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
      ) : null}
    </Pressable>
  );
}

function AdminNotifItem({ item }: { item: AdminNotification }) {
  const tappable = ['service', 'application', 'registration', 'test_submission', 'assignment_submission'].includes(item.type);

  function handlePress() {
    if (item.type === 'application') {
      router.push({ pathname: '/admin', params: { openAdmissions: '1' } } as any);
    } else if (item.type === 'registration') {
      router.push({ pathname: '/admin', params: { openRegistrations: '1' } } as any);
    } else if (item.type === 'service') {
      router.push({ pathname: '/admin', params: { openCaseId: item.referenceId } } as any);
    } else if (item.type === 'test_submission') {
      router.push({ pathname: '/admin', params: { openTests: '1' } } as any);
    } else if (item.type === 'assignment_submission') {
      router.push({ pathname: '/admin', params: { openAssignments: '1' } } as any);
    }
  }

  let tagLabel = 'Admin';
  let tagBg = '#E9EEF8';
  let tagColor = '#2E4A8A';
  if (item.type === 'test_submission') { tagLabel = 'Test'; tagBg = '#F8F2E2'; tagColor = '#A9822A'; }
  if (item.type === 'assignment_submission') { tagLabel = 'Assignment'; tagBg = '#EAF0F8'; tagColor = '#2E4A8A'; }

  return (
    <Pressable
      style={({ pressed }) => [styles.item, styles.courseItem, pressed && { opacity: 0.85 }]}
      onPress={tappable ? handlePress : undefined}
    >
      <View style={styles.itemTop}>
        <View style={styles.itemLeft}>
          <View style={[styles.dot, { backgroundColor: C.secondary }]} />
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
          {tappable && (
            <FontAwesome6 name="chevron-right" size={10} color={C.textMuted} />
          )}
        </View>
      </View>
      {item.createdAt ? (
        <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
      ) : null}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { profile, uid } = useUserProfile();
  const isAdmin = profile?.role === 'admin';
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [displayPersonalNotifs, setDisplayPersonalNotifs] = useState<StudentNotification[]>([]);
  const [displayAdminNotifs, setDisplayAdminNotifs] = useState<AdminNotification[]>([]);
  const [lastSeenMs, setLastSeenMs] = useState<number | null>(null);
  // Track which IDs we've already added to the display list so each item is only
  // added once, even if the subscription fires multiple times (cache + server).
  const displayedPersonalRef = React.useRef<Set<string>>(new Set());
  const displayedAdminRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(LAST_SEEN_KEY).then((val) => {
      setLastSeenMs(val ? Number(val) : null);
      AsyncStorage.setItem(LAST_SEEN_KEY, Date.now().toString());
    });
    return subscribeAnnouncements(setAnnouncements);
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    // Reset accumulators for this session
    displayedPersonalRef.current = new Set();
    displayedAdminRef.current = new Set();
    setDisplayPersonalNotifs([]);
    setDisplayAdminNotifs([]);

    function handlePersonalNotifs(notifs: StudentNotification[]) {
      if (!active) return;
      // Only add items that are unread AND haven't been shown yet.
      // This correctly handles Firestore firing cache (stale read items) first,
      // then server (new unread items) — both batches are processed correctly.
      const newUnread = notifs.filter(
        (n) => !n.read && !displayedPersonalRef.current.has(n.id)
      );
      if (newUnread.length > 0) {
        newUnread.forEach((n) => displayedPersonalRef.current.add(n.id));
        setDisplayPersonalNotifs((prev) => [...newUnread, ...prev]);
        markStudentNotificationsRead(newUnread.map((n) => n.id)).catch(() => {});
      }
    }

    function handleAdminNotifs(notifs: AdminNotification[]) {
      if (!active) return;
      // subscribeAdminNotifications already filters to unread-only.
      // Accumulate new unread items into display; mark them read.
      const newItems = notifs.filter((n) => !displayedAdminRef.current.has(n.id));
      if (newItems.length > 0) {
        newItems.forEach((n) => displayedAdminRef.current.add(n.id));
        setDisplayAdminNotifs((prev) => [...newItems, ...prev]);
        markAdminNotificationsRead(newItems.map((n) => n.id)).catch(() => {});
      }
    }

    if (!uid) return;

    unsubscribe = isAdmin
      ? subscribeAdminNotifications(handleAdminNotifs)
      : subscribeStudentNotifications(uid, handlePersonalNotifs);

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [uid, isAdmin]);

  function isNew(ann: Announcement): boolean {
    if (lastSeenMs === null) return false;
    if (!ann.createdAt) return false;
    const d =
      typeof ann.createdAt === 'object' && 'toDate' in ann.createdAt
        ? (ann.createdAt as any).toDate().getTime()
        : new Date(ann.createdAt).getTime();
    return !isNaN(d) && d > lastSeenMs;
  }

  const applicationNotifs = displayPersonalNotifs.filter(
    (n) => n.type === 'application_approved' || n.type === 'application_rejected'
  );
  const gradeNotifs = displayPersonalNotifs.filter(
    (n) => n.type === 'assignment_graded' || n.type === 'test_graded'
  );
  const courseUpdateNotifs = displayPersonalNotifs.filter(
    (n) => n.type === 'material_posted' || n.type === 'assignment_posted' || n.type === 'test_posted'
  );
  const caseNotifs = displayPersonalNotifs.filter(
    (n) => n.type === 'case_assigned' || n.type === 'case_updated' || n.type === 'case_completed' || n.type === 'case_message'
  );

  const hasContent = announcements.length > 0 || displayPersonalNotifs.length > 0 || displayAdminNotifs.length > 0;

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
          <Text style={styles.subtitle}>Application updates, course content, grades, and announcements from GIAC.</Text>
        </View>

        {!hasContent ? (
          <View style={styles.emptyCard}>
            <FontAwesome6 name="bell-slash" size={22} color={C.textMuted} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyBody}>Check back later for updates from GIAC.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {isAdmin && displayAdminNotifs.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Admin Alerts</Text>
                {displayAdminNotifs.map((n) => (
                  <AdminNotifItem key={n.id} item={n} />
                ))}
              </>
            )}
            {applicationNotifs.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Application Updates</Text>
                {applicationNotifs.map((n) => (
                  <PersonalNotifItem key={n.id} item={n} />
                ))}
              </>
            )}
            {courseUpdateNotifs.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Course Updates</Text>
                {courseUpdateNotifs.map((n) => (
                  <PersonalNotifItem key={n.id} item={n} />
                ))}
              </>
            )}
            {caseNotifs.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Case Updates</Text>
                {caseNotifs.map((n) => (
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
  courseItem: {
    borderColor: '#C8D8EE',
    backgroundColor: '#F0F5FB',
  },
  caseItem: {
    borderColor: '#C0D0E8',
    backgroundColor: '#EEF4FA',
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
