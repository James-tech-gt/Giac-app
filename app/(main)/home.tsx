import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fonts } from '@/constants/theme';
import { getDisplayRole, getEffectiveRole } from '@/services/access';
import { useUserProfile } from '@/context/user-profile';
import { auth } from '@/services/firebase';
import {
  Announcement,
  Application,
  CourseRegistration,
  Service,
  getAllPendingApplications,
  subscribeAnnouncements,
  subscribeUserApplications,
  subscribeUserRegistration,
  subscribeUserServices,
  acceptAdmissionLetter,
  declineAdmissionLetter,
} from '@/services/firestore';
import NotificationBell from '@/components/notification-bell';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HERO_IMAGES = [
  require('@/assets/images/group.jpg'),
  require('@/assets/images/event 1.jpg'),
  require('@/assets/images/event 2.jpg'),
  require('@/assets/images/event 3.jpg'),
  require('@/assets/images/event 4.jpg'),
  require('@/assets/images/event 6.jpg'),
  require('@/assets/images/event 7.jpg'),
  require('@/assets/images/event 8.jpg'),
  require('@/assets/images/event 9.jpg'),
  require('@/assets/images/event 10.jpg'),
  require('@/assets/images/event 11.jpg'),
  require('@/assets/images/event 12.jpg'),
  require('@/assets/images/event 13.jpg'),
  require('@/assets/images/event 14.jpg'),
  require('@/assets/images/event 15.jpg'),
];

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
  if (status === 'completed') return { label: 'Completed', color: C.success, bg: C.successSoft, border: '#C9D8BE' };
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
  disabled,
}: {
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  label: string;
  accent: string;
  accentSoft: string;
  onPress: () => void;
  badge?: number;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [styles.tile, disabled && styles.tileDisabled, !disabled && pressed && styles.pressed]}
    >
      <View style={[styles.tileIconWrap, { backgroundColor: accentSoft, opacity: disabled ? 0.4 : 1 }]}>
        <FontAwesome6 name={icon} size={22} color={accent} />
        {badge != null && badge > 0 && (
          <View style={styles.tileBadge}>
            <Text style={styles.tileBadgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tileLabel, disabled && styles.tileLabelDisabled]} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const user = auth.currentUser;
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const horizontalPadding = width < 380 ? 16 : 20;
  const heroWidth = width - horizontalPadding * 2;

  const heroScrollRef = useRef<ScrollView>(null);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setHeroIndex(i => {
        const next = (i + 1) % HERO_IMAGES.length;
        heroScrollRef.current?.scrollTo({ x: next * heroWidth, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [heroWidth]);

  const { profile } = useUserProfile();
  const [applications, setApplications] = useState<Application[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pendingApps, setPendingApps] = useState<Application[]>([]);
  const [expandedAnnId, setExpandedAnnId] = useState<string | null>(null);
  const [registration, setRegistration] = useState<CourseRegistration | null | undefined>(undefined);
  const [acceptingLetter, setAcceptingLetter] = useState(false);
  const [rejectingLetter, setRejectingLetter] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (!user?.uid) { setApplications([]); return; }
    AsyncStorage.getItem(`@giac:apps:${user.uid}`)
      .then(raw => { if (raw) setApplications(JSON.parse(raw)); })
      .catch(() => {});
    return subscribeUserApplications(user.uid, (apps) => {
      setApplications(apps);
      AsyncStorage.setItem(`@giac:apps:${user.uid}`, JSON.stringify(apps)).catch(() => {});
    });
  }, [user?.uid]);

  useEffect(() => {
    return subscribeAnnouncements(setAnnouncements);
  }, []);

  useEffect(() => {
    if (!user?.uid) { setServices([]); return; }
    AsyncStorage.getItem(`@giac:svcs:${user.uid}`)
      .then(raw => { if (raw) setServices(JSON.parse(raw)); })
      .catch(() => {});
    let active = true;
    const unsub = subscribeUserServices(user.uid, (d) => {
      if (!active) return;
      const svcs = d ?? [];
      setServices(svcs);
      AsyncStorage.setItem(`@giac:svcs:${user.uid}`, JSON.stringify(svcs)).catch(() => {});
    });
    return () => { active = false; unsub(); };
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

  const latestApplication = useMemo(() => {
    if (!applications.length) return undefined;
    const rank = (s: string) => s === 'completed' ? 4 : s === 'approved' ? 3 : s === 'pending' ? 2 : 1;
    return [...applications].sort((a, b) => rank(b.status) - rank(a.status))[0];
  }, [applications]);
  const isAdmin = effectiveRole === 'admin';
  const isStudent = effectiveRole === 'student';

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    return getAllPendingApplications(setPendingApps);
  }, [profile?.role]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeUserRegistration(user.uid, setRegistration);
  }, [user?.uid]);

  const handleAcceptLetter = async () => {
    if (!registration) return;
    setAcceptingLetter(true);
    try {
      await acceptAdmissionLetter(registration.id);
      setShowSuccessModal(true);
    } finally {
      setAcceptingLetter(false);
    }
  };

  const handleDeclineLetter = () => {
    if (!registration) return;
    Alert.alert(
      'Decline Admission',
      'Are you sure you want to decline your admission offer? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setRejectingLetter(true);
            try {
              await declineAdmissionLetter(registration.id);
            } finally {
              setRejectingLetter(false);
            }
          },
        },
      ]
    );
  };

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

  const registrationAccepted = registration?.status === 'accepted';

  const pendingApplicationTile = latestApplication && latestApplication.status !== 'approved'
    ? {
        icon: 'clock' as const,
        label: 'Track Application',
        accent: latestApplication.status === 'rejected' ? C.danger : C.warning,
        accentSoft: latestApplication.status === 'rejected' ? C.dangerSoft : C.warningSoft,
        onPress: () => router.push('/(main)/application-status'),
        disabled: false,
      }
    : {
        icon: 'file-signature' as const,
        label: 'Apply for Training',
        accent: C.warning,
        accentSoft: C.accentSoft,
        onPress: () => router.push('/(main)/application'),
        disabled: !registrationAccepted,
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

        {/* Hero Carousel */}
        <View style={styles.hero}>
          <ScrollView
            ref={heroScrollRef}
            horizontal
            pagingEnabled
            scrollEnabled
            showsHorizontalScrollIndicator={false}
            style={{ width: heroWidth }}
            onMomentumScrollEnd={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / heroWidth);
              setHeroIndex(idx);
            }}
          >
            {HERO_IMAGES.map((img, i) => (
              <ImageBackground
                key={i}
                source={img}
                style={[styles.heroSlide, { width: heroWidth }]}
                imageStyle={styles.heroImg}
              >
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
            ))}
          </ScrollView>
          <View style={styles.heroDots}>
            {HERO_IMAGES.map((_, i) => (
              <View key={i} style={[styles.heroDot, i === heroIndex && styles.heroDotActive]} />
            ))}
          </View>
        </View>


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
                      : latestApplication.status === 'completed'
                        ? 'Congratulations! You have successfully completed this course.'
                        : latestApplication.status === 'approved'
                          ? 'Your application has been accepted. Open your student workspace to continue.'
                          : 'Your application was reviewed but not approved. Review and reapply when ready.'}
                  </Text>
                </View>
              )}

              <View style={styles.appDeskBtnRow}>
                {latestApplication.status === 'completed' && (
                  <Pressable
                    onPress={() => router.push('/(student)/certificates' as any)}
                    style={({ pressed }) => [styles.appDeskPrimaryBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.appDeskPrimaryBtnText}>View Certificate</Text>
                    <FontAwesome6 name="certificate" size={12} color="#fff" />
                  </Pressable>
                )}
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

        {/* Registration card — shown only for users with no applications and no registration */}
        {!isAdmin && registration === null && applications.length === 0 && (
          <Pressable
            onPress={() => router.push('/(main)/course-registration')}
            style={({ pressed }) => [styles.regCard, pressed && styles.pressed]}
          >
            <View style={styles.regCardIcon}>
              <FontAwesome6 name="graduation-cap" size={20} color={C.secondary} />
            </View>
            <View style={styles.regCardBody}>
              <Text style={styles.regCardTitle}>Register Your Course</Text>
              <Text style={styles.regCardSubtitle}>
                Register your course to access GIAC programmes and begin your learning journey.
              </Text>
            </View>
            <FontAwesome6 name="angle-right" size={14} color={C.secondary} />
          </Pressable>
        )}

        {/* Pending registration */}
        {!isAdmin && registration?.status === 'pending' && (
          <View style={styles.regPendingCard}>
            <View style={styles.regPendingDot} />
            <View style={styles.regCardBody}>
              <Text style={styles.regPendingTitle}>Registration Under Review</Text>
              <Text style={styles.regPendingSubtitle}>
                GIAC is reviewing your registration. You will receive an admission letter soon.
              </Text>
            </View>
          </View>
        )}

        {/* Admission letter — waiting for acceptance */}
        {!isAdmin && registration?.status === 'letter_sent' && (
          <View style={styles.letterCard}>
            <View style={styles.letterCardTop}>
              <FontAwesome6 name="envelope-open-text" size={18} color={C.success} />
              <View style={styles.regCardBody}>
                <Text style={styles.letterCardTitle}>Your Admission Letter is Ready</Text>
                <Text style={styles.letterCardSubtitle}>
                  Student No: <Text style={styles.letterStudentNo}>{registration.studentNumber}</Text>
                </Text>
              </View>
            </View>
            {registration.letterUrl ? (
              <Pressable
                onPress={() => Linking.openURL(registration.letterUrl!)}
                style={({ pressed }) => [styles.letterDownloadBtn, pressed && styles.pressed]}
              >
                <FontAwesome6 name="file-arrow-down" size={14} color={C.success} />
                <Text style={styles.letterDownloadText}>Download Admission Letter</Text>
              </Pressable>
            ) : null}
            <View style={styles.letterBtnRow}>
              <Pressable
                onPress={handleDeclineLetter}
                disabled={rejectingLetter || acceptingLetter}
                style={({ pressed }) => [styles.letterDeclineBtn, (pressed || rejectingLetter) && styles.pressed]}
              >
                {rejectingLetter
                  ? <ActivityIndicator size="small" color={C.danger} />
                  : <Text style={styles.letterDeclineBtnText}>Decline</Text>
                }
              </Pressable>
              <Pressable
                onPress={handleAcceptLetter}
                disabled={acceptingLetter || rejectingLetter}
                style={({ pressed }) => [styles.letterAcceptBtn, (pressed || acceptingLetter) && styles.pressed]}
              >
                {acceptingLetter
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.letterAcceptBtnText}>Accept Admission →</Text>
                }
              </Pressable>
            </View>
          </View>
        )}

        {/* Rejected by admin */}
        {!isAdmin && registration?.status === 'rejected' && (
          <View style={[styles.regPendingCard, styles.regRejectedCard]}>
            <FontAwesome6 name="circle-xmark" size={16} color={C.danger} />
            <View style={styles.regCardBody}>
              <Text style={[styles.regPendingTitle, { color: C.danger }]}>Registration Not Approved</Text>
              <Text style={styles.regPendingSubtitle}>
                Contact GIAC support for more information.
              </Text>
            </View>
          </View>
        )}

        {/* Declined by student */}
        {!isAdmin && registration?.status === 'declined' && (
          <View style={[styles.regPendingCard, styles.regRejectedCard]}>
            <FontAwesome6 name="circle-xmark" size={16} color={C.danger} />
            <View style={styles.regCardBody}>
              <Text style={[styles.regPendingTitle, { color: C.danger }]}>Admission Declined</Text>
              <Text style={styles.regPendingSubtitle}>
                You declined your admission offer. Contact GIAC if you changed your mind.
              </Text>
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

      {/* Registration success modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <FontAwesome6 name="circle-check" size={40} color={C.success} />
            </View>
            <Text style={styles.modalTitle}>Registration Complete!</Text>
            <Text style={styles.modalBody}>
              Welcome to GIAC. Your student number has been confirmed. You can now apply for your training programme.
            </Text>
            <Pressable
              onPress={() => setShowSuccessModal(false)}
              style={({ pressed }) => [styles.modalBtn, pressed && styles.pressed]}
            >
              <Text style={styles.modalBtnText}>Go to Dashboard →</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    overflow: 'hidden',
    backgroundColor: C.primary,
  },
  heroSlide: {
    height: 230,
  },
  heroImg: {
    borderRadius: 24,
    resizeMode: 'cover',
  },
  heroOverlay: {
    height: 230,
    padding: 20,
    justifyContent: 'flex-end',
    gap: 6,
    backgroundColor: 'rgba(12, 22, 42, 0.55)',
  },
  heroDots: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    flexDirection: 'row',
    gap: 5,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  heroDotActive: {
    width: 18,
    backgroundColor: '#FFFFFF',
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
  tileDisabled: { opacity: 0.45 },
  tileLabelDisabled: { color: C.textMuted },

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

  regCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 18,
    borderWidth: 1, borderColor: C.border, padding: 16,
  },
  regCardIcon: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: '#EEF2F9', alignItems: 'center', justifyContent: 'center',
  },
  regCardBody: { flex: 1, gap: 3 },
  regCardTitle: { fontSize: 14, fontFamily: Fonts.sansBold, color: C.textPrimary },
  regCardSubtitle: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.sans, color: C.textMuted },

  regPendingCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: C.warningSoft, borderRadius: 18,
    borderWidth: 1, borderColor: '#E7D7A8', padding: 16,
  },
  regRejectedCard: {
    backgroundColor: C.dangerSoft, borderColor: '#E7C8C0',
  },
  regPendingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.warning, marginTop: 4 },
  regPendingTitle: { fontSize: 14, fontFamily: Fonts.sansBold, color: C.warning },
  regPendingSubtitle: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.sans, color: C.textSecondary },

  letterCard: {
    backgroundColor: C.successSoft, borderRadius: 18,
    borderWidth: 1, borderColor: '#C9D8BE', padding: 16, gap: 12,
  },
  letterCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  letterCardTitle: { fontSize: 14, fontFamily: Fonts.sansBold, color: C.success },
  letterCardSubtitle: { fontSize: 12, fontFamily: Fonts.sans, color: C.textSecondary },
  letterStudentNo: { fontFamily: Fonts.sansBold, color: C.success },
  letterDownloadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#C9D8BE',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  letterDownloadText: { fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.success },
  letterBtnRow: { flexDirection: 'row', gap: 10 },
  letterDeclineBtn: {
    flex: 1, borderRadius: 12, borderWidth: 1, borderColor: C.danger,
    paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.dangerSoft,
  },
  letterDeclineBtnText: { fontSize: 14, fontFamily: Fonts.sansBold, color: C.danger },
  letterAcceptBtn: {
    flex: 2, backgroundColor: C.success, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
  },
  letterAcceptBtnText: { fontSize: 14, fontFamily: Fonts.sansBold, color: '#FFFFFF' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24,
    padding: 28, width: '100%', alignItems: 'center', gap: 14,
  },
  modalIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#E8F2EE', alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { fontSize: 22, fontFamily: Fonts.displayBold, color: C.textPrimary, textAlign: 'center' },
  modalBody: {
    fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans,
    color: C.textSecondary, textAlign: 'center',
  },
  modalBtn: {
    backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 28, alignSelf: 'stretch', alignItems: 'center',
  },
  modalBtnText: { fontSize: 15, fontFamily: Fonts.sansBold, color: '#FFFFFF' },
});
