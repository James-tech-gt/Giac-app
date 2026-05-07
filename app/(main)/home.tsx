import { Fonts } from '@/constants/theme';
import { getUserProfile, UserProfile } from '@/services/auth';
import { getDisplayRole, getEffectiveRole } from '@/services/access';
import { auth } from '@/services/firebase';
import {
  Announcement,
  Application,
  Service,
  approveApplication,
  createAnnouncement,
  getAllPendingApplications,
  rejectApplication,
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
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

type ActionCardProps = {
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  title: string;
  description: string;
  action: string;
  accent: string;
  accentSoft: string;
  onPress: () => void;
};

function getApplicationStatusTone(status: Application['status']) {
  if (status === 'approved') {
    return { label: 'Approved', color: C.success, bg: C.successSoft, border: '#C9D8BE' };
  }

  if (status === 'rejected') {
    return { label: 'Rejected', color: C.danger, bg: C.dangerSoft, border: '#E7C8C0' };
  }

  return { label: 'Pending review', color: C.warning, bg: C.warningSoft, border: '#E7D7A8' };
}

function ActionCard({
  icon,
  title,
  description,
  action,
  accent,
  accentSoft,
  onPress,
}: ActionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        { borderLeftColor: accent },
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={[styles.actionBadge, { backgroundColor: accentSoft }]}>
        <FontAwesome6 name={icon} size={16} color={accent} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
      <Text style={[styles.actionLink, { color: accent }]}>{action}</Text>
    </Pressable>
  );
}

