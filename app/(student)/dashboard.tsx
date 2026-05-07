import { Fonts } from '@/constants/theme';
import { auth } from '@/services/firebase';
import {
  Application,
  Course,
  LearningProgress,
  getApprovedApplications,
  getLearningProgress,
  resolveCourseFromReference,
} from '@/services/firestore';
import NotificationBell from '@/components/notification-bell';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  bg: '#F8FAFD',
  surface: '#FFFFFF',
  primary: '#1F2A44',
  secondary: '#2E4A8A',
  secondarySoft: '#E9EEF8',
  accent: '#C8A96B',
  accentSoft: '#FAF5E9',
  success: '#2D6A4F',
  successSoft: '#E8F2EE',
  textPrimary: '#1F2A44',
  textSecondary: '#5A6478',
  textMuted: '#7A7F8A',
  border: '#E3E9F2',
  progressBg: '#E3E9F2',
};

interface EnrolledCourse {
  application: Application;
  course: Course | null;
  progress: LearningProgress | null;
}

function formatDate(timestamp: unknown): string {
  if (!timestamp) return '';
  const date =
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'toDate' in timestamp &&
    typeof (timestamp as any).toDate === 'function'
      ? (timestamp as any).toDate()
      : new Date(timestamp as any);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const QUICK_ACTIONS = [
  { icon: 'book-open' as const, label: 'Materials', description: 'Modules & resources', onPress: () => router.push('/(student)/materials') },
  { icon: 'pen-to-square' as const, label: 'Assignments', description: 'Tasks & submissions', onPress: () => router.push('/(student)/assignments' as any) },
  { icon: 'file-pen' as const, label: 'Tests', description: 'Exams & results', onPress: () => router.push('/(student)/tests' as any) },
  { icon: 'certificate' as const, label: 'Certificates', description: 'Your achievements', onPress: () => router.push('/(student)/certificates' as any) },
];

export default function StudentDashboardScreen() {
  const user = auth.currentUser;
  const displayName = user?.displayName?.split(' ')[0] ?? 'Student';

  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user?.uid) {
        if (active) setLoading(false);
        return;
      }

      try {
        const approved = await getApprovedApplications(user.uid);

        const courseData = await Promise.all(
          approved.map(async (app) => {
            const course = resolveCourseFromReference(app.courseId);
            const progress = await getLearningProgress(user.uid, app.courseId);
            return { application: app, course, progress };
          })
        );

        if (active) {
          setEnrolledCourses(courseData);
          setError('');
        }
      } catch {
        if (active) setError('Could not load your dashboard. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [user?.uid]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('/(main)/home')}
            style={styles.backBtn}
            hitSlop={8}
          >
            <FontAwesome6 name="arrow-left" size={16} color={C.primary} />
          </TouchableOpacity>
          <View style={[styles.rolePill, { backgroundColor: C.secondarySoft }]}>
            <FontAwesome6 name="graduation-cap" size={11} color={C.secondary} />
            <Text style={styles.rolePillText}>Active Student</Text>
          </View>
          <View style={{ flex: 1 }} />
          <NotificationBell color={C.primary} />
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Student Portal</Text>
          <Text style={styles.title}>Welcome back,{'\n'}{displayName}!</Text>
          <Text style={styles.subtitle}>
            Track your progress, access materials, and manage your learning journey.
          </Text>
        </View>

        {/* Enrolled Courses */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Enrolled Courses</Text>

          {loading ? (
            <View style={styles.card}>
              <ActivityIndicator color={C.secondary} />
            </View>
          ) : error ? (
            <View style={styles.card}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : enrolledCourses.length === 0 ? (
            <View style={styles.card}>
              <FontAwesome6 name="book" size={28} color={C.textMuted} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>No active enrolments</Text>
              <Text style={styles.emptyText}>
                Your application has not been approved yet, or no course application exists. Once
                approved by the admin, your course will appear here.
              </Text>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => router.push('/(main)/application')}
              >
                <Text style={styles.applyBtnText}>Apply for a Program</Text>
              </TouchableOpacity>
            </View>
          ) : (
            enrolledCourses.map(({ application, course, progress }) => {
              const pct = progress?.progressPercentage ?? 0;
              const completed = progress?.completedModules?.length ?? 0;
              const total = progress?.totalModules ?? course?.modules ?? 0;

              return (
                <View key={application.id} style={styles.courseCard}>
                  <View style={styles.courseCardTop}>
                    <View style={[styles.programBadge, { backgroundColor: C.secondarySoft }]}>
                      <Text style={styles.programBadgeText}>
                        {course?.program ?? application.courseProgram ?? 'ADR Program'}
                      </Text>
                    </View>
                    <Text style={styles.courseLevel}>{course?.level ?? ''}</Text>
                  </View>

                  <Text style={styles.courseTitle}>
                    {course?.title ?? application.courseTitle ?? 'Course'}
                  </Text>

                  <View style={styles.courseMeta}>
                    <FontAwesome6 name="clock" size={12} color={C.textMuted} />
                    <Text style={styles.courseMetaText}>
                      {course?.duration ?? application.courseDuration ?? '—'}
                    </Text>
                    <Text style={styles.dot}>·</Text>
                    <FontAwesome6 name="video" size={12} color={C.textMuted} />
                    <Text style={styles.courseMetaText}>{course?.platform ?? 'Virtual'}</Text>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressLabelRow}>
                      <Text style={styles.progressLabel}>
                        {completed} of {total} modules
                      </Text>
                      <Text style={styles.progressPct}>{pct}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` }]} />
                    </View>
                  </View>

                  <Text style={styles.enrolledDate}>
                    Enrolled {formatDate(application.decidedAt ?? application.submittedAt)}
                  </Text>

                  <TouchableOpacity
                    style={styles.materialsBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/(student)/materials',
                        params: { courseId: application.courseId },
                      })
                    }
                  >
                    <FontAwesome6 name="book-open" size={14} color={C.surface} />
                    <Text style={styles.materialsBtnText}>View Materials</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* Class Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Class Schedule</Text>
          <View style={styles.scheduleCard}>
            <View style={styles.scheduleRow}>
              <View style={[styles.scheduleIcon, { backgroundColor: C.accentSoft }]}>
                <FontAwesome6 name="calendar-days" size={16} color={C.accent} />
              </View>
              <View style={styles.scheduleText}>
                <Text style={styles.scheduleDay}>Mon · Wed · Fri</Text>
                <Text style={styles.scheduleTime}>5:30 PM – 8:30 PM</Text>
              </View>
            </View>
            <View style={styles.scheduleDivider} />
            <View style={styles.scheduleRow}>
              <View style={[styles.scheduleIcon, { backgroundColor: C.secondarySoft }]}>
                <FontAwesome6 name="video" size={14} color={C.secondary} />
              </View>
              <View style={styles.scheduleText}>
                <Text style={styles.scheduleDay}>Virtual Sessions</Text>
                <Text style={styles.scheduleTime}>Google Meet / Zoom</Text>
              </View>
            </View>
            <View style={styles.scheduleDivider} />
            <View style={styles.scheduleRow}>
              <View style={[styles.scheduleIcon, { backgroundColor: C.successSoft }]}>
                <FontAwesome6 name="location-dot" size={14} color={C.success} />
              </View>
              <View style={styles.scheduleText}>
                <Text style={styles.scheduleDay}>Practical Sessions</Text>
                <Text style={styles.scheduleTime}>In-person · Kasoa</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Learning Resources</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.label}
                onPress={action.onPress}
                style={({ pressed }) => [styles.quickTile, pressed && styles.pressed]}
              >
                <View style={[styles.quickIcon, { backgroundColor: C.secondarySoft }]}>
                  <FontAwesome6 name={action.icon} size={18} color={C.secondary} />
                </View>
                <Text style={styles.quickLabel}>{action.label}</Text>
                <Text style={styles.quickDesc}>{action.description}</Text>
                <View style={styles.quickArrow}>
                  <FontAwesome6 name="arrow-right" size={10} color={C.textMuted} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 24, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rolePillText: {
    fontSize: 12,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },

  hero: { gap: 6 },
  eyebrow: {
    fontSize: 12,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
    fontFamily: Fonts.displayBold,
    color: C.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },

  section: { gap: 12 },
  sectionHeader: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textMuted,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: '#8F3D3D',
    textAlign: 'center',
  },
  applyBtn: {
    marginTop: 8,
    backgroundColor: C.secondary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  applyBtnText: {
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    color: C.surface,
  },

  courseCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  courseCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  programBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  programBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    color: C.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  courseLevel: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  courseTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  courseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  courseMetaText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  dot: { fontSize: 13, color: C.textMuted },

  progressSection: { gap: 6 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  progressPct: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: C.progressBg,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.secondary,
    borderRadius: 999,
  },

  enrolledDate: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },

  materialsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.secondary,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  materialsBtnText: {
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    color: C.surface,
  },

  scheduleCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 0,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  scheduleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleText: { flex: 1, gap: 2 },
  scheduleDay: {
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    color: C.textPrimary,
  },
  scheduleTime: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  scheduleDivider: { height: 1, backgroundColor: C.border },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickTile: {
    width: '47%',
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  pressed: { opacity: 0.75 },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 15,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  quickDesc: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  quickArrow: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
});
