import { Fonts } from '@/constants/theme';
import { getUserProfile, UserProfile } from '@/services/auth';
import { getDisplayRole, getEffectiveRole } from '@/services/access';
import { auth } from '@/services/firebase';
import {
  Announcement,
  Application,
  Service,
  getAllPendingApplications,
  subscribeAnnouncements,
  subscribeUserApplications,
  subscribeUserServices,
} from '@/services/firestore';
import NotificationBell from '@/components/notification-bell';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HERO_IMAGE = require('@/assets/images/group.jpg');

const C = {
  bg: '#F8FAFD',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F5FA',
  primary: '#14213A',
  primarySoft: '#E8ECF4',
  secondary: '#2A3F66',
  accent: '#B68A2E',
  accentSoft: '#F4ECD2',
  warning: '#8C6A1F',
  warningSoft: '#F4ECD2',
  success: '#3F5A3A',
  successSoft: '#E2EAD9',
  danger: '#7A2E2E',
  dangerSoft: '#F9EFEC',
  textPrimary: '#14213A',
  textSecondary: '#4A5468',
  textMuted: '#6B7689',
  border: '#E3E9F2',
  borderLight: '#EEF2F7',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(timestamp: unknown) {
  if (!timestamp) return '';
  const date =
    typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date(timestamp as string | number | Date);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

function getApplicationStatusTone(status: Application['status']) {
  if (status === 'approved') return { label: 'Approved', color: C.success, bg: C.successSoft, border: '#C9D8BE' };
  if (status === 'rejected') return { label: 'Rejected', color: C.danger, bg: C.dangerSoft, border: '#E7C8C0' };
  return { label: 'Pending review', color: C.warning, bg: C.warningSoft, border: '#E7D7A8' };
}

function StatusChip({ tone }: { tone: ReturnType<typeof getApplicationStatusTone> }) {
  return (
    <View style={[styles.statusChip, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <View style={[styles.statusChipDot, { backgroundColor: tone.color }]} />
      <Text style={[styles.statusChipText, { color: tone.color }]}>{tone.label}</Text>
    </View>
  );
}

function QuickTile({
  icon,
  label,
  accent,
  accentSoft,
  onPress,
  badge,
}: {
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  label: string;
  accent: string;
  accentSoft: string;
  onPress: () => void;
  badge?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={[styles.tileIconWrap, { backgroundColor: accentSoft }]}>
        <FontAwesome6 name={icon} size={22} color={accent} />
        {badge != null && badge > 0 && (
          <View style={styles.tileBadge}>
            <Text style={styles.tileBadgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.tileLabel} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const user = auth.currentUser;
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const horizontalPadding = width < 380 ? 16 : 20;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingApps, setPendingApps] = useState<Application[]>([]);
  const [expandedAnnId, setExpandedAnnId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) { setApplications([]); return; }
    return subscribeUserApplications(user.uid, setApplications);
  }, [user?.uid]);

  useEffect(() => {
    return subscribeAnnouncements(setAnnouncements);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user?.uid) { if (active) setLoading(false); return; }
      try {
        const profileData = await getUserProfile(user.uid);
        if (active) setProfile(profileData);
      } catch {} finally {
        if (active) setLoading(false);
      }
    };
    load();
    const unsub = user?.uid
      ? subscribeUserServices(user.uid, (d) => { if (active) setServices(d ?? []); })
      : null;
    return () => { active = false; unsub?.(); };
  }, [user?.uid]);

  const displayName = useMemo(() => {
    if (profile?.fullName?.trim()) return profile.fullName.trim();
    if (user?.displayName?.trim()) return user.displayName.trim();
    if (user?.email?.trim()) return user.email.trim();
    return 'Guest';
  }, [profile?.fullName, user?.displayName, user?.email]);

  const displayRole = useMemo(
    () => getDisplayRole({ applications, profileRole: profile?.role, services }),
    [applications, profile?.role, services]
  );
  const effectiveRole = useMemo(
    () => getEffectiveRole({ applications, profileRole: profile?.role, services }),
    [applications, profile?.role, services]
  );

  const latestApplication = applications[0];
  const isAdmin = effectiveRole === 'admin';
  const isStudent = effectiveRole === 'student';

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    return getAllPendingApplications(setPendingApps);
  }, [profile?.role]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={C.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  const adminTiles = [
    {
      icon: 'inbox' as const,
      label: 'Admissions Queue',
      accent: pendingApps.length > 0 ? C.warning : C.success,
      accentSoft: pendingApps.length > 0 ? C.warningSoft : C.successSoft,
      badge: pendingApps.length,
      onPress: () => router.push('/(main)/operations'),
    },
    {
      icon: 'bullhorn' as const,
      label: 'Announcements',
      accent: C.secondary,
      accentSoft: C.primarySoft,
      onPress: () => router.push('/(main)/operations'),
    },
    {
      icon: 'shield-halved' as const,
      label: 'Operations Workspace',
      accent: C.primary,
      accentSoft: C.surfaceAlt,
      onPress: () => router.push('/(main)/operations'),
    },
    {
      icon: 'circle-user' as const,
      label: 'My Profile',
      accent: C.accent,
      accentSoft: C.accentSoft,
      onPress: () => router.push('/(main)/profile'),
    },
  ];

  const studentTiles = [
    {
      icon: 'graduation-cap' as const,
      label: 'My Courses',
      accent: C.success,
      accentSoft: C.successSoft,
      onPress: () => router.push('/(student)/dashboard'),
    },
    {
      icon: 'clipboard-list' as const,
      label: 'Tests & Exams',
      accent: C.secondary,
      accentSoft: C.primarySoft,
      onPress: () => router.push('/(student)/tests' as any),
    },
    {
      icon: 'book-open' as const,
      label: 'Explore Courses',
      accent: C.accent,
      accentSoft: C.accentSoft,
      onPress: () => router.push('/(main)/explore'),
    },
    {
      icon: 'scale-balanced' as const,
      label: 'Request Mediation',
      accent: C.primary,
      accentSoft: C.surfaceAlt,
      onPress: () => router.push('/(main)/request-mediation'),
    },
  ];

  const pendingApplicationTile = latestApplication && latestApplication.status !== 'approved'
    ? {
        icon: 'clock' as const,
        label: 'Track Application',
        accent: latestApplication.status === 'rejected' ? C.danger : C.warning,
        accentSoft: latestApplication.status === 'rejected' ? C.dangerSoft : C.warningSoft,
        onPress: () => router.push('/(main)/application-status'),
      }
    : {
        icon: 'file-signature' as const,
        label: 'Apply for Training',
        accent: C.warning,
        accentSoft: C.accentSoft,
        onPress: () => router.push('/(main)/application'),
      };

  const defaultTiles = [
    pendingApplicationTile,
    {
      icon: 'book-open' as const,
      label: 'Explore Courses',
      accent: C.secondary,
      accentSoft: C.primarySoft,
      onPress: () => router.push('/(main)/explore'),
    },
    {
      icon: 'scale-balanced' as const,
      label: 'Request Mediation',
      accent: C.success,
      accentSoft: C.successSoft,
      onPress: () => router.push('/(main)/request-mediation'),
    },
    {
      icon: 'bell' as const,
      label: 'Notifications',
      accent: C.accent,
      accentSoft: C.accentSoft,
      onPress: () => router.push('/(main)/notifications'),
    },
  ];

  const tiles = isAdmin ? adminTiles : isStudent ? studentTiles : defaultTiles;


  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: horizontalPadding, paddingBottom: isCompact ? 120 : 132 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.brandmark}>GIAC</Text>
          <NotificationBell />
        </View>

        {/* Hero */}
        <ImageBackground source={HERO_IMAGE} style={styles.hero} imageStyle={styles.heroImg}>
          <View style={styles.heroOverlay}>
            <Text style={styles.heroGreeting}>{getGreeting()}</Text>
            <Text style={[styles.heroName, isCompact && styles.heroNameCompact]}>
              {displayName}
            </Text>
            <View style={styles.heroPillRow}>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>{displayRole}</Text>
              </View>
            </View>
          </View>
        </ImageBackground>


        {/* Admin pending-apps banner */}
        {isAdmin && pendingApps.length > 0 && (
          <Pressable
            onPress={() => router.push('/(main)/operations')}
            style={({ pressed }) => [styles.adminBanner, pressed && styles.pressed]}
          >
            <View style={styles.adminBannerDot} />
            <Text style={styles.adminBannerText}>
              {pendingApps.length} application{pendingApps.length !== 1 ? 's' : ''} waiting for review
            </Text>
            <FontAwesome6 name="angle-right" size={13} color={C.warning} />
          </Pressable>
        )}

        {/* Application Desk (non-admin with an application) */}
        {!isAdmin && latestApplication && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Application Status</Text>
            <View style={styles.appDeskCard}>
              <View style={styles.appDeskTopRow}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.appDeskTitle} numberOfLines={2}>
                    {latestApplication.courseTitle || 'GIAC Training Application'}
                  </Text>
                  {(latestApplication.courseProgram || latestApplication.courseDuration) ? (
                    <Text style={styles.appDeskMeta}>
                      {[latestApplication.courseProgram, latestApplication.courseDuration]
                        .filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <StatusChip tone={getApplicationStatusTone(latestApplication.status)} />
              </View>

              {(latestApplication.feedback?.trim() || latestApplication.status !== 'pending') && (
                <View style={styles.appDeskNote}>
                  <Text style={styles.appDeskNoteText}>
                    {latestApplication.feedback?.trim()
                      ? latestApplication.feedback.trim()
                      : latestApplication.status === 'approved'
                        ? 'Your application has been accepted. Open your student workspace to continue.'
                        : 'Your application was reviewed but not approved. Review and reapply when ready.'}
                  </Text>
                </View>
              )}

              <View style={styles.appDeskBtnRow}>
                {latestApplication.status === 'approved' && (
                  <Pressable
                    onPress={() => router.push('/(student)/dashboard')}
                    style={({ pressed }) => [styles.appDeskPrimaryBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.appDeskPrimaryBtnText}>Continue Learning</Text>
                    <FontAwesome6 name="arrow-right" size={12} color="#fff" />
                  </Pressable>
                )}
                {latestApplication.status === 'rejected' && (
                  <Pressable
                    onPress={() => router.push('/(main)/application')}
                    style={({ pressed }) => [styles.appDeskPrimaryBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.appDeskPrimaryBtnText}>Reapply</Text>
                    <FontAwesome6 name="arrow-right" size={12} color="#fff" />
                  </Pressable>
                )}
                <Pressable
                  onPress={() => router.push('/(main)/application-status')}
                  style={({ pressed }) => [styles.appDeskSecondaryBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.appDeskSecondaryBtnText}>View Details</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions / Operations tile grid */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{isAdmin ? 'Operations' : 'Quick Actions'}</Text>
          <View style={styles.tileRow}>
            <QuickTile {...tiles[0]} />
            <QuickTile {...tiles[1]} />
          </View>
          <View style={styles.tileRow}>
            <QuickTile {...tiles[2]} />
            <QuickTile {...tiles[3]} />
          </View>
        </View>

        {/* Announcements */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Announcements</Text>
          {announcements.length > 0 ? (
            <View style={styles.announcementsCard}>
              {announcements.map((item, i) => {
                const expanded = expandedAnnId === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <Pressable
                      onPress={() => setExpandedAnnId(expanded ? null : item.id)}
                      style={({ pressed }) => [styles.annRow, pressed && styles.pressed]}
                    >
                      <View style={[styles.annDot, item.urgent && styles.annDotUrgent]} />
                      <View style={styles.annBody}>
                        <Text style={styles.annTitle} numberOfLines={expanded ? undefined : 1}>
                          {item.title}
                        </Text>
                        {expanded && item.detail ? (
                          <Text style={styles.annDetail}>{item.detail}</Text>
                        ) : null}
                        <Text style={styles.annTime}>{formatDate(item.createdAt)}</Text>
                      </View>
                      <FontAwesome6
                        name={expanded ? 'angle-up' : 'angle-down'}
                        size={12}
                        color={C.textMuted}
                      />
                    </Pressable>
                    {i < announcements.length - 1 && <View style={styles.annDivider} />}
                  </React.Fragment>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <FontAwesome6 name="bullhorn" size={22} color={C.border} />
              <Text style={styles.emptyText}>No announcements yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { paddingTop: 12, gap: 16 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.88 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  brandmark: {
    fontSize: 14,
    fontFamily: Fonts.displayBold,
    color: C.primary,
    letterSpacing: 2.5,
  },

  hero: {
    borderRadius: 24,
    minHeight: 200,
    backgroundColor: C.primary,
    overflow: 'hidden',
  },
  heroImg: {
    borderRadius: 24,
  },
  heroOverlay: {
    minHeight: 200,
    padding: 20,
    justifyContent: 'flex-end',
    gap: 6,
    borderRadius: 24,
    backgroundColor: 'rgba(12, 22, 42, 0.62)',
  },
  heroGreeting: {
    fontSize: 12,
    fontFamily: Fonts.sansSemiBold,
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  heroName: {
    fontSize: 30,
    lineHeight: 34,
    fontFamily: Fonts.displayBold,
    color: '#FFFFFF',
  },
  heroNameCompact: { fontSize: 26, lineHeight: 30 },
  heroPillRow: { flexDirection: 'row', marginTop: 4 },
  heroPill: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  heroPillText: {
    fontSize: 12,
    fontFamily: Fonts.sansSemiBold,
    color: '#FFFFFF',
  },

  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.warningSoft,
    borderWidth: 1,
    borderColor: '#E7D7A8',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  adminBannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.warning,
  },
  adminBannerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    color: C.warning,
  },

  section: { gap: 8 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingLeft: 2,
  },

  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusChipDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusChipText: { fontSize: 12, fontFamily: Fonts.sansBold },

  appDeskCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  appDeskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  appDeskTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  appDeskMeta: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  appDeskNote: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 10,
    padding: 10,
  },
  appDeskNoteText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  appDeskBtnRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  appDeskPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  appDeskPrimaryBtnText: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
    color: '#FFFFFF',
  },
  appDeskSecondaryBtn: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  appDeskSecondaryBtnText: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
    color: C.secondary,
  },

  tileRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tile: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  tileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: C.danger,
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tileBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.sansBold,
    color: '#FFFFFF',
  },
  tileLabel: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },

  announcementsCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  annRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  annDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.border,
    flexShrink: 0,
  },
  annDotUrgent: { backgroundColor: C.danger },
  annBody: { flex: 1, gap: 2 },
  annTitle: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  annDetail: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
    marginTop: 4,
  },
  annTime: { fontSize: 11, fontFamily: Fonts.sans, color: C.textMuted },
  annDivider: { height: 1, backgroundColor: C.borderLight, marginLeft: 31 },

  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
});