function StatusChip({
  label,
  tone,
}: {
  label?: string;
  tone: ReturnType<typeof getApplicationStatusTone>;
}) {
  return (
    <View style={[styles.statusChip, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <View style={[styles.statusChipDot, { backgroundColor: tone.color }]} />
      <Text style={[styles.statusChipText, { color: tone.color }]}>{label ?? tone.label}</Text>
    </View>
  );
}

function ActionButton({
  kind,
  label,
  onPress,
}: {
  kind: 'primary' | 'secondary' | 'brass' | 'ghost' | 'danger';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        kind === 'primary' ? styles.actionButtonPrimary : null,
        kind === 'secondary' ? styles.actionButtonSecondary : null,
        kind === 'brass' ? styles.actionButtonBrass : null,
        kind === 'ghost' ? styles.actionButtonGhost : null,
        kind === 'danger' ? styles.actionButtonDanger : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          kind === 'primary' ? styles.actionButtonTextPrimary : null,
          kind === 'secondary' ? styles.actionButtonTextSecondary : null,
          kind === 'brass' ? styles.actionButtonTextBrass : null,
          kind === 'ghost' ? styles.actionButtonTextGhost : null,
          kind === 'danger' ? styles.actionButtonTextDanger : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function AdminAppCard({
  application,
  onApprove,
  onReject,
  busy,
}: {
  application: Application;
  onApprove: () => void;
  onReject: (feedback: string) => void;
  busy: boolean;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const confirmReject = () => { onReject(feedback); };
  const cancelReject = () => { if (busy) return; setRejecting(false); setFeedback(''); };

  function formatDate(ts: unknown) {
    if (!ts) return '—';
    const date =
      typeof ts === 'object' && ts !== null && 'toDate' in ts &&
      typeof (ts as { toDate: () => Date }).toDate === 'function'
        ? (ts as { toDate: () => Date }).toDate()
        : new Date(ts as string | number | Date);
    return isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
  }

  return (
    <View style={appCardStyles.card}>
      <View style={appCardStyles.topRow}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={appCardStyles.name}>{application.fullName?.trim() || 'Unknown applicant'}</Text>
          <Text style={appCardStyles.meta}>{application.email?.trim() || application.userId}</Text>
        </View>
        <View style={appCardStyles.pendingPill}>
          <View style={appCardStyles.pendingDot} />
          <Text style={appCardStyles.pendingText}>Pending</Text>
        </View>
      </View>

      <View style={appCardStyles.divider} />

      <View style={appCardStyles.detailRow}>
        <Text style={appCardStyles.detailLabel}>Course</Text>
        <Text style={appCardStyles.detailValue}>{application.courseTitle || '—'}</Text>
      </View>
      <View style={appCardStyles.detailRow}>
        <Text style={appCardStyles.detailLabel}>Program</Text>
        <Text style={appCardStyles.detailValue}>{application.courseProgram || '—'}</Text>
      </View>
      {application.phone?.trim() ? (
        <View style={appCardStyles.detailRow}>
          <Text style={appCardStyles.detailLabel}>Phone</Text>
          <Text style={appCardStyles.detailValue}>{application.phone.trim()}</Text>
        </View>
      ) : null}
      <View style={appCardStyles.detailRow}>
        <Text style={appCardStyles.detailLabel}>Submitted</Text>
        <Text style={appCardStyles.detailValue}>{formatDate(application.submittedAt)}</Text>
      </View>

      {application.feedback?.trim() ? (
        <View style={appCardStyles.noteBlock}>
          <Text style={appCardStyles.noteLabel}>Applicant&apos;s note</Text>
          <Text style={appCardStyles.noteBody}>{application.feedback.trim()}</Text>
        </View>
      ) : null}

      {rejecting ? (
        <View style={appCardStyles.rejectPanel}>
          <Text style={appCardStyles.rejectLabel}>Rejection feedback (optional)</Text>
          <TextInput
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Explain why the application is being rejected..."
            placeholderTextColor={C.textMuted}
            multiline
            editable={!busy}
            style={appCardStyles.rejectInput}
            textAlignVertical="top"
          />
          <View style={appCardStyles.rejectActions}>
            <Pressable
              onPress={cancelReject}
              disabled={busy}
              style={({ pressed }) => [appCardStyles.ghostBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={appCardStyles.ghostBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={confirmReject}
              disabled={busy}
              style={({ pressed }) => [appCardStyles.dangerBtn, (pressed || busy) && { opacity: 0.85 }]}
            >
              {busy
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={appCardStyles.dangerBtnText}>Confirm Reject</Text>
              }
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={appCardStyles.actions}>
          <Pressable
            onPress={onApprove}
            disabled={busy}
            style={({ pressed }) => [appCardStyles.approveBtn, (pressed || busy) && { opacity: 0.85 }]}
          >
            {busy
              ? <ActivityIndicator color="#fff" size="small" />
              : (
                <>
                  <FontAwesome6 name="check" size={12} color="#fff" />
                  <Text style={appCardStyles.approveBtnText}>Approve</Text>
                </>
              )
            }
          </Pressable>
          <Pressable
            onPress={() => setRejecting(true)}
            disabled={busy}
            style={({ pressed }) => [appCardStyles.rejectBtn, (pressed || busy) && { opacity: 0.85 }]}
          >
            <FontAwesome6 name="xmark" size={12} color={C.danger} />
            <Text style={appCardStyles.rejectBtnText}>Reject</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const appCardStyles = StyleSheet.create({
  card: {
    backgroundColor: C.surface, borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: C.border, gap: 10,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  name: { fontSize: 15, fontFamily: Fonts.sansBold, color: C.textPrimary, lineHeight: 21 },
  meta: { fontSize: 12, fontFamily: Fonts.sans, color: C.textMuted },
  pendingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.warningSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
  },
  pendingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.warning },
  pendingText: { fontSize: 11, fontFamily: Fonts.sansSemiBold, color: C.warning },
  divider: { height: 1, backgroundColor: C.border },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  detailLabel: { flex: 0.35, fontSize: 12, fontFamily: Fonts.sans, color: C.textMuted },
  detailValue: { flex: 0.65, fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.textPrimary, textAlign: 'right' },
  noteBlock: { backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 12, gap: 4 },
  noteLabel: { fontSize: 11, fontFamily: Fonts.sansSemiBold, color: C.secondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  noteBody: { fontSize: 13, lineHeight: 20, fontFamily: Fonts.sans, color: C.textSecondary },
  rejectPanel: {
    backgroundColor: C.dangerSoft, borderRadius: 16, padding: 14, gap: 10,
    borderWidth: 1, borderColor: C.danger,
  },
  rejectLabel: { fontSize: 12, fontFamily: Fonts.sansSemiBold, color: C.danger },
  rejectInput: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, fontFamily: Fonts.sans, color: C.textPrimary, minHeight: 80,
  },
  rejectActions: { flexDirection: 'row', gap: 10 },
  ghostBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  ghostBtnText: { fontSize: 13, fontFamily: Fonts.sansBold, color: C.secondary },
  dangerBtn: {
    flex: 2, flexDirection: 'row', gap: 6, backgroundColor: C.danger,
    borderRadius: 12, paddingVertical: 11, alignItems: 'center', justifyContent: 'center',
  },
  dangerBtnText: { fontSize: 13, fontFamily: Fonts.sansBold, color: '#FFFFFF' },
  actions: { flexDirection: 'row', gap: 10 },
  approveBtn: {
    flex: 1, flexDirection: 'row', gap: 6, backgroundColor: C.primary,
    borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
  },
  approveBtnText: { fontSize: 13, fontFamily: Fonts.sansBold, color: '#FFFFFF' },
  rejectBtn: {
    flex: 1, flexDirection: 'row', gap: 6, borderWidth: 1.5, borderColor: C.danger,
    borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.surface,
  },
  rejectBtnText: { fontSize: 13, fontFamily: Fonts.sansBold, color: C.danger },
});

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function formatRelativeTime(timestamp: unknown) {
  if (!timestamp) return 'Recently';

  const date =
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'toDate' in timestamp &&
    typeof (timestamp as { toDate: () => Date }).toDate === 'function'
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date(timestamp as string | number | Date);

  if (Number.isNaN(date.getTime())) return 'Recently';

  return date.toLocaleDateString();
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getApplicationAction(applications: Application[]) {
  const latestApplication = applications[0];

  if (!latestApplication) {
    return {
      title: 'Apply for Training',
      description: 'Start your training application from a dedicated form screen and submit it for review.',
      action: 'Open application form',
      route: '/(main)/application' as const,
      icon: 'file-signature' as const,
      accent: C.warning,
      accentSoft: C.accentSoft,
    };
  }

  if (latestApplication.status === 'approved') {
    return {
      title: 'My Courses / Progress',
      description: 'Your application has been approved. Review your course path and continue your learning journey.',
      action: 'Open learning view',
      route: '/(student)/dashboard' as const,
      icon: 'graduation-cap' as const,
      accent: C.success,
      accentSoft: C.successSoft,
    };
  }

  const statusLabel =
    latestApplication.status.charAt(0).toUpperCase() + latestApplication.status.slice(1);

  return {
    title: `Application Status (${statusLabel})`,
    description: 'Track your submitted application, current review stage, and any feedback from GIAC.',
    action: 'Open application status',
    route: '/(main)/application-status' as const,
    icon: 'clock' as const,
    accent: latestApplication.status === 'rejected' ? C.danger : C.secondary,
    accentSoft: latestApplication.status === 'rejected' ? C.dangerSoft : C.primarySoft,
  };
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
  const [error, setError] = useState('');

  // Admin state
  const [pendingApps, setPendingApps] = useState<Application[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annDetail, setAnnDetail] = useState('');
  const [annUrgent, setAnnUrgent] = useState(false);
  const [annSaving, setAnnSaving] = useState(false);
  const [annSuccess, setAnnSuccess] = useState('');
  const [annError, setAnnError] = useState('');

  // Real-time listener: updates immediately when admin approves/rejects
  useEffect(() => {
    if (!user?.uid) { setApplications([]); return; }
    return subscribeUserApplications(user.uid, setApplications);
  }, [user?.uid]);

  // Real-time announcements
  useEffect(() => {
    return subscribeAnnouncements(setAnnouncements);
  }, []);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      if (!user?.uid) {
        if (active) {
          setProfile(null);
          setServices([]);
          setAnnouncements([]);
          setLoading(false);
        }
        return;
      }

      try {
        setError('');
        const profileData = await getUserProfile(user.uid);

        if (active) {
          setProfile(profileData);
        }
      } catch {
        if (active) {
          setError('We could not refresh your dashboard right now.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    const unsubscribeServices = user?.uid
      ? subscribeUserServices(user.uid, (serviceData) => {
          if (active) {
            setServices(serviceData ?? []);
          }
        })
      : null;

    return () => {
      active = false;
      unsubscribeServices?.();
    };
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

  const applicationAction = useMemo(
    () => getApplicationAction(applications),
    [applications]
  );
  const latestApplication = applications[0];

  const effectiveRole = useMemo(
    () => getEffectiveRole({ applications, profileRole: profile?.role, services }),
    [applications, profile?.role, services]
  );

  const isAdmin = effectiveRole === 'admin';
  const isStudent = effectiveRole === 'student';

  // Admin: subscribe to pending applications once role is confirmed
  useEffect(() => {
    if (profile?.role !== 'admin') return;
    return getAllPendingApplications(setPendingApps);
  }, [profile?.role]);

  const handleApprove = (application: Application) => {
    Alert.alert(
      'Approve application',
      `Approve ${application.fullName || 'this applicant'} for ${application.courseTitle || 'this course'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setBusyId(application.id);
            try { await approveApplication(application.id, application.userId, application.courseTitle); }
            catch { Alert.alert('Error', 'Could not approve the application. Please try again.'); }
            finally { setBusyId(null); }
          },
        },
      ]
    );
  };

  const handleReject = async (application: Application, feedback: string) => {
    setBusyId(application.id);
    try { await rejectApplication(application.id, feedback, application.userId, application.courseTitle); }
    catch { Alert.alert('Error', 'Could not reject the application. Please try again.'); }
    finally { setBusyId(null); }
  };

  const handlePublishAnnouncement = async () => {
    if (!annTitle.trim() || !annDetail.trim()) {
      setAnnError('Please fill in both the title and detail.');
      setAnnSuccess('');
      return;
    }
    setAnnSaving(true);
    setAnnError('');
    setAnnSuccess('');
    try {
      await createAnnouncement({ title: annTitle, detail: annDetail, urgent: annUrgent });
      setAnnTitle('');
      setAnnDetail('');
      setAnnUrgent(false);
      setAnnSuccess('Announcement published successfully.');
    } catch {
      setAnnError('Could not publish the announcement. Please try again.');
    } finally {
      setAnnSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: isCompact ? 120 : 132,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.screenTopBar}>
          <View style={{ flex: 1 }} />
          <NotificationBell />
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>{getGreeting()}</Text>
          <Text style={[styles.heroTitle, isCompact ? styles.heroTitleCompact : null]}>
            {displayName}
          </Text>
          <Text style={styles.heroDescription}>
            {isAdmin
              ? 'Manage applications, publish announcements, and oversee platform operations.'
              : isStudent
              ? 'Track your courses, submit assignments, and continue your learning journey.'
              : 'Apply for training, request mediation, and track your cases — all in one place.'}
          </Text>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{displayRole}</Text>
            </View>
            {!isAdmin && (
              <>
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillText}>{applications.length} application{applications.length !== 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillText}>{services.length} ADR request{services.length !== 1 ? 's' : ''}</Text>
                </View>
              </>
            )}
          </View>

          {!isAdmin && (
            <View style={styles.statRow}>
              <View style={[styles.statCard, isCompact ? styles.statCardCompact : null]}>
                <Text style={styles.statValue}>{applications.length}</Text>
                <Text style={styles.statLabel}>Applications</Text>
              </View>
              <View style={[styles.statCard, isCompact ? styles.statCardCompact : null]}>
                <Text style={styles.statValue}>{services.length}</Text>
                <Text style={styles.statLabel}>Mediation</Text>
              </View>
              <View style={[styles.statCard, isCompact ? styles.statCardCompact : null]}>
                <Text style={styles.statValue}>{announcements.length}</Text>
                <Text style={styles.statLabel}>Updates</Text>
              </View>
            </View>
          )}
        </View>

        {isAdmin && (
          <>
            <SectionHeader
              title="Operations Overview"
              subtitle="Admin controls admissions, announcements, and platform workflows from one workspace."
            />
            <View style={styles.actionGrid}>
              <ActionCard
                icon="inbox"
                title="Admissions Queue"
                description={`${pendingApps.length} pending application${pendingApps.length !== 1 ? 's' : ''} waiting for review and decision.`}
                action="Open operations workspace"
                accent={pendingApps.length > 0 ? C.warning : C.success}
                accentSoft={pendingApps.length > 0 ? C.warningSoft : C.successSoft}
                onPress={() => router.push('/(main)/operations')}
              />
              <ActionCard
                icon="bullhorn"
                title="Announcements Desk"
                description={`${announcements.length} published update${announcements.length !== 1 ? 's' : ''} available across the platform feed.`}
                action="Manage announcements"
                accent={C.secondary}
                accentSoft={C.primarySoft}
                onPress={() => router.push('/(main)/operations')}
              />
              <ActionCard
                icon="circle-user"
                title="Admin Account"
                description="Review account details, confirm platform access, and open your profile settings."
                action="Open profile"
                accent={C.primary}
                accentSoft={C.surfaceAlt}
                onPress={() => router.push('/(main)/profile')}
              />
            </View>
            <View style={styles.card}>
              <Text style={styles.placeholderText}>
                Approvals, rejections, and announcement publishing now live in the Operations tab so Home stays a clean executive overview.
              </Text>
            </View>
          </>
        )}

        {isStudent && (
          <>
            <SectionHeader
              title="My Learning"
              subtitle="Your application was approved. Continue your studies below."
            />
            <View style={styles.actionGrid}>
              <ActionCard
                icon="graduation-cap"
                title="My Courses"
                description="View your enrolled courses, track progress, and access learning materials."
                action="Open my courses"
                accent={C.success}
                accentSoft={C.successSoft}
                onPress={() => router.push('/(student)/dashboard')}
              />
              <ActionCard
                icon="clipboard-list"
                title="Tests & Exams"
                description="View upcoming examinations and review your past results."
                action="Open tests"
                accent={C.secondary}
                accentSoft={C.primarySoft}
                onPress={() => router.push('/(student)/tests' as any)}
              />
            </View>
          </>
        )}

        {!isAdmin && latestApplication ? (
          <>
            <SectionHeader
              title="Application Desk"
              subtitle="This reflects the latest admissions decision made by admin and what you should do next."
            />
            <View style={styles.applicationDeskCard}>
              <View style={styles.applicationDeskTopRow}>
                <View style={styles.applicationDeskCopy}>
                  <Text style={styles.applicationDeskTitle}>
                    {latestApplication.courseTitle || 'GIAC Training Application'}
                  </Text>
                  <Text style={styles.applicationDeskSubtitle}>
                    Submitted application status based on admin review
                  </Text>
                </View>
                <StatusChip tone={getApplicationStatusTone(latestApplication.status)} />
              </View>

              <View style={styles.applicationDeskMetaRow}>
                <View style={[styles.applicationDeskPill, styles.applicationDeskPillBrass]}>
                  <Text style={[styles.applicationDeskPillText, styles.applicationDeskPillTextBrass]}>
                    {latestApplication.courseProgram || 'Program pending'}
                  </Text>
                </View>
                <View style={styles.applicationDeskPill}>
                  <Text style={styles.applicationDeskPillText}>
                    {latestApplication.courseDuration || 'Duration pending'}
                  </Text>
                </View>
                <View style={[styles.applicationDeskPill, styles.applicationDeskPillOutline]}>
                  <Text style={styles.applicationDeskPillText}>
                    {applications.length} application{applications.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.applicationDeskNote}>
                <Text style={styles.applicationDeskNoteLabel}>Admin update</Text>
                <Text style={styles.applicationDeskNoteBody}>
                  {latestApplication.feedback?.trim()
                    ? latestApplication.feedback.trim()
                    : latestApplication.status === 'approved'
                      ? 'Your application has been accepted by admin. Continue into your student workspace and follow the onboarding steps.'
                      : latestApplication.status === 'rejected'
                        ? 'Your application was reviewed but not approved. Review the details and submit a stronger application when ready.'
                        : 'Your application has been submitted and is currently waiting for admin review.'}
                </Text>
              </View>

              <View style={styles.applicationDeskButtonRow}>
                {latestApplication.status === 'approved' ? (
                  <>
                    <ActionButton
                      kind="primary"
                      label="Continue"
                      onPress={() => router.push('/(student)/dashboard')}
                    />
                    <ActionButton
                      kind="secondary"
                      label="View Details"
                      onPress={() => router.push('/(main)/application-status')}
                    />
                  </>
                ) : null}

                {latestApplication.status === 'rejected' ? (
                  <>
                    <ActionButton
                      kind="primary"
                      label="Submit Application"
                      onPress={() => router.push('/(main)/application')}
                    />
                    <ActionButton
                      kind="secondary"
                      label="View Details"
                      onPress={() => router.push('/(main)/application-status')}
                    />
                  </>
                ) : null}

                {latestApplication.status === 'pending' ? (
                  <>
                    <ActionButton
                      kind="secondary"
                      label="View Details"
                      onPress={() => router.push('/(main)/application-status')}
                    />
                    <ActionButton
                      kind="ghost"
                      label="Open mediation form"
                      onPress={() => router.push('/(main)/request-mediation')}
                    />
                  </>
                ) : null}
              </View>
            </View>
          </>
        ) : null}

        {!isAdmin && (
          <>
            <SectionHeader
              title="Quick Actions"
              subtitle="Each action opens a dedicated screen."
            />
            <View style={styles.actionGrid}>
              <ActionCard
                icon="book-open"
                title="Explore Courses"
                description="Browse the course catalogue, open course details, and apply from there when you are ready."
                action="Open Explore"
                accent={C.secondary}
                accentSoft={C.primarySoft}
                onPress={() => router.push('/(main)/explore')}
              />
              {!isStudent && (
                <ActionCard
                  icon={applicationAction.icon}
                  title={applicationAction.title}
                  description={applicationAction.description}
                  action={applicationAction.action}
                  accent={applicationAction.accent}
                  accentSoft={applicationAction.accentSoft}
                  onPress={() => router.push(applicationAction.route)}
                />
              )}
              <ActionCard
                icon="scale-balanced"
                title="Request Mediation"
                description="Submit a new mediation or arbitration request to GIAC."
                action="Open mediation form"
                accent={C.primary}
                accentSoft={C.successSoft}
                onPress={() => router.push('/(main)/request-mediation')}
              />
            </View>
          </>
        )}

        <SectionHeader
          title="Announcements"
          subtitle="Latest updates for your account and GIAC activities"
        />

        {loading ? (
          <View style={styles.card}>
            <Text style={styles.placeholderText}>Loading your dashboard...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Unable to refresh dashboard</Text>
            <Text style={styles.errorBody}>{error}</Text>
          </View>
        ) : announcements.length > 0 ? (
          <View style={styles.card}>
            {announcements.map((announcement, index) => (
              <React.Fragment key={announcement.id}>
                <View style={styles.announcementRow}>
                  <View
                    style={[
                      styles.announcementDot,
                      announcement.urgent ? styles.announcementDotUrgent : null,
                    ]}
                  />
                  <View style={styles.announcementBody}>
                    <View style={styles.announcementTopRow}>
                      <Text style={styles.announcementTitle}>{announcement.title}</Text>
                      <Text style={styles.announcementTime}>
                        {formatRelativeTime(announcement.createdAt)}
                      </Text>
                    </View>
                    <Text style={styles.announcementDetail}>{announcement.detail}</Text>
                  </View>
                </View>
                {index < announcements.length - 1 ? <View style={styles.divider} /> : null}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.placeholderText}>No announcements available yet.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 20,
    paddingBottom: 132,
    gap: 20,
  },
  screenTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  hero: {
    backgroundColor: C.surface,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  heroEyebrow: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  heroTitle: {
    fontSize: 36,
    lineHeight: 40,
    fontFamily: Fonts.displayBold,
    color: C.textPrimary,
  },
  heroTitleCompact: {
    fontSize: 30,
    lineHeight: 34,
  },
  heroDescription: {
    fontSize: 16,
    lineHeight: 25,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  heroPill: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroPillText: {
    fontSize: 12,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  statCard: {
    flex: 1,
    minWidth: 92,
    backgroundColor: C.surfaceAlt,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  statCardCompact: {
    minWidth: '31%',
  },
  statValue: {
    fontSize: 26,
    fontFamily: Fonts.displayBold,
    color: C.primary,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansSemiBold,
    color: C.textMuted,
    textAlign: 'center',
  },
  sectionHeader: {
    gap: 3,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: Fonts.displaySemiBold,
    color: C.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  actionGrid: {
    gap: 12,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusChipText: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
  },
  applicationDeskCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 14,
  },
  applicationDeskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  applicationDeskCopy: {
    flex: 1,
    gap: 4,
  },
  applicationDeskTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  applicationDeskSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  applicationDeskMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  applicationDeskPill: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  applicationDeskPillBrass: {
    backgroundColor: C.warningSoft,
  },
  applicationDeskPillOutline: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  applicationDeskPillText: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },
  applicationDeskPillTextBrass: {
    color: C.warning,
  },
  applicationDeskNote: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  applicationDeskNoteLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },
  applicationDeskNoteBody: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  applicationDeskButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: C.primary,
  },
  actionButtonSecondary: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionButtonBrass: {
    backgroundColor: C.accent,
  },
  actionButtonGhost: {
    backgroundColor: 'transparent',
  },
  actionButtonDanger: {
    backgroundColor: C.danger,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
  },
  actionButtonTextPrimary: {
    color: '#FFFFFF',
  },
  actionButtonTextSecondary: {
    color: C.secondary,
  },
  actionButtonTextBrass: {
    color: C.primary,
  },
  actionButtonTextGhost: {
    color: C.secondary,
  },
  actionButtonTextDanger: {
    color: '#FFFFFF',
  },
  actionCard: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 5,
    gap: 8,
  },
  actionBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 17,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  actionDescription: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  actionLink: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 14,
  },
  errorCard: {
    backgroundColor: '#FFF7F7',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F0CACA',
    gap: 6,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: Fonts.sansBold,
    color: C.danger,
  },
  errorBody: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  announcementRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  announcementDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
    backgroundColor: C.border,
  },
  announcementDotUrgent: {
    backgroundColor: C.danger,
  },
  announcementBody: {
    flex: 1,
    gap: 4,
  },
  announcementTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  announcementTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  announcementTime: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  announcementDetail: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  placeholderText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: C.borderLight,
  },
  pressed: {
    opacity: 0.92,
  },

  // Admin: announcement form card
  announcementForm: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 14,
  },
  annBanner: {
    borderRadius: 12,
    padding: 12,
  },
  annBannerText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.sans,
  },
  annFieldGroup: { gap: 8 },
  annLabel: {
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    color: C.textPrimary,
  },
  annHint: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  annInput: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: C.textPrimary,
  },
  annTextArea: { minHeight: 110, textAlignVertical: 'top' },
  annToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  annPublishBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  annPublishBtnOff: { backgroundColor: '#CBD3E0' },
  annPublishBtnText: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
    color: '#FFFFFF',
  },
});
