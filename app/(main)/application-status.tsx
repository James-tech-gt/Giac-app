import { Fonts } from '@/constants/theme';
import { auth } from '@/services/firebase';
import {
  Application,
  Course,
  getCourses,
  subscribeUserApplications,
  resolveCourseFromReference,
  withdrawApplication,
} from '@/services/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  success: '#3F5A3A',
  successSoft: '#E2EAD9',
  warning: '#8C6A1F',
  warningSoft: '#F4ECD2',
  danger: '#7A2E2E',
  dangerSoft: '#F9EFEC',
  textPrimary: '#14213A',
  textSecondary: '#4A5468',
  textMuted: '#6B7689',
  border: '#E3E9F2',
};

function formatDate(timestamp: unknown) {
  if (!timestamp) return 'Unknown date';

  const date =
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'toDate' in timestamp &&
    typeof (timestamp as { toDate: () => Date }).toDate === 'function'
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date(timestamp as string | number | Date);

  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString();
}

function getStatusTone(status: Application['status']) {
  if (status === 'approved') {
    return { label: 'Approved', color: C.success, bg: C.successSoft, border: '#C9D8BE' };
  }
  if (status === 'completed') {
    return { label: 'Completed', color: C.success, bg: C.successSoft, border: '#C9D8BE' };
  }
  if (status === 'rejected') {
    return { label: 'Rejected', color: C.danger, bg: C.dangerSoft, border: '#E7C8C0' };
  }
  if (status === 'withdrawn') {
    return { label: 'Withdrawn', color: C.textMuted, bg: C.surfaceAlt, border: C.border };
  }
  return { label: 'Pending review', color: C.warning, bg: C.warningSoft, border: '#E7D7A8' };
}

function StatusChip({
  count,
  status,
}: {
  count?: number;
  status: Application['status'] | 'submitted';
}) {
  const tone =
    status === 'submitted'
      ? { label: 'Submitted', color: C.secondary, bg: C.primarySoft, border: '#D4DCEB' }
      : getStatusTone(status as Application['status']);

  return (
    <View style={[styles.statusChip, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <View style={[styles.statusChipDot, { backgroundColor: tone.color }]} />
      <Text style={[styles.statusChipText, { color: tone.color }]}>
        {tone.label}
        {typeof count === 'number' ? ` ${count}` : ''}
      </Text>
    </View>
  );
}

function MetaPill({
  label,
  brass,
  outline,
}: {
  brass?: boolean;
  label: string;
  outline?: boolean;
}) {
  return (
    <View
      style={[
        styles.metaPill,
        brass ? styles.metaPillBrass : null,
        outline ? styles.metaPillOutline : null,
      ]}
    >
      <Text
        style={[
          styles.metaPillText,
          brass ? styles.metaPillTextBrass : null,
          outline ? styles.metaPillTextOutline : null,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function ApplicationCTA({
  kind,
  label,
  onPress,
}: {
  kind: 'primary' | 'secondary' | 'danger' | 'ghost';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ctaButton,
        kind === 'primary' ? styles.ctaPrimary : null,
        kind === 'secondary' ? styles.ctaSecondary : null,
        kind === 'danger' ? styles.ctaDanger : null,
        kind === 'ghost' ? styles.ctaGhost : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text
        style={[
          styles.ctaButtonText,
          kind === 'primary' ? styles.ctaPrimaryText : null,
          kind === 'secondary' ? styles.ctaSecondaryText : null,
          kind === 'danger' ? styles.ctaDangerText : null,
          kind === 'ghost' ? styles.ctaGhostText : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function StatusTimeline({ status }: { status: Application['status'] }) {
  const isCompleted = status === 'completed';
  const finalLabel =
    status === 'approved' || isCompleted ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Decision';

  const steps = [
    { label: 'Submitted', state: 'done' as const },
    {
      label: 'Under review',
      state: status === 'pending' ? ('active' as const) : ('done' as const),
    },
    {
      label: finalLabel,
      state:
        status === 'approved' || status === 'rejected' || isCompleted
          ? ('done' as const)
          : ('idle' as const),
    },
    {
      label: isCompleted ? 'Completed' : 'Onboarding',
      state:
        isCompleted
          ? ('done' as const)
          : status === 'approved'
          ? ('active' as const)
          : ('idle' as const),
    },
  ];

  return (
    <View style={styles.timelineCard}>
      {steps.map((step, index) => (
        <React.Fragment key={step.label}>
          <View style={styles.timelineItem}>
            <View
              style={[
                styles.timelineDot,
                step.state === 'done' ? styles.timelineDotDone : null,
                step.state === 'active' ? styles.timelineDotActive : null,
              ]}
            >
              {step.state === 'done' ? (
                <FontAwesome6 name="check" size={10} color="#FFFFFF" />
              ) : (
                <View
                  style={[
                    styles.timelineDotInner,
                    step.state === 'active' ? styles.timelineDotInnerActive : null,
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                styles.timelineLabel,
                step.state === 'active' ? styles.timelineLabelActive : null,
                step.state === 'done' ? styles.timelineLabelDone : null,
              ]}
            >
              {step.label}
            </Text>
          </View>
          {index < steps.length - 1 ? (
            <View
              style={[
                styles.timelineLine,
                steps[index + 1].state !== 'idle' ? styles.timelineLineDone : null,
              ]}
            />
          ) : null}
        </React.Fragment>
      ))}
    </View>
  );
}

function resolveApplicationCourse(
  application: Application,
  courseMap: Map<string, Course>
) {
  const directCourse = courseMap.get(application.courseId);
  if (directCourse) {
    return directCourse;
  }

  const resolvedFromAlias = resolveCourseFromReference(application.courseId);
  if (resolvedFromAlias) {
    return resolvedFromAlias;
  }

  return null;
}

export default function ApplicationStatusScreen() {
  const [user, setUser] = useState(auth.currentUser);
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const horizontalPadding = width < 380 ? 16 : 20;
  const [applications, setApplications] = useState<Application[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [confirmWithdrawId, setConfirmWithdrawId] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState('');

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    let active = true;

    const loadStatus = async () => {
      if (!user?.uid) {
        if (active) {
          setApplications([]);
          setLoading(false);
        }
        return;
      }

      try {
        setError('');
        const courseData = await getCourses();

        if (active) {
          setCourses(courseData ?? []);
        }
      } catch {
        if (active) {
          setError('We could not load your application records right now.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadStatus();

    const unsubscribeApplications = user?.uid
      ? subscribeUserApplications(user.uid, (applicationData) => {
          if (active) {
            setApplications(applicationData ?? []);
          }
        })
      : null;

    return () => {
      active = false;
      unsubscribeApplications?.();
    };
  }, [user?.uid]);

  const handleWithdrawConfirm = async (applicationId: string) => {
    setWithdrawingId(applicationId);
    setWithdrawError('');
    try {
      await withdrawApplication(applicationId);
      setConfirmWithdrawId(null);
    } catch (e) {
      console.error('Withdraw failed:', e);
      setWithdrawError('Could not withdraw. Please try again.');
    } finally {
      setWithdrawingId(null);
    }
  };

  const courseMap = useMemo(
    () => new Map(courses.map((course) => [course.id, course])),
    [courses]
  );
  const activeApplications = applications.filter((a) => a.status !== 'withdrawn');
  const pendingCount = activeApplications.filter((application) => application.status === 'pending').length;
  const approvedCount = activeApplications.filter((application) => application.status === 'approved').length;
  const rejectedCount = activeApplications.filter((application) => application.status === 'rejected').length;
  const completedCount = activeApplications.filter((application) => application.status === 'completed').length;

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
        <View style={styles.hero}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}>
            <FontAwesome6 name="arrow-left" size={14} color={C.secondary} />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.heroEyebrow}>Application</Text>
          <Text style={[styles.heroTitle, isCompact ? styles.heroTitleCompact : null]}>
            Application Status
          </Text>
          <Text style={styles.heroDescription}>
            Track submitted applications, review status, and feedback without leaving the main app navigation.
          </Text>
          <View style={styles.statusChipRail}>
            <StatusChip status="approved" count={approvedCount} />
            <StatusChip status="completed" count={completedCount} />
            <StatusChip status="pending" count={pendingCount} />
            <StatusChip status="rejected" count={rejectedCount} />
          </View>
          <View style={styles.metaPillRail}>
            <MetaPill label={`${activeApplications.length} total applications`} />
            <MetaPill label={`${completedCount} completed`} brass />
            <MetaPill label={`${approvedCount} active`} outline />
          </View>
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{approvedCount}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{completedCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>

        {!user?.uid ? (
          <View style={styles.card}>
            <Text style={styles.placeholder}>
              Sign in to view application records linked to your account.
            </Text>
          </View>
        ) : loading ? (
          <View style={styles.card}>
            <Text style={styles.placeholder}>Loading applications...</Text>
          </View>
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.errorTitle}>Unable to load application status</Text>
            <Text style={styles.placeholder}>{error}</Text>
          </View>
        ) : activeApplications.length > 0 ? (
          activeApplications.map((application) => {
            const course = resolveApplicationCourse(application, courseMap);
            const tone = getStatusTone(application.status);
            const courseTitle =
              course?.title ||
              application.courseTitle ||
              'GIAC Training Application';
            const courseProgram =
              course?.program ||
              application.courseProgram ||
              'Program pending confirmation';
            const courseDuration =
              course?.duration ||
              application.courseDuration ||
              '';

            return (
              <View key={application.id} style={styles.card}>
                <View style={styles.topRow}>
                  <View style={styles.topText}>
                    <Text style={styles.cardTitle}>{courseTitle}</Text>
                    <Text style={styles.cardSubtitle}>
                      Submitted {formatDate(application.submittedAt)}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: tone.color }]} />
                    <Text style={[styles.statusPillText, { color: tone.color }]}>
                      {tone.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.metaPillRail}>
                  <MetaPill label={courseProgram} brass />
                  <MetaPill label={courseDuration || 'Duration pending'} />
                  <MetaPill label={`${applications.length} application${applications.length !== 1 ? 's' : ''}`} outline />
                </View>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Program</Text>
                    <Text style={styles.summaryValue}>{courseProgram}</Text>
                  </View>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Duration</Text>
                    <Text style={styles.summaryValue}>
                      {courseDuration || 'Not specified'}
                    </Text>
                  </View>
                </View>
                <View style={styles.feedbackCard}>
                  <Text style={styles.feedbackTitle}>Status Note</Text>
                  <Text style={styles.detail}>
                    {application.feedback?.trim()
                      ? application.feedback.trim()
                      : application.status === 'pending'
                        ? 'Your application has been received and is currently under review.'
                        : application.status === 'approved'
                          ? 'Your application was approved. Watch for your next onboarding or course access update.'
                          : application.status === 'completed'
                            ? 'Congratulations! You have successfully completed this course. Your certificate is ready.'
                            : 'Your application was reviewed. Please check back or contact GIAC for next steps.'}
                  </Text>
                </View>
                <StatusTimeline status={application.status} />
                <View style={styles.ctaRow}>
                  {application.status === 'completed' ? (
                    <>
                      <ApplicationCTA
                        kind="primary"
                        label="View Certificate"
                        onPress={() => router.push('/(student)/certificates' as any)}
                      />
                      <ApplicationCTA
                        kind="secondary"
                        label="My Dashboard"
                        onPress={() => router.push('/(student)/dashboard')}
                      />
                    </>
                  ) : null}
                  {application.status === 'approved' ? (
                    <>
                      <ApplicationCTA
                        kind="primary"
                        label="Continue Learning"
                        onPress={() => router.push('/(student)/dashboard')}
                      />
                      <ApplicationCTA
                        kind="secondary"
                        label="View Courses"
                        onPress={() => router.push('/(main)/explore')}
                      />
                    </>
                  ) : null}
                  {application.status === 'rejected' ? (
                    <>
                      <ApplicationCTA
                        kind="primary"
                        label="Submit Application"
                        onPress={() => router.push('/(main)/application')}
                      />
                      <ApplicationCTA
                        kind="secondary"
                        label="View Courses"
                        onPress={() => router.push('/(main)/explore')}
                      />
                    </>
                  ) : null}
                  {application.status === 'pending' ? (
                    confirmWithdrawId === application.id ? (
                      <View style={styles.confirmBox}>
                        <Text style={styles.confirmText}>
                          Are you sure? This cannot be undone.
                        </Text>
                        {withdrawError ? (
                          <Text style={styles.confirmError}>{withdrawError}</Text>
                        ) : null}
                        <View style={styles.confirmRow}>
                          <ApplicationCTA
                            kind="secondary"
                            label="Cancel"
                            onPress={() => { setConfirmWithdrawId(null); setWithdrawError(''); }}
                          />
                          <ApplicationCTA
                            kind="danger"
                            label={withdrawingId === application.id ? 'Withdrawing…' : 'Confirm withdraw'}
                            onPress={() => withdrawingId ? undefined : handleWithdrawConfirm(application.id)}
                          />
                        </View>
                      </View>
                    ) : (
                      <>
                        <ApplicationCTA
                          kind="ghost"
                          label="Open mediation form"
                          onPress={() => router.push('/(main)/request-mediation')}
                        />
                        <ApplicationCTA
                          kind="danger"
                          label="Withdraw application"
                          onPress={() => { setConfirmWithdrawId(application.id); setWithdrawError(''); }}
                        />
                      </>
                    )
                  ) : null}
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.card}>
            <Text style={styles.placeholder}>
              No applications found for this account yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: {
    paddingTop: 20,
    paddingBottom: 132,
    gap: 20,
  },
  hero: {
    backgroundColor: C.surface,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 12,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },
  heroEyebrow: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  heroTitle: {
    fontSize: 34,
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
  statusChipRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
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
  metaPillRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaPill: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  metaPillBrass: {
    backgroundColor: C.warningSoft,
  },
  metaPillOutline: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  metaPillText: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },
  metaPillTextBrass: {
    color: C.warning,
  },
  metaPillTextOutline: {
    color: C.secondary,
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
    marginTop: 4,
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
  card: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  topText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: Fonts.sansSemiBold,
    flexShrink: 1,
  },
  detail: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: C.surfaceAlt,
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryValue: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
    flexWrap: 'wrap',
  },
  feedbackCard: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  feedbackTitle: {
    fontSize: 12,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  timelineCard: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineItem: {
    alignItems: 'center',
    width: 64,
    gap: 8,
  },
  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    borderColor: C.secondary,
    backgroundColor: C.secondary,
  },
  timelineDotActive: {
    borderColor: C.warning,
    backgroundColor: C.warningSoft,
  },
  timelineDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.border,
  },
  timelineDotInnerActive: {
    backgroundColor: C.warning,
  },
  timelineLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: Fonts.sansSemiBold,
    color: C.textMuted,
    textAlign: 'center',
  },
  timelineLabelActive: {
    color: C.warning,
  },
  timelineLabelDone: {
    color: C.secondary,
  },
  timelineLine: {
    flex: 1,
    height: 2,
    backgroundColor: C.border,
    marginTop: 12,
  },
  timelineLineDone: {
    backgroundColor: C.secondary,
  },
  placeholder: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  errorTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.sansBold,
    color: C.danger,
  },
  dangerButton: {
    backgroundColor: '#7A2E2E',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  dangerButtonText: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
    color: '#FFFFFF',
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ctaButton: {
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPrimary: {
    backgroundColor: C.primary,
  },
  ctaSecondary: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  ctaDanger: {
    backgroundColor: C.danger,
  },
  ctaGhost: {
    backgroundColor: 'transparent',
  },
  ctaButtonText: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
  },
  ctaPrimaryText: {
    color: '#FFFFFF',
  },
  ctaSecondaryText: {
    color: C.secondary,
  },
  ctaDangerText: {
    color: '#FFFFFF',
  },
  ctaGhostText: {
    color: C.secondary,
  },
  pressed: {
    opacity: 0.92,
  },
  confirmBox: {
    backgroundColor: C.dangerSoft,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E7C8C0',
  },
  confirmText: {
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    color: C.danger,
  },
  confirmError: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: C.danger,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
